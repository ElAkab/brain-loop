import { create } from 'zustand';

interface CreditInfo {
	premium_balance: number;
	monthly_credits_used: number;
	monthly_credits_limit: number;
	monthly_remaining: number;
	total_premium_available: number;
	free_quota: number;
	free_used: number;
	free_remaining: number;
	subscription_tier: string;
	subscription_status: string;
	is_pro: boolean;
	has_byok: boolean;
	total_available: number;
}

interface CreditsStore {
	info: CreditInfo | null;
	isLoading: boolean;
	fetchCredits: () => Promise<void>;
	refreshCredits: () => Promise<void>;
}

export const useCreditsStore = create<CreditsStore>((set) => ({
	info: null,
	isLoading: true,
	fetchCredits: async () => {
		try {
			set({ isLoading: true });
			const res = await fetch("/api/credits");
			if (res.ok) {
				const data = await res.json();
				set({ info: data, isLoading: false });
			} else {
				set({ isLoading: false });
			}
		} catch (error) {
			console.error("Error fetching credits:", error);
			set({ isLoading: false });
		}
	},
	refreshCredits: async () => {
		try {
			const res = await fetch("/api/credits");
			if (res.ok) {
				const data = await res.json();
				set({ info: data });
			}
		} catch (error) {
			console.error("Error refreshing credits:", error);
		}
	},
}));
