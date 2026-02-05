'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface TokenWarningProps {
  /**
   * Type d'erreur rencontrée
   */
  errorType?: 'quota_exhausted' | 'rate_limit' | 'no_models_available' | 'generic';
  
  /**
   * Message personnalisé à afficher (optionnel)
   */
  customMessage?: string;
  
  /**
   * URL de redirection pour la page premium (par défaut: /pricing)
   */
  premiumUrl?: string;
  
  /**
   * Callback appelé lors du clic sur "Réessayer plus tard"
   */
  onRetryLater?: () => void;
  
  /**
   * Afficher le composant en mode modal (plus compact)
   */
  variant?: 'card' | 'inline';
}

const ERROR_MESSAGES = {
  quota_exhausted: {
    title: 'Quota gratuit épuisé',
    description: 'Tous les modèles gratuits ont atteint leur limite. Réessayez dans quelques minutes ou passez au plan premium pour un accès illimité.',
    icon: AlertTriangle,
  },
  rate_limit: {
    title: 'Limite de fréquence atteinte',
    description: 'Vous avez effectué trop de requêtes. Veuillez patienter quelques instants avant de réessayer.',
    icon: Clock,
  },
  no_models_available: {
    title: 'Aucun modèle disponible',
    description: 'Aucun modèle IA gratuit n\'est actuellement disponible. Réessayez plus tard ou passez premium pour un accès prioritaire.',
    icon: AlertTriangle,
  },
  generic: {
    title: 'Service temporairement indisponible',
    description: 'Une erreur s\'est produite. Veuillez réessayer dans quelques instants.',
    icon: AlertTriangle,
  },
};

export function TokenWarning({
  errorType = 'quota_exhausted',
  customMessage,
  premiumUrl = '/pricing',
  onRetryLater,
  variant = 'card',
}: TokenWarningProps) {
  const router = useRouter();
  const errorConfig = ERROR_MESSAGES[errorType];
  const Icon = errorConfig.icon;

  const handleRetryLater = () => {
    if (onRetryLater) {
      onRetryLater();
    } else {
      // Par défaut, fermer le composant ou rafraîchir
      window.location.reload();
    }
  };

  const handleUpgradeToPremium = () => {
    router.push(premiumUrl);
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <Icon className="h-5 w-5 text-yellow-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-500">{errorConfig.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {customMessage || errorConfig.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryLater}
          >
            <Clock className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
          <Button
            size="sm"
            onClick={handleUpgradeToPremium}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Crown className="h-4 w-4 mr-2" />
            Premium
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto border-yellow-500/20 bg-yellow-500/5">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-yellow-500" />
        </div>
        <CardTitle className="text-yellow-500">{errorConfig.title}</CardTitle>
        <CardDescription className="text-base">
          {customMessage || errorConfig.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-2">💡 Astuce :</p>
          <ul className="space-y-1 text-xs">
            <li>• Les quotas gratuits se rechargent automatiquement</li>
            <li>• Le plan premium offre un accès illimité et prioritaire</li>
            <li>• Vos notes et catégories sont sauvegardées</li>
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleRetryLater}
        >
          <Clock className="h-4 w-4 mr-2" />
          Réessayer plus tard
        </Button>
        <Button
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          onClick={handleUpgradeToPremium}
        >
          <Crown className="h-4 w-4 mr-2" />
          Devenir membre premium
        </Button>
      </CardFooter>
    </Card>
  );
}
