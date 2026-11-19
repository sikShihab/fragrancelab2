import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { AppHeader } from "./components/AppHeader";
import { Logo } from "./components/Logo";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "FragranceLab: Know Your Scent. Know Your Deal.", template: "%s | FragranceLab" },
  description: "Discover, collect, compare and shop fragrances with personal collection intelligence.",
  icons: { icon: "/brand/fragrancelab-symbol.png", apple: "/brand/fragrancelab-symbol.png" },
  openGraph: { siteName: "FragranceLab", type: "website", images: ["/brand/fragrancelab-primary-white-bg.png"] },
};
export const viewport: Viewport = { themeColor: "#FAF9F6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <AppHeader />
        <main id="main">{children}</main>
        <footer className="border-t border-ink/10 px-5 py-12 sm:px-8">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-6 text-xs text-ink/60 md:flex-row md:items-center md:justify-between">
            <Logo compact />
            <div className="flex flex-wrap gap-5">
              <a href="/discover">Discover</a><a href="/collection">Collection</a><a href="/wishlist">Want to Buy</a><a href="/profile">Profile</a><a href="/settings">Settings</a>
            </div>
            <span>© 2026 FragranceLab</span>
          </div>
          <p className="mx-auto mt-6 max-w-[1320px] text-[11px] leading-5 text-ink/55">
            Catalog data derived from a Fragrantica dataset licensed CC BY-NC-SA 4.0 (non-commercial, share-alike). Not affiliated with Fragrantica or any brand shown.
          </p>
        </footer>
      </body>
    </html>
  );
}
