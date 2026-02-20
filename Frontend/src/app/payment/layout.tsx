import { AppShell } from "@/components/layout/AppShell";

export default function PaymentLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <AppShell>{children}</AppShell>;
}
