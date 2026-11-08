import type { Metadata } from "next";
import Link from "next/link";
import { Figtree, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL?.trim() || "http://localhost:3000"), // makes the Open Graph image URL absolute
  title: { default: "Remit", template: "%s · Remit" },
  description: "An example app that sends money home across currencies with a clear quote and live delivery tracking, on the Nuvion sandbox. No real money moves.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("theme")||"system";if(t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}` }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* usePathname() reads the URL, so the header streams in behind a placeholder of the same height. */}
        <Suspense fallback={<div className="h-[57px] bg-band" />}>
          <SiteHeader />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="border-t px-4 py-8 text-center text-sm text-muted-foreground">
          <p className="mx-auto max-w-xl text-pretty">Independent demo. Sandbox only, no real transfers. Not financial advice. Not affiliated with or endorsed by Safaricom, MTN or any payment scheme.</p>
          <p className="mx-auto mt-2 max-w-xl text-pretty">Your API key is sealed in an encrypted cookie in this browser and expires after eight hours. <Link href="/privacy" className="underline underline-offset-4">Privacy</Link></p>
        </footer>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
