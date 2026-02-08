import Link from "next/link";
import NavLink from "@/components/layout/NavLink";

export const metadata = {
	title: "Features — Echoflow",
};

const features = [
	{
		title: "Category Creation",
		description:
			"Create custom categories with icons and colors to visually organize your knowledge.",
		icon: "🗂️",
	},
	{
		title: "Markdown Notes",
		description:
			"Write rich Markdown notes (code, lists) while preserving their structure during question generation.",
		icon: "📝",
	},
	{
		title: "LLM-Powered Interactive Quizzes",
		description:
			"Launch quizzes in a chat-based format powered by an LLM, dynamically generated from your notes.",
		icon: "🤖",
	},
	{
		title: "Multi-Note Selection",
		description:
			"Combine multiple notes to provide broader context and generate more accurate, tailored quizzes.",
		icon: "📚",
	},
	{
		title: "Intelligent Session Tracking",
		description:
			"The model remembers your previous interactions to continuously improve quiz relevance over time.",
		icon: "🧠",
	},
];

export default function FeaturesPage() {
	return (
		<main className="min-h-screen bg-gradient-to-b dark:from-gray-900 dark:to-gray-800">
			{/* Header */}
			<header className="sticky top-0 z-50 backdrop-blur-lg bg-gray-900/40 border-b border-gray-700/50">
				<div className="flex items-center justify-between px-8 sm:px-16 md:px-32 py-4">
					<div className="flex items-center gap-3">
						<NavLink href="/">
							<span className="text-2xl font-bold text-primary cursor-pointer m-0">
								Echoflow
							</span>
						</NavLink>
						<img
							src="/images/echoflow_logo.png"
							alt="Echoflow Logo"
							className="h-10 w-10 md:h-12 md:w-12"
						/>
					</div>

					<nav className="space-x-6">
						<NavLink href="/learn-more">Learn More</NavLink>
						<NavLink href="/features">Features</NavLink>
						<NavLink href="/contact">Contact</NavLink>
					</nav>
				</div>
			</header>

			{/* Hero */}
			<section className="max-w-5xl mx-auto px-8 pt-20 pb-16 text-center">
				<h1 className="text-4xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r dark:from-primary to-[#053f61] bg-clip-text text-transparent">
					Everything you need to learn smarter
				</h1>
				<p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
					Echoflow transforms your notes into interactive AI-driven quizzes to
					boost understanding and long-term retention.
				</p>
			</section>

			{/* Features */}
			<section className="max-w-6xl mx-auto px-8 pb-20">
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{features.map((feature) => (
						<div
							key={feature.title}
							className="rounded-xl border border-gray-700/50 bg-gray-900/40 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl"
						>
							<div className="text-3xl mb-4">{feature.icon}</div>
							<h3 className="text-lg font-semibold text-gray-100 mb-2">
								{feature.title}
							</h3>
							<p className="text-sm text-gray-400">{feature.description}</p>
						</div>
					))}
				</div>
			</section>

			{/* CTA */}
			<section className="border-t border-gray-700/50 bg-gray-900/30">
				<div className="max-w-4xl mx-auto px-8 py-16 text-center">
					<h2 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">
						Ready to upgrade your learning workflow?
					</h2>
					<p className="text-gray-400 mb-8">
						Start transforming your notes into intelligent quizzes today.
					</p>

					<Link
						href="/auth/login"
						className="inline-block px-8 py-4 bg-gradient-to-br from-primary to-primary-900 text-white font-semibold rounded-lg transition-all duration-300 hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
					>
						Get Started
					</Link>
				</div>
			</section>
		</main>
	);
}
