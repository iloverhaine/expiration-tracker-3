import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Expiration Tracker",
  description: "Track product expirations with barcode scanning and notifications",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
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
  <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
    
    {/* Author Header */}
    <div className="border-b px-4 py-3 text-center text-sm text-gray-500">
      Built by <span className="font-semibold text-gray-800">iloverhaine</span>
    </div>

    {children}
  </div>
</body>

    </html>
  );
}