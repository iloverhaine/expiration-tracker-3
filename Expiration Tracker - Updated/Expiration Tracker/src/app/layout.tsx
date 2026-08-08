"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings, ArrowLeft, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Button } from "@/components/ui/button";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Back button logic
  const showBackButton = pathname !== "/";

  // PWA install
  const { canInstall, promptInstall } = useInstallPrompt();

  // Offline indicator
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const updateStatus = () => setIsOffline(!navigator.onLine);

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

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

          {/* ===== OFFLINE INDICATOR ===== */}
          {isOffline && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-2 border-b">
              <WifiOff className="h-4 w-4" />
              You are offline. Changes will sync when online.
            </div>
          )}

          {/* ===== INSTALL APP BUTTON ===== */}
          {canInstall && (
            <div className="px-4 py-3 border-b bg-blue-50">
              <Button onClick={promptInstall} className="w-full">
                📱 Install App
              </Button>
            </div>
          )}

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
