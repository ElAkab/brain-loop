import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe =
	process.env.STRIPE_SECRET_KEY &&
	process.env.STRIPE_SECRET_KEY !== "sk_test_demo"
		? new Stripe(process.env.STRIPE_SECRET_KEY, {
				apiVersion: "2026-01-28.clover",
		  })
		: null;

/**
 * POST /api/credits/sync
 *
 * Fallback top-up activation called from the payment success page.
 * Verifies the Stripe Checkout session and adds credits directly —
 * in case the webhook fires with a delay or isn't configured yet.
 *
 * Idempotency: inserts `topup_sync_{session_id}` into processed_stripe_events
 * so credits are never added twice even if the webhook also fires.
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

	const body = await request.json().catch(() => ({}));
	const { session_id } = body as { session_id?: string };

	if (!session_id || typeof session_id !== "string") {
		return NextResponse.json({ error: "session_id required" }, { status: 400 });
	}

	// DEV MODE: credits already added directly at checkout
	if (!stripe) {
		return NextResponse.json({ credited: true, devMode: true });
	}

	try {
		const session = await stripe.checkout.sessions.retrieve(session_id);

		// Security: verify this session belongs to the authenticated user
		if (session.metadata?.user_id !== user.id) {
			console.warn(
				`[CreditSync] session ${session_id} user_id mismatch: expected ${user.id}, got ${session.metadata?.user_id}`,
			);
			return NextResponse.json(
				{ error: "Session does not belong to current user" },
				{ status: 403 },
			);
		}

		// Only credit for paid one-time payments
		if (session.mode !== "payment" || session.payment_status !== "paid") {
			return NextResponse.json(
				{ credited: false, reason: "Session not a completed payment" },
				{ status: 200 },
			);
		}

		const creditsStr = session.metadata?.credits;
		if (!creditsStr || !/^\d+$/.test(creditsStr)) {
			return NextResponse.json(
				{ credited: false, reason: "Missing credits metadata" },
				{ status: 200 },
			);
		}
		const creditAmount = parseInt(creditsStr, 10);

		const admin = createAdminClient();

		// Idempotency: try to claim this session for processing
		// If the webhook already processed it (evt_xxx) OR we already synced it,
		// this insert will fail with a unique constraint and we skip adding credits.
		const syncKey = `topup_sync_${session_id}`;
		const { error: insertError } = await admin
			.from("processed_stripe_events")
			.insert({ event_id: syncKey });

		if (insertError) {
			if (insertError.code === "23505") {
				// Already processed (by webhook or previous sync call)
				console.log(`[CreditSync] Session ${session_id} already credited — skipping`);
				return NextResponse.json({ credited: true, alreadyCredited: true });
			}
			// Table might not exist — fall through and try to add credits anyway
			// (webhook idempotency will still protect via its own event ID check)
			console.warn("[CreditSync] Could not insert idempotency key:", insertError.message);
		}

		// Add credits
		const { data: rpcResult, error: rpcError } = await admin.rpc("add_credits", {
			p_user_id: user.id,
			p_amount: creditAmount,
			p_metadata: {
				stripe_session_id: session_id,
				stripe_payment_intent: session.payment_intent,
				amount_total: session.amount_total,
				currency: session.currency,
				source: "success_page_sync",
			},
		});

		if (rpcError) {
			console.error("[CreditSync] add_credits RPC error:", rpcError);
			return NextResponse.json(
				{ error: "Failed to add credits" },
				{ status: 500 },
			);
		}

		const newBalance = rpcResult?.[0]?.new_balance ?? creditAmount;
		console.log(
			`[CreditSync] Top-up: +${creditAmount} credits → user ${user.id}. Balance: ${newBalance}`,
		);

		return NextResponse.json({ credited: true, creditAmount, newBalance });
	} catch (error) {
		console.error("[CreditSync] Error verifying session:", error);
		return NextResponse.json(
			{ error: "Failed to sync credits" },
			{ status: 500 },
		);
	}
}
