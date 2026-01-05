"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  expirationRecordsService,
  productDataService,
} from "@/lib/db";

export default function ScanPage() {
  const router = useRouter();

  const [barcode, setBarcode] = useState("");
  const [productName, setProductName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);

  const isHandlingRef = useRef(false);

  /* -------------------------------------------
     Lookup product by BARCODE or NAME
  --------------------------------------------*/
  const lookupProductName = async (query: string): Promise<string> => {
    if (!query.trim()) return "";

    const products = await productDataService.getAll();
    const normalized = query.toLowerCase();

    const found = products.find(
      (p) =>
        p.barcode === query ||
        p.itemName.toLowerCase().includes(normalized)
    );

    return found?.itemName ?? "";
  };

  /* -------------------------------------------
     Handle barcode scan from camera
  --------------------------------------------*/
  const handleScanSuccess = async (raw: string) => {
    if (isHandlingRef.current) return;
    isHandlingRef.current = true;

    try {
      setScannerActive(false);
      setBarcode(raw);

      const name = await lookupProductName(raw);
      setProductName(name);
    } finally {
      isHandlingRef.current = false;
    }
  };

  /* -------------------------------------------
     Manual lookup button
  --------------------------------------------*/
  const handleManualLookup = async () => {
    setLoading(true);
    setError(null);

    try {
      const name = await lookupProductName(barcode);
      setProductName(name || "Scanned Item");
    } catch (err) {
      console.error(err);
      setError("Lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------
     Save item
  --------------------------------------------*/
  const handleSave = async () => {
    if (!barcode.trim()) {
      setError("Barcode or name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const normalizedBarcode = barcode.replace(/\D/g, "").slice(0, 12);

      const id = await expirationRecordsService.create({
        barcode: normalizedBarcode || barcode,
        itemName: productName || "Scanned Item",
        description: "Created from scan",
        quantity: 1,
        expirationDate: new Date(),
        dateCreated: new Date(),
        notes: "",
      });

      router.push(`/edit-item/${id}`);
    } catch (err) {
      console.error(err);
      setError("Failed to save item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Scanner */}
      <BarcodeScanner
        isActive={scannerActive}
        onToggle={() => setScannerActive((v) => !v)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Manual Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Manual Entry
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Input
            placeholder="Enter barcode or product name..."
            value={barcode}
            onChange={async (e) => {
              const value = e.target.value;
              setBarcode(value);

              const name = await lookupProductName(value);
              setProductName(name);
            }}
          />

          {productName && (
            <p className="text-sm text-green-700">
              Product: <strong>{productName}</strong>
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleManualLookup}
              disabled={loading}
            >
              Lookup Product
            </Button>

            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={loading}
            >
              Save Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Supported Types */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">Supported Barcode Types</p>
          <ul className="list-disc ml-5">
            <li>UPC-A (12 digits)</li>
            <li>UPC-E (8 digits)</li>
            <li>EAN-13</li>
            <li>EAN-8</li>
            <li>Custom / text-based codes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
