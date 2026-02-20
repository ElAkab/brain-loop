import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/credits/consume
 * Manually consume one credit (used for testing / manual flows).
 * AI routes use consumeCredit() from lib/credits.ts directly.
 */
export async function POST(request: NextRequest) {
	const supabase = await createClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const preferPremium: boolean = body?.prefer_premium !== false;

		const { data, error } = await supabase.rpc("consume_credit", {
			p_user_id: user.id,
			p_is_premium_request: preferPremium,
		});

		if (error) {
			console.error("Error consuming credit:", error);
			return NextResponse.json(
				{ error: "Failed to consume credit", details: error.message },
				{ status: 500 },
			);
		}

		const result = data?.[0] ?? data;

		return NextResponse.json({
			success: result?.success ?? false,
			balance: result?.new_balance ?? 0,
			free_used: result?.new_free_used ?? 0,
			used_premium: result?.used_premium ?? false,
			message: result?.message ?? "Unknown result",
		});
	} catch (error) {
		console.error("Error in consume credit endpoint:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
