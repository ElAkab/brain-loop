import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2026-01-28.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const resend = process.env.RESEND_API_KEY
	? new Resend(process.env.RESEND_API_KEY)
	: null;

// Zod v4 validation for top-up checkout metadata
const TopUpMetadataSchema = z.object({
	user_id: z.string().uuid(),
	credits: z.string().regex(/^\d+$/),
	type: z.literal("topup"),
});

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events for the top-up billing model.
 * Only processes: checkout.session.completed (type=topup, payment_status=paid)
 *
 * Idempotency: tracked in processed_stripe_events table (DB-persisted, survives cold starts).
 * Security: Stripe signature verified before any DB operation.
 * Auth: uses createAdminClient() (service role) — no user session in webhook context.
 */
export async function POST(request: NextRequest) {
	const payload = await request.text();
	const signature = request.headers.get("stripe-signature");

	if (!signature) {
		return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
	}

	// ── 1. Verify Stripe signature ─────────────────────────────────────────
	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error("Webhook signature verification failed:", message);
		return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
	}

	// Admin client bypasses RLS — required since webhook has no user session
	const supabase = createAdminClient();

	// ── 2. DB-based idempotency check ──────────────────────────────────────
	const { data: alreadyProcessed } = await supabase
		.from("processed_stripe_events")
		.select("event_id")
		.eq("event_id", event.id)
		.maybeSingle();

	if (alreadyProcessed) {
		console.log(`[Webhook] Event ${event.id} already processed — skipping`);
		return NextResponse.json({ received: true, idempotent: true });
	}

	// ── 3. Handle events ───────────────────────────────────────────────────
	try {
		if (event.type === "checkout.session.completed") {
			const session = event.data.object as Stripe.Checkout.Session;

			// Validate metadata (Zod)
			const metaParse = TopUpMetadataSchema.safeParse(session.metadata);

			if (!metaParse.success) {
				// Not a top-up session (e.g. a legacy subscription checkout) — skip silently
				console.log(
					`[Webhook] Skipping non-topup session ${session.id}:`,
					metaParse.error.issues,
				);
				await markProcessed(supabase, event.id);
				return NextResponse.json({ received: true, skipped: true });
			}

			if (session.payment_status !== "paid") {
				console.log(`[Webhook] Session ${session.id} not paid yet — skipping`);
				await markProcessed(supabase, event.id);
				return NextResponse.json({ received: true, skipped: true });
			}

			const { user_id, credits: creditsStr } = metaParse.data;
			const creditAmount = parseInt(creditsStr, 10);

			// Add credits atomically via SECURITY DEFINER RPC
			const { data: rpcResult, error: rpcError } = await supabase.rpc("add_credits", {
				p_user_id: user_id,
				p_amount: creditAmount,
				p_metadata: {
					stripe_session_id: session.id,
					stripe_payment_intent: session.payment_intent,
					amount_total: session.amount_total,
					currency: session.currency,
				},
			});

			if (rpcError) {
				console.error("[Webhook] add_credits RPC error:", rpcError);
				// Don't mark as processed — allow Stripe to retry
				return NextResponse.json({ error: "Failed to add credits" }, { status: 500 });
			}

			const newBalance = rpcResult?.[0]?.new_balance ?? creditAmount;
			console.log(`[Webhook] Added ${creditAmount} credits to user ${user_id}. New balance: ${newBalance}`);

			// Optionally store stripe_customer_id for future reference
			if (session.customer && typeof session.customer === "string") {
				await supabase
					.from("profiles")
					.update({ stripe_customer_id: session.customer })
					.eq("id", user_id);
			}

			// Send confirmation email (non-blocking — failure doesn't prevent credit addition)
			await sendCreditEmail(supabase, user_id, creditAmount, newBalance);
		} else {
			console.log(`[Webhook] Unhandled event type: ${event.type}`);
		}

		// ── 4. Mark event as processed ──────────────────────────────────────
		await markProcessed(supabase, event.id);

		return NextResponse.json({ received: true, success: true });
	} catch (error) {
		console.error("[Webhook] Unexpected error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function markProcessed(supabase: ReturnType<typeof createAdminClient>, eventId: string) {
	const { error } = await supabase
		.from("processed_stripe_events")
		.insert({ event_id: eventId });

	if (error && error.code !== "23505") {
		// 23505 = unique_violation (already inserted — race condition, safe to ignore)
		console.error("[Webhook] Failed to mark event as processed:", error);
	}
}

async function sendCreditEmail(
	supabase: ReturnType<typeof createAdminClient>,
	userId: string,
	amount: number,
	newBalance: number,
) {
	if (!resend) return;

	const { data: profile } = await supabase
		.from("profiles")
		.select("email, full_name")
		.eq("id", userId)
		.maybeSingle();

	if (!profile?.email) {
		console.error("[Webhook] No email found for user:", userId);
		return;
	}

	try {
		await resend.emails.send({
			from: "Echoflow <noreply@echoflow.app>",
			to: profile.email,
			subject: "Credits Added to Your Account",
			html: `
				<p>Hello ${profile.full_name || ""},</p>
				<p><strong>${amount} credits</strong> have been added to your account.</p>
				<p>New balance: <strong>${newBalance} credits</strong></p>
				<p>Credits never expire — use them at your own pace.</p>
				<p>Thank you for your support!</p>
			`,
		});
	} catch (error) {
		console.error("[Webhook] Error sending email:", error);
	}
}
