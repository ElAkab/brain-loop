// This file defines the layout for all protected routes in the application. It wraps the content in an AppShell component that includes the header and sidebar, and provides a consistent layout for all authenticated pages.

import React from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { FeedbackPrompt } from "@/components/feedback/FeedbackPrompt";
import "../globals.css";

export const metadata: Metadata = {
	title: "Dashboard - Echoflow",
	description: "Manage your learning with AI-powered active recall",
};

export default function ProtectedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<AppShell>
			<React.Suspense
				fallback={
					<div className="space-y-6 animate-pulse p-4 md:p-8">
						<div className="h-8 bg-muted rounded w-48" />
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="h-28 bg-muted rounded-xl" />
							))}
						</div>
					</div>
				}
			>
				{children}
			</React.Suspense>
			<FeedbackPrompt />
		</AppShell>
	);
}
