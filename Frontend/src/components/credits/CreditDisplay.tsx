"use client";

import { useState, useEffect } from "react";
import { Coins, Plus, Infinity, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface CreditInfo {
	balance: number;
	total_purchased: number;
	total_consumed: number;
	free_quota: number;
	free_used: number;
	free_remaining: number;
	has_byok: boolean;
	total_available: number;
}

interface CreditDisplayProps {
	variant?: "compact" | "full";
}

export function CreditDisplay({ variant = "compact" }: CreditDisplayProps) {
	const [info, setInfo] = useState<CreditInfo | null>(null);
	const [loading, setLoading] = useState(true);
	
	useEffect(() => {
		fetchCreditInfo();
	}, []);
	
	const fetchCreditInfo = async () => {
		try {
			const res = await fetch("/api/credits");
			if (res.ok) {
				const data = await res.json();
				setInfo(data);
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
	
	if (!info) return null;
	
	// Affichage principal
	const displayValue = info.has_byok 
		? "∞" 
		: info.balance > 0 
			? info.balance 
			: info.free_remaining;
	
	const isFreeQuota = !info.has_byok && info.balance === 0 && info.free_remaining > 0;
	const isEmpty = !info.has_byok && info.balance === 0 && info.free_remaining === 0;
	const isLow = !info.has_byok && info.balance > 0 && info.balance <= 5;
	
	if (variant === "compact") {
		return (
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className={`gap-2 ${isLow ? "text-yellow-500" : ""} ${isEmpty ? "text-destructive" : ""}`}
					>
						{info.has_byok ? (
							<Infinity className="h-4 w-4" />
						) : isFreeQuota ? (
							<Gift className="h-4 w-4 text-green-500" />
						) : (
							<Coins className="h-4 w-4" />
						)}
						<span className="font-medium">{displayValue}</span>
						{isFreeQuota && (
							<span className="text-xs text-muted-foreground">/jour</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-80" align="end">
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

function CreditPopoverContent({ info }: { info: CreditInfo }) {
	const displayValue = info.has_byok 
		? "∞" 
		: info.balance > 0 
			? info.balance 
			: info.free_remaining;
	
	const isFreeQuota = !info.has_byok && info.balance === 0 && info.free_remaining > 0;
	const isEmpty = !info.has_byok && info.balance === 0 && info.free_remaining === 0;
	const isLow = !info.has_byok && info.balance > 0 && info.balance <= 5;
	
	return (
		<div className="space-y-4">
			{/* Header avec solde principal */}
			<div className="flex items-center gap-3">
				<div className={`p-2 rounded-full ${
					info.has_byok ? "bg-primary/10" :
					isEmpty ? "bg-destructive/10" : 
					isFreeQuota ? "bg-green-500/10" :
					isLow ? "bg-yellow-500/10" : "bg-primary/10"
				}`}>
					{info.has_byok ? (
						<Infinity className="h-5 w-5 text-primary" />
					) : isFreeQuota ? (
						<Gift className="h-5 w-5 text-green-500" />
					) : (
						<Coins className={`h-5 w-5 ${
							isEmpty ? "text-destructive" : 
							isLow ? "text-yellow-500" : "text-primary"
						}`} />
					)}
				</div>
				<div className="flex-1">
					<p className="text-sm font-medium">
						{info.has_byok ? "Questions illimitées" : "Study Questions"}
					</p>
					<p className="text-2xl font-bold">
						{displayValue}
						{isFreeQuota && (
							<span className="text-sm font-normal text-muted-foreground ml-1">
								gratuites aujourd'hui
							</span>
						)}
					</p>
				</div>
			</div>
			
			{/* Détails */}
			{!info.has_byok && (
				<>
					<Separator />
					
					<div className="space-y-2 text-sm">
						{/* Crédits achetés */}
						<div className="flex justify-between">
							<span className="text-muted-foreground">Crédits achetés</span>
							<span className="font-medium">{info.balance}</span>
						</div>
						
						{/* Quota gratuit */}
						<div className="flex justify-between">
							<span className="text-muted-foreground">Gratuit aujourd'hui</span>
							<span className="font-medium">
								{info.free_remaining} / {info.free_quota}
							</span>
						</div>
					</div>
					
					{/* Messages d'alerte */}
					{isEmpty && (
						<p className="text-sm text-destructive">
							Vous avez utilisé toutes vos questions gratuites !
							Achetez des crédits pour continuer.
						</p>
					)}
					
					{isFreeQuota && (
						<p className="text-sm text-green-600">
							🎁 {info.free_remaining} questions gratuites restantes aujourd'hui.
							À minuit, vous aurez à nouveau {info.free_quota}.
						</p>
					)}
					
					{isLow && (
						<p className="text-sm text-yellow-500">
							⚠️ Plus que {info.balance} crédits ! Pensez à recharger.
						</p>
					)}
				</>
			)}
			
			{/* BYOK info */}
			{info.has_byok && (
				<p className="text-sm text-muted-foreground">
					Vous utilisez votre propre clé OpenRouter.
					Aucun crédit n'est consommé.
				</p>
			)}
			
			<Button className="w-full gap-2" asChild>
				<a href="/payment">
					<Plus className="h-4 w-4" />
					{info.has_byok ? "Voir les offres" : "Acheter des questions"}
				</a>
			</Button>
		</div>
	);
}
