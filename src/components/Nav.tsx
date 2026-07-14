"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/trends", label: "Trends" },
  { href: "/meta", label: "Meta Ads" },
  { href: "/arr", label: "ARR" },
  { href: "/upload", label: "Upload" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1">
      {LINKS.map((l) => {
        const active =
          l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={
              active
                ? { background: "var(--foreground)", color: "var(--surface)" }
                : { color: "var(--muted)" }
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
