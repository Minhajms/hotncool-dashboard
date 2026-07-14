import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { getLastUpdated } from "@/lib/data";
import { formatQatar } from "@/lib/dates";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hot N Cool — Growth Dashboard",
  description: "App growth dashboard for Hot N Cool (Qatar).",
};

// Always render fresh (data changes daily; never serve a stale cache).
export const dynamic = "force-dynamic";

async function LastUpdated() {
  let stamp: string | null = null;
  try {
    stamp = await getLastUpdated();
  } catch {
    stamp = null;
  }
  return (
    <span className="text-xs text-[var(--muted)]">
      Last updated: <span className="font-medium">{formatQatar(stamp)}</span>
      <span className="ml-1 opacity-70">(Qatar time)</span>
    </span>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--hot), var(--cool))",
                }}
              >
                HC
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">
                  Hot N Cool
                </p>
                <p className="text-[11px] leading-tight text-[var(--muted)]">
                  App Growth Dashboard
                </p>
              </div>
            </div>
            <Nav />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6">
          {children}
        </main>

        <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <LastUpdated />
            <span className="text-xs text-[var(--muted)]">
              Currency: QAR · Weeks: Thu–Wed
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
