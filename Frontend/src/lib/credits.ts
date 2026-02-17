/**
 * Study Credits System - Logic
 * 
 * Gestion des crédits Study Questions pour les utilisateurs
 * - Vérification du solde
 * - Consommation de crédits
 * - Vérification d'éligibilité aux quiz
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Vérifie si l'utilisateur a des crédits disponibles
 * 
 * Ordre de priorité pour l'accès IA:
 * 1. BYOK (clé perso) → Toujours gratuit
 * 2. Crédits achetés → 1 crédit = 1 quiz
 * 3. Quota gratuit journalier (20/jour)
 */
export async function hasCredits(userId: string): Promise<boolean> {
	const supabase = await createClient();
	
	// 1. Vérifier si l'utilisateur a BYOK
	const { data: byokKey } = await supabase
		.from("user_ai_keys")
		.select("id")
		.eq("user_id", userId)
		.maybeSingle();
	
	if (byokKey) {
		return true; // BYOK = accès illimité
	}
	
	// 2. Vérifier les crédits achetés
	const { data: credits } = await supabase
		.from("user_credits")
		.select("balance")
		.eq("user_id", userId)
		.maybeSingle();
	
	if (credits && credits.balance > 0) {
		return true;
	}
	
	// 3. Vérifier le quota gratuit journalier
	// TODO: Implémenter le quota journalier dans usage_logs
	// Pour l'instant, on laisse passer (retro-compatibilité)
	return true;
}

/**
 * Obtient le solde de crédits de l'utilisateur
 */
export async function getCreditBalance(userId: string): Promise<number> {
	const supabase = await createClient();
	
	const { data } = await supabase
		.from("user_credits")
		.select("balance")
		.eq("user_id", userId)
		.maybeSingle();
	
	return data?.balance ?? 0;
}

/**
 * Consomme un crédit pour générer un quiz
 * Retourne true si la consommation a réussi
 */
export async function consumeCredit(userId: string): Promise<{
	success: boolean;
	balance: number;
	message: string;
}> {
	const supabase = await createClient();
	
	// Vérifier BYOK d'abord
	const { data: byokKey } = await supabase
		.from("user_ai_keys")
		.select("id")
		.eq("user_id", userId)
		.maybeSingle();
	
	// BYOK = pas de consommation de crédits
	if (byokKey) {
		return {
			success: true,
			balance: -1, // Illimité
			message: "Using BYOK - no credits consumed",
		};
	}
	
	// Appeler la fonction RPC pour consommer
	const { data, error } = await supabase.rpc("consume_credit", {
		p_user_id: userId,
	});
	
	if (error) {
		console.error("Error consuming credit:", error);
		return {
			success: false,
			balance: 0,
			message: error.message,
		};
	}
	
	const result = data?.[0] || data;
	return {
		success: result?.success || false,
		balance: result?.new_balance || 0,
		message: result?.message || "Unknown error",
	};
}

/**
 * Formate le nombre de crédits pour l'affichage
 */
export function formatCredits(balance: number): string {
	if (balance < 0) {
		return "∞"; // Illimité (BYOK)
	}
	if (balance === 0) {
		return "0";
	}
	if (balance >= 1000) {
		return `${Math.floor(balance / 1000)}k+`;
	}
	return balance.toString();
}
