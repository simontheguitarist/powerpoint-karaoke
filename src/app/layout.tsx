import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getOptionalUser } from "@/lib/session";
import { HeaderUserMenu } from "@/components/HeaderUserMenu";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "PowerPoint Karaoke",
  description:
    "Improvise a talk over slides you've never seen. Then watch the audience score you.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getOptionalUser();

  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <header className="sticky top-0 z-40 backdrop-blur-md bg-canvas/70 border-b">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="relative inline-block size-7 rounded-lg bg-ink overflow-hidden">
                <span className="absolute inset-1 rounded bg-flame" />
                <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-canvas" />
              </span>
              <span className="display text-2xl">PowerPoint Karaoke</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm">
              <Link
                href="/library"
                className="px-3 py-2 rounded-full hover:bg-canvas-2"
              >
                Library
              </Link>
              <Link
                href="/play"
                className="px-3 py-2 rounded-full hover:bg-canvas-2"
              >
                Play
              </Link>
              {user && (
                <Link
                  href="/studio"
                  className="px-3 py-2 rounded-full hover:bg-canvas-2"
                >
                  Studio
                </Link>
              )}
            </nav>
            <HeaderUserMenu
              user={user ? { name: user.name, email: user.email } : null}
            />
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t mt-24">
          <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-mute">
            <span>
              Built for friends who like to talk fast about slides they&apos;ve
              never seen.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
