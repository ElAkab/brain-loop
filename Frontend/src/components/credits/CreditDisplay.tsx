"use client";

import { useState, useEffect } from "react";
import { Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { formatCredits } from "@/lib/credits";

interface CreditDisplayProps {
	variant?: "compact" | "full";
}

export function CreditDisplay({ variant = "compact" }: CreditDisplayProps) {
	const [balance, setBalance] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	
	useEffect(() => {
		fetchBalance();
	}, []);
	
	const fetchBalance = async () => {
		try {
			const res = await fetch("/api/credits");
			if (res.ok) {
				const data = await res.json();
				setBalance(data.balance);
			}
		} catch (error) {
			console.error("Error fetching credits:", error);
		} finally {
			setLoading(false);
		}
	};
	
	if (loading) {
		return (
			<Button variant="ghost" size="sm" disabled className="gap-2">
				<Coins className="h-4 w-4" />
				<span>...</span>
			</Button>
		);
	}
	
	const displayBalance = balance ?? 0;
	const isLow = displayBalance > 0 && displayBalance <= 5;
	const isEmpty = displayBalance === 0;
	
	if (variant === "compact") {
		return (
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className={`gap-2 ${isLow ? "text-yellow-500" : ""} ${isEmpty ? "text-destructive" : ""}`}
					>
						<Coins className="h-4 w-4" />
						<span className="font-medium">{formatCredits(displayBalance)}</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-72" align="end">
					<CreditPopoverContent balance={displayBalance} isLow={isLow} isEmpty={isEmpty} />
				</PopoverContent>
			</Popover>
		);
	}
	
	return (
		<div className="p-4 rounded-lg border bg-card">
			<CreditPopoverContent balance={displayBalance} isLow={isLow} isEmpty={isEmpty} />
		</div>
	);
}

function CreditPopoverContent({
	balance,
	isLow,
	isEmpty,
}: {
	balance: number;
	isLow: boolean;
	isEmpty: boolean;
}) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<div className={`p-2 rounded-full ${isEmpty ? "bg-destructive/10" : isLow ? "bg-yellow-500/10" : "bg-primary/10"}`}>
					<Coins className={`h-5 w-5 ${isEmpty ? "text-destructive" : isLow ? "text-yellow-500" : "text-primary"}`} />
				</div>
				<div>
					<p className="text-sm font-medium">Study Questions</p>
					<p className="text-2xl font-bold">{balance === -1 ? "∞" : balance}</p>
				</div>
			</div>
			
			{isEmpty && (
				<p className="text-sm text-destructive">
					You&apos;re out of questions! Buy more to continue.
				</p>
			)}
			
			{isLow && (
				<p className="text-sm text-yellow-500">
					Running low! Consider buying more.
				</p>
			)}
			
			<Button className="w-full gap-2" asChild>
				<a href="/payment">
					<Plus className="h-4 w-4" />
					Buy More Questions
				</a>
			</Button>
			
			<p className="text-xs text-muted-foreground text-center">
				1 question = 1 AI-generated quiz
			</p>
		</div>
	);
}
