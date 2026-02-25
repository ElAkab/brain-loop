"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const container = {
	hidden: {},
	show: {
		transition: { staggerChildren: 0.12, delayChildren: 0.05 },
	},
};

const item = {
	hidden: { opacity: 0, y: 22 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as const },
	},
};

const cardContainer = {
	hidden: {},
	show: {
		transition: { staggerChildren: 0.1 },
	},
};

const cards = [
	{
		emoji: "📝",
		color: "bg-blue-100",
		title: "Take Notes",
		desc: "Organize your knowledge by categories",
	},
	{
		emoji: "🤖",
		color: "bg-purple-100",
		title: "AI Quizzes",
		desc: "Get personalized questions with a single click",
	},
	{
		emoji: "🧠",
		color: "bg-green-100",
		title: "Master It",
		desc: "Active recall for better retention",
	},
];

export default function HomePage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-gradient-to-b dark:from-gray-900 dark:to-gray-800">
			<motion.div
				className="text-center max-w-4xl"
				variants={container}
				initial="hidden"
				animate="show"
			>
				{/* Logo + titre */}
				<motion.div
					className="relative w-fit mx-auto mb-4"
					variants={item}
				>
					<div className="flex items-center justify-center gap-1 pl-4">
						<span className="text-5xl md:text-6xl font-bold bg-gradient-to-tr dark:from-primary to-[#053f61] bg-clip-text text-transparent">
							Echoflow
						</span>
						<img
							src="/images/echoflow_logo.png"
							alt="Echoflow Logo"
							className="h-24 w-24"
						/>
					</div>
					<div className="flex justify-center md:contents">
						<Badge className="md:absolute md:-top-8 md:-right-3 md:z-10 px-4 -mt-2 py-0.5 text-[12px] tracking-widest font-semibold bg-primary/10 text-primary border border-primary/30 dark:bg-primary/20 dark:border-primary/40 hover:bg-primary/10">
							BETA
						</Badge>
					</div>
				</motion.div>

				{/* Accroche */}
				<motion.p
					className="text-xl md:text-2xl text-gray-400 mb-4"
					variants={item}
				>
					AI-Powered Learning Through Active Recall
				</motion.p>

				{/* Description */}
				<motion.p
					className="text-gray-400 mb-12 max-w-2xl mx-auto"
					variants={item}
				>
					Transform your notes into interactive quizzes. Master any subject with
					the power of AI.
				</motion.p>

				{/* CTA */}
				<motion.div
					className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
					variants={item}
				>
					<Link
						href="/auth/login"
						className="px-8 py-4 bg-gradient-to-br from-primary to-[#053f61] text-white font-semibold rounded-lg hover:-translate-y-0.5 transition-all shadow-lg hover:shadow-xl transform"
					>
						Get Started
					</Link>

					<Link
						href="/learn-more"
						className="px-8 py-4 text-primary font-semibold rounded-lg border-2 border-primary hover:bg-primary/20 hover:text-white transition-all"
					>
						Learn More
					</Link>
				</motion.div>

				{/* Cartes — stagger interne */}
				<motion.div
					className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
					variants={cardContainer}
				>
					{cards.map(({ emoji, color, title, desc }) => (
						<motion.div
							key={title}
							className="p-6 rounded-xl shadow-md hover:shadow-lg transition"
							variants={item}
						>
							<div
								className={`w-12 h-12 ${color} rounded-full flex items-center justify-center mb-4 mx-auto`}
							>
								<span className="text-2xl">{emoji}</span>
							</div>
							<h3 className="font-bold mb-2 text-lg">{title}</h3>
							<p className="text-sm text-gray-400">{desc}</p>
						</motion.div>
					))}
				</motion.div>
			</motion.div>
		</main>
	);
}
