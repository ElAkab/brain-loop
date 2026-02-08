"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export default function NavLink({
  href,
  children,
}: React.PropsWithChildren<{ href: string }>) {
  const pathname = usePathname() || "/";
  const isActive = pathname === href || pathname.startsWith(href + "/");

  const base = "text-sm transition-colors";
  const activeClass = "text-primary font-semibold";
  const inactiveClass = "text-gray-400 hover:text-primary";

  return (
    <Link href={href} className={`${base} ${isActive ? activeClass : inactiveClass}`}>
      {children}
    </Link>
  );
}
