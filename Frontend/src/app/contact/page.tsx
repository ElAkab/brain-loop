import Link from "next/link";
import NavLink from "@/components/layout/NavLink";

export const metadata = {
	title: "Contact — Echoflow",
};

export default function ContactPage() {
	return (
		<main className="min-h-screen pb-8 bg-gradient-to-b dark:from-gray-900 dark:to-gray-800">
			<header className="flex items-center px-8 sm:px-16 md:px-32 bg-gradient-to-b dark:from-gray-900/10 dark:to-gray-800/10 backdrop-blur-lg border-b border-gray-700/50 justify-between mb-8 sticky top-0 py-4">
				<div className="flex items-center gap-3">
					<NavLink
						href="/"
					>
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
			</header>

			<div className="max-w-4xl mx-auto px-8">
				<div className="text-center md:px-24">
					<h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r dark:from-primary to-[#053f61] bg-clip-text text-transparent">
						Contact
					</h2>

					<p className="text-lg text-gray-400 mb-8">
						Have a question or feedback ? Send me a message.
					</p>
					<span className="text-sm text-gray-500 mb-12 block">
						(This form is for demonstration purposes only)
					</span>
				</div>

				<section className="w-full sm:w-auto text-gray-200 space-y-6 prose prose-invert max-w-none">
					<form
						action="mailto:hello@example.com"
						method="post"
						encType="text/plain"
						className="grid grid-cols-1 gap-4"
					>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<input
								type="text"
								name="name"
								placeholder="Your name"
								className="w-full px-4 py-3 rounded-lg bg-muted text-foreground border border-gray-700"
							/>
							<input
								type="email"
								name="email"
								placeholder="Your email"
								className="w-full px-4 py-3 rounded-lg bg-muted text-foreground border border-gray-700"
							/>
						</div>

						<textarea
							name="message"
							placeholder="Your message"
							rows={6}
							className="w-full px-4 py-3 rounded-lg bg-muted text-foreground border border-gray-700 resize-none"
							maxLength={300}
						/>
						<div className="flex justify-center">
							<button
								type="submit"
								className="block w-full sm:w-fit mx-auto px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-br from-primary to-primary-900 text-white font-semibold rounded-lg text-center transition-all duration-300 hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
							>
								Send Message
							</button>
						</div>
					</form>
				</section>
			</div>
		</main>
	);
}
