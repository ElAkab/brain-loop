import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAILY_FREE_QUOTA = 20;

/**
 * GET /api/credits
 * Returns user credit balance and free-quota status.
 */
export async function GET(_request: NextRequest) {
	const supabase = await createClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const [{ data: profile }, { data: byokKey }] = await Promise.all([
			supabase
				.from("profiles")
				.select("credits, free_used_today")
				.eq("id", user.id)
				.maybeSingle(),
			supabase
				.from("user_ai_keys")
				.select("id")
				.eq("user_id", user.id)
				.maybeSingle(),
		]);

		const credits = profile?.credits ?? 0;
		const freeUsed = profile?.free_used_today ?? 0;
		const freeRemaining = Math.max(0, DAILY_FREE_QUOTA - freeUsed);

		return NextResponse.json({
			// Purchased credits
			credits,
			has_credits: credits > 0,

			// Free daily quota
			free_quota: DAILY_FREE_QUOTA,
			free_used: freeUsed,
			free_remaining: freeRemaining,

			// BYOK
			has_byok: !!byokKey,

			// Total usable now (-1 = unlimited with BYOK)
			total_available: byokKey ? -1 : credits + freeRemaining,
		});
	} catch (error) {
		console.error("Error fetching credits:", error);
		return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
	}
}
