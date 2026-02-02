export default function HomePage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-gradient-to-b from-white to-blue-50">
			<div className="text-center max-w-4xl">
				<h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					Brain Loop
				</h1>

				<p className="text-xl md:text-2xl text-gray-600 mb-4">
					AI-Powered Learning Through Active Recall
				</p>

				<p className="text-gray-500 mb-12 max-w-2xl mx-auto">
					Transform your notes into interactive quizzes. Master any subject with
					the power of AI.
				</p>

				<div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
					<a
						href="/auth/login"
						className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
					>
						Get Started
					</a>

					<a
						href="#features"
						className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-all"
					>
						Learn More
					</a>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
					<div className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition">
						<div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
							<span className="text-2xl">📝</span>
						</div>
						<h3 className="font-bold mb-2 text-lg">Take Notes</h3>
						<p className="text-sm text-gray-600">
							Organize your knowledge by categories
						</p>
					</div>

					<div className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition">
						<div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 mx-auto">
							<span className="text-2xl">🤖</span>
						</div>
						<h3 className="font-bold mb-2 text-lg">AI Quizzes</h3>
						<p className="text-sm text-gray-600">
							Get personalized questions instantly
						</p>
					</div>

					<div className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition">
						<div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto">
							<span className="text-2xl">🧠</span>
						</div>
						<h3 className="font-bold mb-2 text-lg">Master It</h3>
						<p className="text-sm text-gray-600">
							Active recall for better retention
						</p>
					</div>
				</div>
			</div>
		</main>
	);
}
