import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OpenRouterKeyCard } from '@/components/settings/OpenRouterKeyCard';
import { SubscriptionCard } from '@/components/settings/SubscriptionCard';

type SettingsPageProps = {
	searchParams: Promise<{
		section?: string;
	}>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const resolvedSearchParams = await searchParams;
  const showAiKeyFocus = resolvedSearchParams.section === 'ai-key';

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Account Information */}
      <div className="rounded-lg border p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Account Information</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your account details.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm font-medium">Email</span>
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm font-medium">User ID</span>
            <span className="text-sm text-muted-foreground font-mono">{user.id}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm font-medium">Provider</span>
            <span className="text-sm text-muted-foreground capitalize">
              {user.app_metadata.provider || 'email'}
            </span>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <SubscriptionCard />

      {/* BYOK Key */}
      <div
        id="ai-key"
        className={`rounded-lg border p-2 ${showAiKeyFocus ? 'border-primary/60 ring-1 ring-primary/40' : ''}`}
      >
        <OpenRouterKeyCard autoFocusInput={showAiKeyFocus} />
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/50 p-6">
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Advanced settings. Use with caution.
        </p>
      </div>
    </div>
  );
}
