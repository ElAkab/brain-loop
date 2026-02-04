import React from "react";
import type { Metadata } from "next";
// Local fallback AppShell while "@/components/layout/AppShell" is not available.
// Replace this with the real AppShell import when the component exists.
import "../globals.css";

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return <div className="min-h-screen flex flex-col">{children}</div>;
};

export const metadata: Metadata = {
	title: "Dashboard - Brain Loop",
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
					<div className="h-full flex items-center justify-center">
						Loading...
					</div>
				}
			>
				{children}
			</React.Suspense>
		</AppShell>
	);
}
