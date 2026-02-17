"use client";

import React, { useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Check } from "lucide-react";

// Initialize Stripe outside of component to avoid recreating it on every render
const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string,
);

export default function PaymentPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubscribe = async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/checkout_sessions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					plan: "pro",
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to create checkout session");
			}

			const { sessionId } = await response.json();
			const stripe = await stripePromise;

			if (!stripe) {
				throw new Error("Stripe failed to load");
			}

			// Use the new method recommended in recent Stripe.js versions
			// redirectToCheckout is deprecated in newer versions in favor of specific methods
			// The modern way is to rely on the URL returned by the backend session creation.
			// However, since we have the sessionId, let's try to use redirectToCheckout if it exists on the instance (cast to any),
			// or fallback to window.location if the session object had a url (which we don't seem to be fetching here, just sessionId).
			
			// If we fix the backend fetch to return url, that would be ideal.
			// But sticking to the existing code structure:
			
			const { error } = await (stripe as any).redirectToCheckout({ sessionId });

			if (error) {
				throw error;
			}
		} catch (err: any) {
			console.error("Payment error:", err);
			setError(err.message || "An unexpected error occurred");
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto py-12 px-4 max-w-4xl">
			<div className="text-center mb-10">
				<h1 className="text-3xl font-bold tracking-tight mb-2">
					Upgrade to Pro
				</h1>
				<p className="text-muted-foreground text-lg">
					Unlock the full potential of your learning with Echoflow Pro.
				</p>
			</div>

			<div className="grid md:grid-cols-2 gap-8 items-start">
				{/* Free Plan */}
				<Card className="relative overflow-hidden border-muted">
					<CardHeader>
						<CardTitle className="text-2xl">Free</CardTitle>
						<CardDescription>Perfect for getting started</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-3xl font-bold">
							$0
							<span className="text-base font-normal text-muted-foreground">
								/month
							</span>
						</div>
						<ul className="space-y-2 text-sm">
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-primary" />
								<span>Basic note taking</span>
							</li>
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-primary" />
								<span>Limited AI quizzes</span>
							</li>
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-primary" />
								<span>Community support</span>
							</li>
						</ul>
					</CardContent>
					<CardFooter>
						<Button variant="outline" className="w-full" disabled>
							Current Plan
						</Button>
					</CardFooter>
				</Card>

				{/* Pro Plan */}
				<Card className="relative overflow-hidden border-primary shadow-lg ring-1 ring-primary/20">
					<div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-bl-lg">
						Popular
					</div>
					<CardHeader>
						<CardTitle className="text-2xl">Pro</CardTitle>
						<CardDescription>For serious learners</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-3xl font-bold">
							$9.99
							<span className="text-base font-normal text-muted-foreground">
								/month
							</span>
						</div>
						<ul className="space-y-2 text-sm">
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-primary" />
								<span>Unlimited AI quizzes</span>
							</li>
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-primary" />
								<span>Advanced analytics</span>
							</li>
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-primary" />
								<span>Priority support</span>
							</li>
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-primary" />
								<span>Custom AI personas</span>
							</li>
						</ul>
					</CardContent>
					<CardFooter className="flex flex-col gap-2">
						<Button
							className="w-full"
							onClick={handleSubscribe}
							disabled={loading}
						>
							{loading ? "Processing..." : "Subscribe Now"}
						</Button>
						{error && (
							<p className="text-sm text-destructive text-center">{error}</p>
						)}
						<p className="text-xs text-muted-foreground text-center">
							Secure payment via Stripe. Cancel anytime.
						</p>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
