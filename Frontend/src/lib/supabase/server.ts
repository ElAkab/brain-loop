import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function createClient(request?: NextRequest) {
	// If a NextRequest is provided (API route), use its cookies store;
	// otherwise fall back to the server cookies() helper for Server Components.
	const cookieStore = request ? request.cookies : await cookies();

	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					// next's cookie stores expose getAll()
					return cookieStore.getAll();
				},
				setAll(
					cookiesToSet: Array<{ name: string; value: string; options?: any }>,
				) {
					try {
						// In API routes the incoming request cookie store is read-only; ignore set attempts.
						if (typeof (cookieStore as any).set === "function") {
							cookiesToSet.forEach(({ name, value, options }) =>
								(cookieStore as any).set(name, value, options),
							);
						}
					} catch {
						// ignore
					}
				},
			},
		},
	);
}
