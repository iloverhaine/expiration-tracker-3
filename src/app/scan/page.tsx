"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { expirationRecordsService } from "@/lib/db";
import type { ExpirationRecord } from "@/types";

export default function ScanPage() {
  const router = useRouter();

  const [barcode, setBarcode] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔒 Prevent double execution
  const isHandlingRef = useRef(false);

  /* ---------------------------------------------
     Lookup existing item by barcode + expiration
  ----------------------------------------------*/
  const findExistingItem = async (
    code: string,
    expDate: Date
  ): Promise<ExpirationRecord | undefined> => {
    const items = await expirationRecordsService.getAll();
    return items.find(
      (item) =>
        item.barcode === code &&
        item.expirationDate.toDateString() === expDate.toDateString()
    );
  };

  /* ---------------------------------------------
     Create item safely
  ----------------------------------------------*/
  const saveItem = async () => {
    if (processing || isHandlingRef.current) return;
    if (!barcode || barcode.length !== 12 || !expirationDate) return;

    isHandlingRef.current = true;
    setProcessing(true);
    setError(null);

    try {
      const expDate = new Date(expirationDate);

      // 🔍 Check if SAME product with SAME expiration exists
      const existing = await findExistingItem(barcode, expDate);

      if (existing) {
        router.push(`/item/${existing.id}`);
        return;
      }

      // ➕ Create NEW item (same barcode allowed)
      const newItem = await expirationRecordsService.add({
        itemName: "Scanned Item",
        description: "Auto-created from barcode",
        barcode,
        quantity: 1,
        expirationDate: expDate,
      });

      router.push(`/item/${newItem.id}`);
    } catch (err) {
      console.error(err);
      setError("Failed to save item.");
      setProcessing(false);
      isHandlingRef.current = false;
    }
  };

  /* ---------------------------------------------
     Auto save when ready
  ----------------------------------------------*/
  useEffect(() => {
    if (barcode.length === 12 && expirationDate) {
      saveItem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode, expirationDate]);

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
          Scan Product
        </h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Barcode Scanner */}
        <BarcodeScanner
          isActive={!processing}
          onToggle={() => {}}
          onScanSuccess={(code) => setBarcode(code)}
        />

        {/* Manual Entry */}
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Barcode (12 digits)"
              value={barcode}
              onChange={(e) =>
                setBarcode(
                  e.target.value.replace(/\D/g, "").slice(0, 12)
                )
              }
              disabled={processing}
            />

            <Input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              disabled={processing}
            />

            {processing && (
              <p className="text-sm text-blue-600">
                Saving product…
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
          Same barcode allowed • Different expiration dates tracked separately
        </p>
      </div>
    </div>
  );
}
