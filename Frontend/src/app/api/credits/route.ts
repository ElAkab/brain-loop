import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/credits
 * Retourne le solde de crédits de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
	const supabase = await createClient();
	
	const { data: { user }, error: authError } = await supabase.auth.getUser();
	
	if (authError || !user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	
	try {
		const { data, error } = await supabase
			.from("user_credits")
			.select("balance, total_purchased, total_consumed, updated_at")
			.eq("user_id", user.id)
			.single();
		
		if (error) {
			// Si pas de ligne, retourner 0 (l'utilisateur n'a jamais acheté)
			if (error.code === "PGRST116") {
				return NextResponse.json({
					balance: 0,
					total_purchased: 0,
					total_consumed: 0,
					updated_at: null,
				});
			}
			throw error;
		}
		
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching credits:", error);
		return NextResponse.json(
			{ error: "Failed to fetch credits" },
			{ status: 500 }
		);
	}
}
