import { NextResponse } from "next/server";

/** @deprecated */
export async function POST() {
	return NextResponse.json(
		{ error: "Subscriptions are no longer available.", code: "deprecated" },
		{ status: 410 },
	);
}
