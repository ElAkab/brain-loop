import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Payment route guard.
 *
 * Access is restricted to emails listed in PAYMENT_ALLOWED_EMAILS
 * (comma-separated server-side env var). All other authenticated users
 * are redirected to /dashboard, and unauthenticated users to /login.
 *
 * To grant yourself access, set in your .env.local:
 *   PAYMENT_ALLOWED_EMAILS=you@example.com
 */
export default async function PaymentLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const allowedRaw = process.env.PAYMENT_ALLOWED_EMAILS ?? "";
	const allowed = allowedRaw
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);

	// If the allowlist is populated, enforce it
	if (allowed.length > 0) {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			redirect("/login");
		}

		if (!allowed.includes(user.email?.toLowerCase() ?? "")) {
			redirect("/dashboard");
		}
	}

	return <AppShell>{children}</AppShell>;
}
