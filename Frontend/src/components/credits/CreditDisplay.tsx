"use client";

import { useEffect } from "react";
import { Coins, Plus, Infinity, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useCreditsStore, type CreditInfo } from "@/lib/store/credits-store";

interface CreditDisplayProps {
	variant?: "compact" | "full";
}

export function CreditDisplay({ variant = "compact" }: CreditDisplayProps) {
	const { info, isLoading, fetchCredits, refreshCredits } = useCreditsStore();

	// Initial load
	useEffect(() => {
		fetchCredits();
	}, [fetchCredits]);

	// Refresh when the user returns to the tab after a quiz session
	useEffect(() => {
		const handleVisibility = () => {
			if (!document.hidden) refreshCredits();
		};
		document.addEventListener("visibilitychange", handleVisibility);
		return () => document.removeEventListener("visibilitychange", handleVisibility);
	}, [refreshCredits]);

	if (isLoading) {
		return (
			<Button variant="ghost" size="sm" disabled className="gap-2">
				<Coins className="h-4 w-4" />
				<span>...</span>
			</Button>
		);
	}

	if (!info) return null;

	if (variant === "compact") {
		return (
			<Popover>
				<PopoverTrigger asChild>
					<CompactTrigger info={info} />
				</PopoverTrigger>
				<PopoverContent className="w-72" align="end">
					<CreditPopoverContent info={info} />
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<div className="p-4 rounded-lg border bg-card">
			<CreditPopoverContent info={info} />
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────

function CompactTrigger({ info }: { info: CreditInfo }) {
	const isEmpty = !info.has_byok && info.total_available === 0;
	const isLow = !info.has_byok && info.credits > 0 && info.credits <= 5;
	const isFreeOnly = !info.has_byok && info.credits === 0 && info.free_remaining > 0;

	const displayValue = info.has_byok
		? "∞"
		: info.credits > 0
			? info.credits
			: info.free_remaining;

	return (
		<Button
			variant="ghost"
			size="sm"
			className={`gap-2 ${isLow ? "text-yellow-500" : ""} ${isEmpty ? "text-destructive" : ""}`}
		>
			{info.has_byok ? (
				<Infinity className="h-4 w-4" />
			) : isFreeOnly ? (
				<Gift className="h-4 w-4 text-green-500" />
			) : (
				<Coins className={`h-4 w-4 ${isEmpty ? "text-destructive" : isLow ? "text-yellow-500" : ""}`} />
			)}
			<span className="font-medium">{displayValue}</span>
			{isFreeOnly && (
				<span className="text-xs text-muted-foreground">/day</span>
			)}
		</Button>
	);
}

function CreditPopoverContent({ info }: { info: CreditInfo }) {
	const isEmpty = !info.has_byok && info.total_available === 0;
	const isLow = !info.has_byok && info.credits > 0 && info.credits <= 5;
	const isFreeOnly = !info.has_byok && info.credits === 0 && info.free_remaining > 0;

	const displayValue = info.has_byok
		? "∞"
		: info.credits > 0
			? info.credits
			: info.free_remaining;

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div
					className={`p-2 rounded-full ${
						info.has_byok
							? "bg-primary/10"
							: isEmpty
								? "bg-destructive/10"
								: isFreeOnly
									? "bg-green-500/10"
									: isLow
										? "bg-yellow-500/10"
										: "bg-primary/10"
					}`}
				>
					{info.has_byok ? (
						<Infinity className="h-5 w-5 text-primary" />
					) : isFreeOnly ? (
						<Gift className="h-5 w-5 text-green-500" />
					) : (
						<Coins
							className={`h-5 w-5 ${isEmpty ? "text-destructive" : isLow ? "text-yellow-500" : "text-primary"}`}
						/>
					)}
				</div>
				<div className="flex-1">
					<p className="text-sm font-medium">
						{info.has_byok ? "Unlimited Questions" : "Study Questions"}
					</p>
					<p className="text-2xl font-bold">
						{displayValue}
						{isFreeOnly && (
							<span className="text-sm font-normal text-muted-foreground ml-1">
								free today
							</span>
						)}
					</p>
				</div>
			</div>

			{/* Details */}
			{!info.has_byok && (
				<>
					<Separator />
					<div className="space-y-2 text-sm">
						{info.credits > 0 && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">Purchased Credits</span>
								<span className="font-medium">{info.credits}</span>
							</div>
						)}
						<div className="flex justify-between">
							<span className="text-muted-foreground">Free Today</span>
							<span className="font-medium">
								{info.free_remaining} / {info.free_quota}
							</span>
						</div>
					</div>

					{isEmpty && (
						<p className="text-sm text-destructive">
							No credits left today. Buy credits or wait until midnight for your daily free quota.
						</p>
					)}
					{isFreeOnly && (
						<p className="text-sm text-green-600">
							🎁 {info.free_remaining} free questions remaining today.
						</p>
					)}
					{isLow && (
						<p className="text-sm text-yellow-500">
							⚠️ Only {info.credits} premium credits left.
						</p>
					)}
				</>
			)}

			{info.has_byok && (
				<p className="text-sm text-muted-foreground">
					Using your own OpenRouter key — no platform credits consumed.
				</p>
			)}

			<Button className="w-full gap-2" asChild>
				<a href="/payment">
					<Plus className="h-4 w-4" />
					Buy Credits
				</a>
			</Button>
		</div>
	);
}
