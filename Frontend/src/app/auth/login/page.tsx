"use client";

import { signInWithGoogle, signInWithEmail, signInWithDemo } from "@/lib/auth/actions";
import { useState } from "react";

export default function LoginPage() {
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleGoogleSignIn() {
		setLoading(true);
		await signInWithGoogle();
	}

	async function handleEmailSignIn(formData: FormData) {
		setLoading(true);
		const result = await signInWithEmail(formData);

		if (result.error) {
			setMessage(result.error);
		} else {
			setMessage(result.message || "Check your email!");
		}
		setLoading(false);
	}

	async function handleDemoSignIn() {
		setLoading(true);
		await signInWithDemo();
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 p-4">
			<div className="w-full max-w-md p-8 rounded-2xl shadow-xl">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
					<p className="text-gray-600">Sign in to continue learning</p>
					
					{/* Demo Account Notice */}
					<div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
						<p className="text-xs text-gray-300">
							🧪 <strong>Want to test without signing in?</strong>
							<br />
							Use demo account: <code className="text-primary font-mono">demo@brainloop.app</code>
						</p>
					</div>
				</div>

				{message && (
					<div
						className={`mb-4 p-4 rounded-lg ${
							message.includes("error") || message.includes("Error")
								? "bg-red-50 text-red-600"
								: "bg-green-50 text-green-600"
						}`}
					>
						{message}
					</div>
				)}

				<div className="space-y-4">
					<form action={handleGoogleSignIn}>
						<button
							type="submit"
							disabled={loading}
							className="w-full py-3 px-4 border-2 border-gray-700 rounded-lg hover:border-gray-600 transition cursor-pointer flex items-center justify-center gap-3 font-medium disabled:opacity-50"
						>
							<span>🔍</span>
							<span>Continue with Google</span>
						</button>
					</form>

					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-300"></div>
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="px-4 dark:bg-[#172130] text-gray-400">
								Or with email
							</span>
						</div>
					</div>

					<form action={handleEmailSignIn} className="space-y-4">
						<input
							type="email"
							name="email"
							required
							placeholder="your@email.com"
							className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
						/>

						<button
							type="submit"
							disabled={loading}
							className="w-full py-3 px-4 bg-linear-to-br from-primary to-primary-900 hover:-translate-y-0.5 cursor-pointer text-white font-semibold rounded-lg transition shadow-lg hover:shadow-xl disabled:opacity-50"
						>
							{loading ? "Sending..." : "Send Magic Link"}
						</button>
					</form>

					{/* Demo Account Button */}
					<form action={handleDemoSignIn}>
						<button
							type="submit"
							disabled={loading}
							className="w-full py-3 px-4 border-2 border-primary/50 bg-primary/5 rounded-lg hover:bg-primary/10 transition cursor-pointer flex items-center justify-center gap-2 font-medium disabled:opacity-50"
						>
							<span>🎮</span>
							<span>Try Demo Account</span>
						</button>
					</form>
				</div>

				<p className="text-center text-sm text-gray-500 mt-8">
					New to Brain Loop?{" "}
					<span className="text-primary font-medium">
						Just sign in - we'll create your account automatically!
					</span>
				</p>
			</div>
		</div>
	);
}
