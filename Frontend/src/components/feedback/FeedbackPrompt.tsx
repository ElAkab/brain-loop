"use client";

import React, { useState } from "react";
import { useFeedbackStore } from "@/lib/store/feedback-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export function FeedbackPrompt() {
	const { isOpen, closeFeedback } = useFeedbackStore();
	const [rating, setRating] = useState<
		"helpful" | "neutral" | "not_helpful" | null
	>(null);
	const [comment, setComment] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const handleSubmit = async () => {
		try {
			await fetch("/api/feedback", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					rating,
					comment,
				}),
			});

			setSubmitted(true);
			setTimeout(() => {
				closeFeedback();
				// Reset state after closing animation
				setTimeout(() => {
					setSubmitted(false);
					setRating(null);
					setComment("");
				}, 500);
			}, 2000);
		} catch (error) {
			console.error("Failed to submit feedback:", error);
		}
	};

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0, y: 50, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 20, scale: 0.95 }}
					className="fixed bottom-6 right-6 z-50 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
				>
					<div className="relative p-4">
						<Button
							variant="ghost"
							size="icon-xs"
							className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
							onClick={closeFeedback}
						>
							<X className="h-4 w-4" />
						</Button>

						{!submitted ? (
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<div className="flex-shrink-0">
										{/* Placeholder for your avatar */}
										<div className="h-10 w-10 rounded-full bg-primary/10 overflow-hidden border border-border flex items-center justify-center">
											<img
												src="/images/akab-logo.png"
												alt="Adam's Avatar"
												className="h-full w-full object-cover"
											/>
										</div>
									</div>
									<div className="space-y-1">
										<h3 className="font-semibold text-sm pt-0.5">
											How was your session?
										</h3>
										<p className="text-xs text-muted-foreground leading-tight">
											I'd love to hear your thoughts to help improve the
											experience.
										</p>
									</div>
								</div>

								<div className="flex justify-between gap-2 px-[3]">
									<Button
										variant={rating === "helpful" ? "default" : "outline"}
										size="sm"
										className="flex-1 text-xs gap-1.5 cursor-pointer dark:hover:text-primary"
										onClick={() => setRating("helpful")}
									>
										<ThumbsUp className="h-3 w-3" />
										Helpful
									</Button>
									<Button
										variant={rating === "neutral" ? "default" : "outline"}
										size="sm"
										className="flex-1 text-xs gap-1.5 cursor-pointer dark:hover:text-primary"
										onClick={() => setRating("neutral")}
									>
										<Minus className="h-3 w-3" />
										Neutral
									</Button>
									<Button
										variant={rating === "not_helpful" ? "default" : "outline"}
										size="sm"
										className="flex-1 text-xs gap-1.5 cursor-pointer dark:hover:text-primary"
										onClick={() => setRating("not_helpful")}
									>
										<ThumbsDown className="h-3 w-3" />
										Bad
									</Button>
								</div>

								<AnimatePresence>
									{rating && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: "auto" }}
											className="space-y-3"
										>
											<Textarea
												placeholder="Any other issues or feedback? (Optional)"
												className="text-xs resize-none min-h-[60px]"
												value={comment}
												onChange={(e) => setComment(e.target.value)}
											/>
											<Button
												size="sm"
												className="w-full cursor-pointer"
												onClick={handleSubmit}
											>
												Submit Feedback
											</Button>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center py-6 space-y-2 text-center">
								<div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
									<ThumbsUp className="h-4 w-4" />
								</div>
								<div>
									<h3 className="font-medium text-sm">Thank you!</h3>
									<p className="text-xs text-muted-foreground">
										Your feedback helps us grow.
									</p>
								</div>
							</div>
						)}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
