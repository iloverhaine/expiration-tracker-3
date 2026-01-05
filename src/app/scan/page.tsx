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
import type { ProductData } from "@/types";

export default function ScanPage() {
  const router = useRouter();

  const [barcode, setBarcode] = useState("");
  const [productName, setProductName] = useState("");
  const [suggestions, setSuggestions] = useState<ProductData[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHandlingRef = useRef(false);

  /* -------------------------------------------
     Lookup product by barcode OR name
  --------------------------------------------*/
  const lookupProducts = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const products = await productDataService.getAll();
    const q = query.toLowerCase();

    const filtered = products.filter(
      (p) =>
        p.barcode.includes(query) ||
        p.itemName.toLowerCase().includes(q)
    );

    setSuggestions(filtered.slice(0, 5));
    setShowDropdown(true);

    const exact = filtered.find(
      (p) => p.barcode === query || p.itemName === query
    );

    if (exact) {
      setProductName(exact.itemName);
    }
  };

  /* -------------------------------------------
     Handle scan from camera
  --------------------------------------------*/
  const handleScanSuccess = async (raw: string) => {
    if (isHandlingRef.current) return;
    isHandlingRef.current = true;

    try {
      setScannerActive(false);
      setBarcode(raw);

      const products = await productDataService.getAll();
      const found = products.find((p) => p.barcode === raw);

      if (found) {
        setProductName(found.itemName);
      } else {
        setProductName("Scanned Item");
      }
    } finally {
      isHandlingRef.current = false;
    }
  };

  /* -------------------------------------------
     Save item
  --------------------------------------------*/
  const handleSave = async () => {
    if (!barcode.trim()) {
      setError("Barcode or product name is required.");
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
      {/* Camera Scanner */}
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
          <div className="relative">
            <Input
              placeholder="Enter barcode or product name..."
              value={barcode}
              onChange={async (e) => {
                const value = e.target.value;
                setBarcode(value);
                await lookupProducts(value);
              }}
              onFocus={() => suggestions.length && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />

            {/* Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-50 w-full bg-white border rounded-md shadow-md mt-1 max-h-48 overflow-auto">
                {suggestions.map((item) => (
                  <button
                    key={item.barcode}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    onClick={() => {
                      setBarcode(item.barcode);
                      setProductName(item.itemName);
                      setShowDropdown(false);
                    }}
                  >
                    <div className="font-medium">{item.itemName}</div>
                    <div className="text-xs text-gray-500">
                      {item.barcode}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {productName && (
            <p className="text-sm text-green-700">
              Selected: <strong>{productName}</strong>
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={loading}
          >
            Save Item
          </Button>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">Notes</p>
          <ul className="list-disc ml-5">
            <li>Supports all barcode types</li>
            <li>Barcode trimmed to 12 digits on save</li>
            <li>Manual name lookup uses imported data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
