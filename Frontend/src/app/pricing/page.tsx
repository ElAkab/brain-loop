import Link from "next/link";

export const metadata = {
	title: "Pricing - Echoflow",
};

export default function PricingPage() {
	return (
		<main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
			<section className="max-w-5xl mx-auto px-6 py-16">
				<div className="text-center space-y-4 mb-12">
					<h1 className="text-4xl font-bold tracking-tight">Simple Pricing</h1>
					<p className="text-muted-foreground max-w-2xl mx-auto">
						Start free, then choose what fits your workflow: premium access or
						bring your own OpenRouter key.
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<div className="rounded-xl border bg-card p-6 space-y-4">
						<div className="space-y-1">
							<h2 className="text-2xl font-semibold">Free</h2>
							<p className="text-sm text-muted-foreground">
								Great to discover active recall with AI.
							</p>
						</div>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>Premium models by default while platform budget allows</li>
							<li>Fallback guidance when shared quota is exhausted</li>
							<li>Unlimited notes and categories</li>
						</ul>
						<Link
							href="/auth/login"
							className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
						>
							Start Free
						</Link>
					</div>

					<div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4">
						<div className="space-y-1">
							<h2 className="text-2xl font-semibold">Pro (MVP waitlist)</h2>
							<p className="text-sm text-muted-foreground">
								Priority access and less friction for heavy usage.
							</p>
						</div>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>Priority model access</li>
							<li>Reduced interruptions during peak traffic</li>
							<li>Priority support and roadmap influence</li>
						</ul>
						<Link
							href="/payment"
							className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							Join Pro
						</Link>
					</div>
				</div>

				<div className="mt-10 rounded-xl border bg-card p-6 space-y-3">
					<h3 className="text-xl font-semibold">
						Bring Your Own <a href="https://openrouter.ai">OpenRouter</a> Key
					</h3>
					<p className="text-sm text-muted-foreground">
						You can keep using Echoflow anytime with your personal OpenRouter
						API key. Keys are encrypted and managed in your settings.
					</p>
					<Link
						href="/settings?section=ai-key"
						className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
					>
						Add My API Key
					</Link>
				</div>
			</section>
		</main>
	);
}
