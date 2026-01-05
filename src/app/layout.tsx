import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

/* ✅ Metadata (NO warnings) */
export const metadata: Metadata = {
  title: "Expiration Tracker",
  description: "Track product expirations with barcode scanning and notifications",
  manifest: "/manifest.json",
};

/* ✅ Viewport moved correctly */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>

      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg flex flex-col">

          {/* App Header */}
          <header className="border-b px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">Expiration Tracker</h1>
            <Link href="/settings">
              <Button variant="ghost" size="sm" aria-label="Settings">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </header>

          {/* Author Credit */}
          <div className="border-b px-4 py-2 text-center text-sm text-gray-500">
            Built by <span className="font-semibold text-gray-800">iloverhaine</span>
          </div>

          {/* Page Content */}
          <main className="flex-1">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}
