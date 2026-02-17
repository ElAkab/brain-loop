"use client";

import { useState } from "react";
import { Coins, Check, Sparkles, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditDisplay } from "@/components/credits/CreditDisplay";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CREDIT_PACKS = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 50,
    price: 5,
    description: "Parfait pour démarrer",
    icon: Zap,
    popular: false,
  },
  {
    id: "popular",
    name: "Popular Pack",
    credits: 120,
    price: 10,
    description: "20% de bonus inclus",
    icon: Sparkles,
    popular: true,
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 300,
    price: 20,
    description: "Meilleur rapport qualité/prix",
    icon: Crown,
    popular: false,
  },
];

export default function PaymentPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (packId: string) => {
    setLoading(packId);
    
    try {
      const response = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: packId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        alert("Erreur lors de la création du paiement. Veuillez réessayer.");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Acheter des Study Questions</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Les crédits vous permettent de générer des quizzes IA sans limite.
          <br />
          1 crédit = 1 quiz généré.
        </p>
        <div className="flex justify-center">
          <CreditDisplay variant="full" />
        </div>
      </div>

      <Separator />

      {/* Packs */}
      <div className="grid gap-6 md:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <Card
            key={pack.id}
            className={`relative flex flex-col ${
              pack.popular ? "border-primary shadow-lg" : ""
            }`}
          >
            {pack.popular && (
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                Le plus populaire
              </Badge>
            )}
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <pack.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{pack.name}</CardTitle>
              </div>
              <CardDescription>{pack.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold">{pack.credits}</div>
                <div className="text-sm text-muted-foreground">questions</div>
                <div className="text-2xl font-semibold text-primary">
                  {pack.price}€
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                variant={pack.popular ? "default" : "outline"}
                onClick={() => handlePurchase(pack.id)}
                disabled={loading === pack.id}
              >
                {loading === pack.id ? (
                  "Chargement..."
                ) : (
                  <>
                    <Coins className="mr-2 h-4 w-4" />
                    Acheter
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* FAQ / Info */}
      <div className="bg-muted rounded-lg p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          Comment ça marche ?
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Chaque crédit vous permet de générer 1 quiz IA</li>
          <li>• Les crédits n'expirent jamais</li>
          <li>• Paiement sécurisé via Stripe</li>
          <li>• Reçu par email après achat</li>
          <li>• Vous pouvez aussi utiliser votre propre clé OpenRouter (BYOK) gratuitement</li>
        </ul>
      </div>
    </div>
  );
}
