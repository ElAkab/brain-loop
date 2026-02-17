import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAILY_FREE_QUOTA = 20;

/**
 * GET /api/credits
 * Retourne le solde de crédits et le quota gratuit de l'utilisateur
 */
export async function GET(request: NextRequest) {
	const supabase = await createClient();
	
	const { data: { user }, error: authError } = await supabase.auth.getUser();
	
	if (authError || !user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	
	try {
		// 1. Récupérer les crédits achetés
		const { data: credits, error: creditsError } = await supabase
			.from("user_credits")
			.select("balance, total_purchased, total_consumed, updated_at")
			.eq("user_id", user.id)
			.maybeSingle();
		
		// 2. Vérifier si l'utilisateur a BYOK
		const { data: byokKey } = await supabase
			.from("user_ai_keys")
			.select("id")
			.eq("user_id", user.id)
			.maybeSingle();
		
		// 3. Calculer le quota gratuit utilisé aujourd'hui
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		
		const { count: dailyUsage, error: usageError } = await supabase
			.from("usage_logs")
			.select("*", { count: "exact", head: true })
			.eq("user_id", user.id)
			.eq("action_type", "QUIZ")
			.gte("created_at", today.toISOString());
		
		const purchasedBalance = credits?.balance ?? 0;
		const freeUsed = dailyUsage ?? 0;
		const freeRemaining = Math.max(0, DAILY_FREE_QUOTA - freeUsed);
		
		return NextResponse.json({
			// Crédits achetés
			balance: purchasedBalance,
			total_purchased: credits?.total_purchased ?? 0,
			total_consumed: credits?.total_consumed ?? 0,
			updated_at: credits?.updated_at ?? null,
			
			// Quota gratuit
			free_quota: DAILY_FREE_QUOTA,
			free_used: freeUsed,
			free_remaining: freeRemaining,
			
			// BYOK status
			has_byok: !!byokKey,
			
			// Total utilisable maintenant
			total_available: byokKey ? -1 : (purchasedBalance + freeRemaining),
		});
	} catch (error) {
		console.error("Error fetching credits:", error);
		return NextResponse.json(
			{ error: "Failed to fetch credits" },
			{ status: 500 }
		);
	}
}
