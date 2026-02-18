"use client";

import { useState, useCallback } from "react";

interface SessionCreditState {
	hasConsumed: boolean;
	isConsuming: boolean;
}

export function useSessionCredits() {
	const [sessionState, setSessionState] = useState<SessionCreditState>({
		hasConsumed: false,
		isConsuming: false,
	});

	const consumeSessionCredit = useCallback(async (
		endpoint: string,
		body: object
	) => {
		if (sessionState.hasConsumed || sessionState.isConsuming) {
			return { success: true, alreadyConsumed: true };
		}

		setSessionState((prev) => ({ ...prev, isConsuming: true }));

		try {
			const res = await fetch(endpoint, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const error = await res.json().catch(() => ({}));
				return { success: false, error, status: res.status };
			}

			setSessionState({ hasConsumed: true, isConsuming: false });
			return { success: true, response: res, alreadyConsumed: false };
		} catch (error) {
			setSessionState((prev) => ({ ...prev, isConsuming: false }));
			return { success: false, error };
		}
	}, [sessionState.hasConsumed, sessionState.isConsuming]);

	const resetSession = useCallback(() => {
		setSessionState({ hasConsumed: false, isConsuming: false });
	}, []);

	return {
		consumeSessionCredit,
		resetSession,
		hasConsumed: sessionState.hasConsumed,
		isConsuming: sessionState.isConsuming,
	};
}
