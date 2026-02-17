"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type KeyStatusResponse = {
	hasKey: boolean;
	keyLast4?: string;
	updatedAt?: string | null;
};

type OpenRouterKeyCardProps = {
	autoFocusInput?: boolean;
};

export function OpenRouterKeyCard({
	autoFocusInput = false,
}: OpenRouterKeyCardProps) {
	const [status, setStatus] = useState<KeyStatusResponse>({ hasKey: false });
	const [apiKey, setApiKey] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [testing, setTesting] = useState(false);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const loadStatus = async () => {
		setLoading(true);
		setFeedback(null);
		try {
			const response = await fetch("/api/settings/openrouter-key", {
				credentials: "same-origin",
			});
			const payload = (await response.json()) as KeyStatusResponse & {
				error?: string;
			};

			if (!response.ok) {
				throw new Error(payload.error || "Failed to load key status.");
			}

			setStatus({
				hasKey: Boolean(payload.hasKey),
				keyLast4: payload.keyLast4,
				updatedAt: payload.updatedAt || undefined,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to load key status.";
			setFeedback({ type: "error", message });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadStatus().catch(() => undefined);
	}, []);

	const handleSave = async () => {
		if (!apiKey.trim()) {
			setFeedback({ type: "error", message: "Please enter an API key first." });
			return;
		}

		setSaving(true);
		setFeedback(null);

		try {
			const response = await fetch("/api/settings/openrouter-key", {
				method: "PUT",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ apiKey: apiKey.trim() }),
			});
			const payload = (await response.json()) as KeyStatusResponse & {
				error?: string;
			};

			if (!response.ok) {
				throw new Error(payload.error || "Unable to save OpenRouter key.");
			}

			setStatus({
				hasKey: true,
				keyLast4: payload.keyLast4,
				updatedAt: payload.updatedAt || undefined,
			});
			setApiKey("");
			setFeedback({ type: "success", message: "OpenRouter key saved." });
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to save OpenRouter key.";
			setFeedback({ type: "error", message });
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		setDeleting(true);
		setFeedback(null);

		try {
			const response = await fetch("/api/settings/openrouter-key", {
				method: "DELETE",
				credentials: "same-origin",
			});
			const payload = (await response.json()) as { error?: string };

			if (!response.ok) {
				throw new Error(payload.error || "Unable to delete key.");
			}

			setStatus({ hasKey: false });
			setFeedback({ type: "success", message: "OpenRouter key removed." });
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to delete key.";
			setFeedback({ type: "error", message });
		} finally {
			setDeleting(false);
		}
	};

	const handleTest = async () => {
		setTesting(true);
		setFeedback(null);
		try {
			const response = await fetch("/api/settings/openrouter-key", {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: apiKey.trim()
					? JSON.stringify({ apiKey: apiKey.trim() })
					: JSON.stringify({}),
			});
			const payload = (await response.json()) as {
				valid?: boolean;
				error?: string;
			};

			if (!response.ok || !payload.valid) {
				throw new Error(payload.error || "OpenRouter key test failed.");
			}

			setFeedback({ type: "success", message: "OpenRouter key is valid." });
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "OpenRouter key test failed.";
			setFeedback({ type: "error", message });
		} finally {
			setTesting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<KeyRound className="h-5 w-5 text-primary" />
					<CardTitle>OpenRouter API Key (BYOK)</CardTitle>
				</div>
				<CardDescription>
					Add your personal OpenRouter key to continue even when platform budget
					or shared quotas are exhausted.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={status.hasKey ? "secondary" : "outline"}>
						{status.hasKey ? "Configured" : "Not configured"}
					</Badge>
					{status.hasKey && status.keyLast4 ? (
						<span className="text-sm text-muted-foreground">
							Stored key: ••••••••{status.keyLast4}
						</span>
					) : null}
					{status.updatedAt ? (
						<span className="text-xs text-muted-foreground">
							Updated: {new Date(status.updatedAt).toLocaleString()}
						</span>
					) : null}
				</div>

				<div className="space-y-2">
					<Label htmlFor="openrouter-api-key">Paste a new OpenRouter key</Label>
					<Input
						id="openrouter-api-key"
						type="password"
						value={apiKey}
						onChange={(event) => setApiKey(event.target.value)}
						placeholder="sk-or-v1-..."
						autoFocus={autoFocusInput}
						disabled={loading || saving || deleting || testing}
					/>
					<p className="text-xs text-muted-foreground">
						Your key is encrypted at rest and never shown again.
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button
						onClick={handleSave}
						disabled={loading || saving || deleting || testing}
						className="cursor-pointer w-full sm:w-auto"
					>
						{saving ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Saving...
							</>
						) : (
							"Save key"
						)}
					</Button>
					<Button
						variant="secondary"
						onClick={handleTest}
						disabled={loading || saving || deleting || testing}
						className="cursor-pointer w-full sm:w-auto"
					>
						{testing ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Testing...
							</>
						) : (
							"Test key"
						)}
					</Button>
					<Button
						variant="outline"
						onClick={handleDelete}
						disabled={!status.hasKey || loading || saving || deleting || testing}
						className="cursor-pointer w-full sm:w-auto"
					>
						{deleting ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Removing...
							</>
						) : (
							<>
								<Trash2 className="h-4 w-4 mr-2" />
								Remove key
							</>
						)}
					</Button>
					<Button
						variant="ghost"
						onClick={() => loadStatus().catch(() => undefined)}
						disabled={loading || saving || deleting || testing}
						className="cursor-pointer w-full sm:w-auto"
					>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Loading...
							</>
						) : (
							"Refresh"
						)}
					</Button>
				</div>

				{feedback ? (
					<div
						className={`rounded-md border px-3 py-2 text-sm ${
							feedback.type === "success"
								? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
								: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
						}`}
					>
						<div className="flex items-center gap-2">
							{feedback.type === "success" ? (
								<CheckCircle2 className="h-4 w-4" />
							) : null}
							<span>{feedback.message}</span>
						</div>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
