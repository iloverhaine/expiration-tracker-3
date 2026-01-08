"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings, ArrowLeft } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Show back button on all pages EXCEPT home
  const showBackButton = pathname !== "/";

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg flex flex-col">

          {/* ===== HEADER ===== */}
          <header className="sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showBackButton && (
                <button
                  onClick={() => router.back()}
                  className="p-1 rounded hover:bg-gray-100"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}

              <span className="text-lg font-bold">
                Expiration Tracker
              </span>
            </div>

            <Link
              href="/settings"
              className="p-1 rounded hover:bg-gray-100"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </header>

          {/* ===== FOOTER LABEL ===== */}
          <div className="text-xs text-center text-gray-500 py-2 border-b">
            Built by <span className="font-medium">iloverhaine</span>
          </div>

          {/* ===== PAGE CONTENT ===== */}
          <main className="flex-1">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}
