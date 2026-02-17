import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptOpenRouterKey } from "@/lib/security/byok-crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const DEFAULT_PREMIUM_MODELS = [
	"openai/gpt-4o-mini:paid",
	"mistralai/mistral-7b-instruct:paid",
];

const DEFAULT_FALLBACK_MODELS = [
	"meta-llama/llama-3.3-70b-instruct:free",
	"qwen/qwen-3-235b-a22b:free",
	"mistralai/mistral-small-3.1-24b:free",
	"google/gemma-3-4b-instruct:free",
];

type OpenRouterRole = "system" | "user" | "assistant" | "tool";

type OpenRouterModelErrorCode =
	| "context_length_exceeded"
	| "insufficient_quota"
	| "rate_limit_exceeded"
	| "invalid_model"
	| "invalid_api_key";

type OpenRouterPublicErrorCode =
	| "context_length_exceeded"
	| "insufficient_quota"
	| "rate_limit_exceeded"
	| "platform_budget_exhausted"
	| "byok_or_upgrade_required"
	| "ALL_MODELS_FAILED";

type KeySource = "platform" | "byok";

type UsageActionType = "QUIZ" | "HINT" | "CHAT";

export type OpenRouterMessage = {
	role: OpenRouterRole;
	content: string;
};

type OpenRouterRoutingSuccess = {
	ok: true;
	response: Response;
	model: string;
	keySource: KeySource;
};

type OpenRouterRoutingFailure = {
	ok: false;
	status: number;
	code: OpenRouterPublicErrorCode;
	error: string;
	details?: unknown;
};

export type OpenRouterRoutingResult =
	| OpenRouterRoutingSuccess
	| OpenRouterRoutingFailure;

type OpenRouterRoutingOptions = {
	supabase: SupabaseClient;
	userId: string;
	messages: OpenRouterMessage[];
	temperature?: number;
	maxTokens?: number;
	stream?: boolean;
	title?: string;
	actionType?: UsageActionType;
};

type PlatformKeyResolution =
	| { key: string; misconfigured: false }
	| { key: null; misconfigured: true };

type KeyCandidate = {
	source: KeySource;
	apiKey: string;
};

type UserByokState = {
	hasByokRow: boolean;
	apiKey: string | null;
	last4: string | null;
	decryptionError: boolean;
};

type PlatformBudgetState = {
	hardBlocked: boolean;
	softLimitReached: boolean;
	limit: number | null;
	currentCount: number;
	userHardBlocked: boolean;
	userCurrentCount: number;
};

function toRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object") return null;
	return value as Record<string, unknown>;
}

function readStringValue(record: Record<string, unknown>, key: string): string {
	const value = record[key];
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return "";
}

function parseModelListFromEnv(
	envName: string,
	fallback: string[],
): string[] {
	const raw = process.env[envName];
	if (!raw) return [...fallback];

	const parsed = raw
		.split(",")
		.map((model) => model.trim())
		.filter(Boolean);

	return parsed.length > 0 ? parsed : [...fallback];
}

function getCandidateModels(): string[] {
	const premium = parseModelListFromEnv(
		"OPENROUTER_PREMIUM_MODELS",
		DEFAULT_PREMIUM_MODELS,
	);
	const fallback = parseModelListFromEnv(
		"OPENROUTER_FALLBACK_MODELS",
		DEFAULT_FALLBACK_MODELS,
	);
	return [...new Set([...premium, ...fallback])];
}

function resolvePlatformKey(): PlatformKeyResolution {
	const generic = process.env.OPENROUTER_API_KEY;
	const dev = process.env.OPENROUTER_DEV_API_KEY;
	const prod = process.env.OPENROUTER_PROD_API_KEY;
	const nodeEnv = process.env.NODE_ENV || "development";

	if (nodeEnv === "production") {
		const key = prod || generic || null;
		if (!key || (dev && key === dev)) {
			return { key: null, misconfigured: true };
		}
		return { key, misconfigured: false };
	}

	const key = dev || prod || generic || null;
	if (!key) return { key: null, misconfigured: true };
	return { key, misconfigured: false };
}

function classifyOpenRouterError(errorData: unknown): OpenRouterModelErrorCode | null {
	const root = toRecord(errorData);
	const nestedError = root ? toRecord(root.error) : null;
	const candidate = nestedError || root;
	if (!candidate) return null;

	const message = (
		readStringValue(candidate, "message") ||
		readStringValue(candidate, "code")
	).toLowerCase();
	const code = readStringValue(candidate, "code").toLowerCase();
	const type = readStringValue(candidate, "type").toLowerCase();
	const status = readStringValue(candidate, "status");

	if (
		message.includes("context") && message.includes("length") ||
		code === "context_length_exceeded" ||
		type === "context_length_exceeded"
	) {
		return "context_length_exceeded";
	}

	if (
		message.includes("quota") ||
		message.includes("insufficient") ||
		code === "insufficient_quota" ||
		type === "insufficient_quota"
	) {
		return "insufficient_quota";
	}

	if (
		message.includes("rate") ||
		message.includes("429") ||
		code === "429" ||
		status === "429"
	) {
		return "rate_limit_exceeded";
	}

	if (
		message.includes("invalid model") ||
		(message.includes("model") && message.includes("invalid")) ||
		code === "invalid_model"
	) {
		return "invalid_model";
	}

	if (
		message.includes("invalid api key") ||
		message.includes("unauthorized") ||
		code === "401" ||
		status === "401" ||
		code === "invalid_api_key"
	) {
		return "invalid_api_key";
	}

	return null;
}

function parseSoftLimitRatio(): number {
	const raw = process.env.OPENROUTER_PLATFORM_SOFT_LIMIT_RATIO;
	if (!raw) return 0.9;
	const parsed = Number.parseFloat(raw);
	if (!Number.isFinite(parsed)) return 0.9;
	return Math.min(1, Math.max(0.1, parsed));
}

function parseDailyLimit(): number | null {
	const raw = process.env.OPENROUTER_PLATFORM_DAILY_REQUEST_LIMIT;
	if (!raw) return null;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return null;
	return parsed;
}

function parseUserDailyLimit(): number {
	// Default to 50 requests per user per day if not set
	const raw = process.env.OPENROUTER_USER_DAILY_REQUEST_LIMIT;
	if (!raw) return 50;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return 50;
	return parsed;
}

async function getPlatformBudgetState(userId: string): Promise<PlatformBudgetState> {
	const limit = parseDailyLimit();
	const userLimit = parseUserDailyLimit();
	
	const startOfDayUtc = new Date();
	startOfDayUtc.setUTCHours(0, 0, 0, 0);

	try {
		const admin = createAdminClient();
		
		// Parallel queries for efficiency
		const [platformUsage, userUsage] = await Promise.all([
			// Platform-wide usage
			limit ? admin
				.from("usage_logs")
				.select("id", { count: "exact", head: true })
				.gte("created_at", startOfDayUtc.toISOString())
				.like("model_used", "platform:%") 
				: Promise.resolve({ count: 0, error: null }),
			
			// User-specific usage
			admin
				.from("usage_logs")
				.select("id", { count: "exact", head: true })
				.gte("created_at", startOfDayUtc.toISOString())
				.like("model_used", "platform:%")
				.eq("user_id", userId)
		]);

		if (platformUsage.error) {
			console.warn("Failed to read platform budget usage_logs:", platformUsage.error.message);
		}
		if (userUsage.error) {
			console.warn("Failed to read user budget usage_logs:", userUsage.error.message);
		}

		const currentCount = platformUsage.count ?? 0;
		const userCurrentCount = userUsage.count ?? 0;
		
		const softLimit = limit ? Math.floor(limit * parseSoftLimitRatio()) : Infinity;

		return {
			hardBlocked: limit ? currentCount >= limit : false,
			softLimitReached: limit ? currentCount >= softLimit : false,
			limit,
			currentCount,
			userHardBlocked: userCurrentCount >= userLimit,
			userCurrentCount
		};
	} catch (error) {
		console.warn("Platform budget check unavailable:", error);
		return {
			hardBlocked: false,
			softLimitReached: false,
			limit,
			currentCount: 0,
			userHardBlocked: false,
			userCurrentCount: 0
		};
	}
}

async function getUserByokState(
	supabase: SupabaseClient,
	userId: string,
): Promise<UserByokState> {
	try {
		const { data, error } = await supabase
			.from("user_ai_keys")
			.select("encrypted_key, key_last4")
			.eq("user_id", userId)
			.maybeSingle();

		if (error) {
			console.warn("Unable to fetch user BYOK state:", error.message);
			return {
				hasByokRow: false,
				apiKey: null,
				last4: null,
				decryptionError: false,
			};
		}

		if (!data?.encrypted_key) {
			return {
				hasByokRow: false,
				apiKey: null,
				last4: null,
				decryptionError: false,
			};
		}

		try {
			return {
				hasByokRow: true,
				apiKey: decryptOpenRouterKey(data.encrypted_key),
				last4: data.key_last4 || null,
				decryptionError: false,
			};
		} catch (error) {
			console.error("Failed to decrypt user BYOK key:", error);
			return {
				hasByokRow: true,
				apiKey: null,
				last4: data.key_last4 || null,
				decryptionError: true,
			};
		}
	} catch (error) {
		console.warn("Unexpected BYOK lookup error:", error);
		return {
			hasByokRow: false,
			apiKey: null,
			last4: null,
			decryptionError: false,
		};
	}
}

async function recordUsageLog(
	userId: string,
	modelUsed: string,
	actionType: UsageActionType,
): Promise<void> {
	try {
		const admin = createAdminClient();
		const { error } = await admin.from("usage_logs").insert({
			user_id: userId,
			model_used: modelUsed,
			action_type: actionType,
		});

		if (error) {
			console.warn("Failed to record usage log:", error.message);
		}
	} catch (error) {
		console.warn("Usage log recording unavailable:", error);
	}
}

async function readErrorBody(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return {
			error: {
				status: response.status,
				message: response.statusText || "Unknown OpenRouter error",
			},
		};
	}
}

async function callOpenRouterChatCompletion(
	candidate: KeyCandidate,
	model: string,
	options: OpenRouterRoutingOptions,
): Promise<Response> {
	const payload: Record<string, unknown> = {
		model,
		messages: options.messages,
		temperature: options.temperature ?? 0.7,
		stream: options.stream ?? true,
	};

	if (typeof options.maxTokens === "number") {
		payload.max_tokens = options.maxTokens;
	}

	return fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${candidate.apiKey}`,
			"Content-Type": "application/json",
			"HTTP-Referer":
				process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
			"X-Title": options.title || "Echoflow",
		},
		body: JSON.stringify(payload),
	});
}

function buildModelCandidates(
	platform: PlatformKeyResolution,
	platformBudget: PlatformBudgetState,
	byok: UserByokState,
): KeyCandidate[] {
	const keyCandidates: KeyCandidate[] = [];

	// Check both global hard block AND user hard block
	const isBlocked = platformBudget.hardBlocked || platformBudget.userHardBlocked;

	if (platform.key && !isBlocked) {
		keyCandidates.push({ source: "platform", apiKey: platform.key });
	}

	if (byok.apiKey) {
		keyCandidates.push({ source: "byok", apiKey: byok.apiKey });
	}

	return keyCandidates;
}

export async function routeOpenRouterRequest(
	options: OpenRouterRoutingOptions,
): Promise<OpenRouterRoutingResult> {
	const platformResolution = resolvePlatformKey();
	const platformBudget = await getPlatformBudgetState(options.userId);
	const byokState = await getUserByokState(options.supabase, options.userId);
	const modelCandidates = getCandidateModels();
	const keyCandidates = buildModelCandidates(
		platformResolution,
		platformBudget,
		byokState,
	);

	if (platformBudget.softLimitReached && platformBudget.limit) {
		console.warn(
			`OpenRouter platform budget soft threshold reached (${platformBudget.currentCount}/${platformBudget.limit}).`,
		);
	}

	if (keyCandidates.length === 0) {
		if (byokState.decryptionError && byokState.hasByokRow) {
			return {
				ok: false,
				status: 503,
				code: "byok_or_upgrade_required",
				error:
					"Your stored API key is corrupted. Please update it in settings to continue.",
			};
		}

		if (platformBudget.hardBlocked) {
			return {
				ok: false,
				status: 503,
				code: "platform_budget_exhausted",
				error:
					"Platform AI budget reached for today. Add your OpenRouter key or upgrade to continue.",
			};
		}
		
		if (platformBudget.userHardBlocked) {
			return {
				ok: false,
				status: 429, // Too Many Requests
				code: "rate_limit_exceeded",
				error:
					"You have reached your daily free AI limit. Upgrade to Pro or add your own key to continue.",
			};
		}

		return {
			ok: false,
			status: 503,
			code: "byok_or_upgrade_required",
			error:
				platformResolution.misconfigured
					? "OpenRouter platform key is not configured. Add your API key in settings."
					: "No AI key available. Add your OpenRouter API key or upgrade to continue.",
		};
	}

	let lastError: unknown = null;
	let sawRateLimit = false;
	let sawInsufficientQuota = false;
	let sawByokFailure = false;
	let sawByokInvalidApiKey = false;

	for (const keyCandidate of keyCandidates) {
		for (const model of modelCandidates) {
			try {
				const response = await callOpenRouterChatCompletion(
					keyCandidate,
					model,
					options,
				);

				if (response.ok) {
					const actionType = options.actionType || "QUIZ";
					await recordUsageLog(
						options.userId,
						`${keyCandidate.source}:${model}`,
						actionType,
					);
					return {
						ok: true,
						response,
						model,
						keySource: keyCandidate.source,
					};
				}

				const errorBody = await readErrorBody(response);
				const classified = classifyOpenRouterError(errorBody);
				lastError = errorBody;

				if (classified === "context_length_exceeded") {
					return {
						ok: false,
						status: 400,
						code: "context_length_exceeded",
						error: "Context length exceeded for this model.",
						details: errorBody,
					};
				}

				if (classified === "rate_limit_exceeded") {
					sawRateLimit = true;
				}

				if (classified === "insufficient_quota") {
					sawInsufficientQuota = true;
					if (keyCandidate.source === "platform") {
						break;
					}
				}

				if (classified === "invalid_api_key" && keyCandidate.source === "byok") {
					sawByokInvalidApiKey = true;
				}

				if (
					classified === "invalid_api_key" ||
					classified === "insufficient_quota"
				) {
					if (keyCandidate.source === "byok") {
						sawByokFailure = true;
					}
					if (keyCandidate.source === "platform") {
						break;
					}
				}

				// For invalid_model, rate_limit and unknown errors: try next model.
				continue;
			} catch (error) {
				lastError = error;
				continue;
			}
		}
	}

	if ((platformBudget.hardBlocked || platformBudget.userHardBlocked) && !byokState.apiKey) {
		if (platformBudget.userHardBlocked) {
			return {
				ok: false,
				status: 429,
				code: "rate_limit_exceeded",
				error: "You have reached your daily free AI limit. Upgrade to Pro or add your own key to continue.",
				details: lastError,
			};
		}
		
		return {
			ok: false,
			status: 503,
			code: "platform_budget_exhausted",
			error:
				"Platform AI budget reached for today. Add your OpenRouter key or upgrade to continue.",
			details: lastError,
		};
	}

	const byokOnlyAttempted =
		keyCandidates.length === 1 && keyCandidates[0]?.source === "byok";

	if (sawInsufficientQuota && byokOnlyAttempted) {
		return {
			ok: false,
			status: 503,
			code: "insufficient_quota",
			error:
				"Insufficient quota on your OpenRouter key. Recharge your key balance and retry.",
			details: lastError,
		};
	}

	if (
		(sawInsufficientQuota && !byokState.apiKey) ||
		(byokState.decryptionError && byokState.hasByokRow) ||
		sawByokFailure
	) {
		const byokHint = sawByokInvalidApiKey
			? "Your BYOK key appears invalid. Update it in settings."
			: "Add or update your OpenRouter API key in settings, or upgrade.";

		return {
			ok: false,
			status: 503,
			code: "byok_or_upgrade_required",
			error: `AI quota is unavailable right now. ${byokHint}`,
			details: lastError,
		};
	}

	if (sawRateLimit) {
		return {
			ok: false,
			status: 429,
			code: "rate_limit_exceeded",
			error: "Rate limit reached. Please retry in a moment.",
			details: lastError,
		};
	}

	return {
		ok: false,
		status: 503,
		code: "ALL_MODELS_FAILED",
		error: "All AI models are currently unavailable. Please try again later.",
		details: lastError,
	};
}
