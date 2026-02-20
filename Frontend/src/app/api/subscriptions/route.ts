import { NextResponse } from "next/server";

/**
 * @deprecated Subscriptions removed — Echoflow uses top-up only (one-time credits).
 * See /api/credits/checkout for the current payment flow.
 */
export async function POST() {
	return NextResponse.json(
		{ error: "Subscriptions are no longer available. Use top-up credits instead.", code: "deprecated" },
		{ status: 410 },
	);
}

export async function GET() {
	return NextResponse.json(
		{ subscription_tier: "free", subscription_status: "inactive" },
		{ status: 200 },
	);
}
