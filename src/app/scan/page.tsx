"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { expirationRecordsService } from "@/lib/db";

export default function ScanPage() {
  const router = useRouter();

  const [barcode, setBarcode] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------
     AUTO CREATE ITEM WHEN BARCODE IS READY
  ----------------------------------------------*/
  useEffect(() => {
    if (!barcode) return;

    if (barcode.length === 12) {
      createItem(barcode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode]);

  /* ---------------------------------------------
     CREATE ITEM & REDIRECT
  ----------------------------------------------*/
  const createItem = async (barcodeValue: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const newItem = await expirationRecordsService.add({
        itemName: "Scanned Item",
        description: "Auto-created from barcode scan",
        barcode: barcodeValue,
        quantity: 1,
        expirationDate: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 30 // +30 days
        ),
      });

      router.push(`/item/${newItem.id}`);
    } catch (err) {
      console.error(err);
      setError("Failed to create item.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4 flex items-center">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="ml-4 text-lg font-semibold">
          Scan Barcode
        </h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Barcode Scanner */}
        <BarcodeScanner
          isActive={isCameraActive}
          onToggle={() => setIsCameraActive(!isCameraActive)}
          onScanSuccess={(code) => {
            setBarcode(code); // already trimmed to 12 digits
            setIsCameraActive(false);
          }}
        />

        {/* Manual Entry Fallback */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Manual Barcode Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Enter barcode (12 digits)"
              value={barcode}
              onChange={(e) =>
                setBarcode(
                  e.target.value.replace(/\D/g, "").slice(0, 12)
                )
              }
              disabled={isProcessing}
            />

            {isProcessing && (
              <p className="text-sm text-blue-600">
                Creating item...
              </p>
            )}

            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-gray-500 text-center">
          Any barcode supported • First 12 digits are used
        </p>
      </div>
    </div>
  );
}
