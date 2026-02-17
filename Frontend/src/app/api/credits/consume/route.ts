import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/credits/consume
 * Consomme un crédit pour générer un quiz
 * Retourne success: true si le crédit a été consommé, false sinon
 */
export async function POST(request: NextRequest) {
	const supabase = await createClient();
	
	const { data: { user }, error: authError } = await supabase.auth.getUser();
	
	if (authError || !user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	
	try {
		// Appeler la fonction RPC pour consommer un crédit atomiquement
		const { data, error } = await supabase.rpc("consume_credit", {
			p_user_id: user.id,
		});
		
		if (error) {
			console.error("Error consuming credit:", error);
			return NextResponse.json(
				{ error: "Failed to consume credit", details: error.message },
				{ status: 500 }
			);
		}
		
		// La fonction RPC retourne un tableau avec un objet
		const result = data?.[0] || data;
		
		return NextResponse.json({
			success: result?.success || false,
			balance: result?.new_balance || 0,
			message: result?.message || "Unknown error",
		});
	} catch (error) {
		console.error("Error in consume credit endpoint:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
