"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Keyboard, Search, CheckCircle, AlertCircle } from "lucide-react";
import { validateBarcode, formatBarcodeForDisplay, getBarcodeTypeDescription, lookupProductByBarcode } from "@/lib/barcode";
import BarcodeScanner from "@/components/BarcodeScanner";
import type { ProductData } from "@/types";

function ScanBarcodeForm() {
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    product?: ProductData;
    error?: string;
  } | null>(null);

  const handleBarcodeChange = (value: string) => {
    // Clean input - remove special characters except alphanumeric, dashes, and spaces
    const cleaned = value.replace(/[^a-zA-Z0-9\-\s]/g, '');
    setBarcode(cleaned);
    setLookupResult(null);
  };

  const handleLookup = async (barcodeToLookup?: string) => {
    const targetBarcode = barcodeToLookup || barcode.trim();
    if (!targetBarcode) return;

    setIsLookingUp(true);
    setLookupResult(null);

    try {
      const result = await lookupProductByBarcode(targetBarcode);
      setLookupResult(result);
      
      // If this was called from camera scan, update the barcode input
      if (barcodeToLookup) {
        setBarcode(barcodeToLookup);
      }
    } catch {
      setLookupResult({
        found: false,
        error: "Failed to lookup barcode"
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleContinue = () => {
    const params = new URLSearchParams({
      barcode: barcode.trim(),
      ...(lookupResult?.product && {
        itemName: lookupResult.product.itemName,
        description: lookupResult.product.description
      })
    });
    
    router.push(`/add-item?${params.toString()}`);
  };

  const validation = validateBarcode(barcode);
  const canLookup = validation.valid && barcode.trim().length > 0;
  const canContinue = canLookup && lookupResult !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Scan Barcode</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Camera Scanner */}
        <BarcodeScanner
          onScanSuccess={(scannedBarcode) => {
            setCameraActive(false); // Stop camera after successful scan
            handleLookup(scannedBarcode); // Lookup with scanned barcode
          }}
          isActive={cameraActive}
          onToggle={() => setCameraActive(!cameraActive)}
        />

        {/* Manual Entry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Keyboard className="h-5 w-5" />
              <span>Manual Entry</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Barcode
              </label>
              <Input
                id="barcode"
                type="text"
                placeholder="Enter barcode number..."
                value={barcode}
                onChange={(e) => handleBarcodeChange(e.target.value)}
                className="text-lg font-mono"
                autoFocus
              />
              {barcode && (
                <div className="mt-2 space-y-1">
                  {validation.valid ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">
                        Valid {getBarcodeTypeDescription(barcode)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">
                        {validation.error || "Invalid barcode format"}
                      </span>
                    </div>
                  )}
                  {validation.valid && (
                    <p className="text-sm text-gray-600">
                      Formatted: {formatBarcodeForDisplay(barcode)}
                    </p>
                  )}
                </div>
              )}
            </div>

           <Button
  onClick={() => handleLookup()}
  disabled={!canLookup || isLookingUp}
  className="w-full"
>
  Lookup Product
</Button>

          </CardContent>
        </Card>

        {/* Lookup Result */}
        {lookupResult && (
          <Card className={lookupResult.found ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {lookupResult.found ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800">Product Found</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-yellow-800">Product Not Found</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lookupResult.found && lookupResult.product ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-gray-900">{lookupResult.product.itemName}</p>
                    <p className="text-gray-600">{lookupResult.product.description}</p>
                    <p className="text-sm text-gray-500 font-mono">Barcode: {lookupResult.product.barcode}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-green-700">
                      ✓ Product details will be automatically filled when you continue
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-yellow-800">
                    No product found for barcode: <span className="font-mono">{formatBarcodeForDisplay(barcode)}</span>
                  </p>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-yellow-700">
                      You can still add this item manually. The barcode will be saved for future reference.
                    </p>
                  </div>
                </div>
              )}
              
              {lookupResult.error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded">
                  <p className="text-sm text-red-700">{lookupResult.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        {canContinue && (
          <div className="space-y-3">
            <Button onClick={handleContinue} className="w-full h-12 text-lg">
              Continue to Add Item
            </Button>
            <p className="text-center text-sm text-gray-600">
              {lookupResult?.found 
                ? "Product details will be pre-filled" 
                : "You can enter product details manually"
              }
            </p>
          </div>
        )}

        {/* Help Text */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-medium text-blue-900 mb-2">Supported Barcode Types</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• UPC-A (12 digits)</li>
              <li>• UPC-E (8 digits)</li>
              <li>• EAN-13 (13 digits)</li>
              <li>• EAN-8 (8 digits)</li>
              <li>• Custom formats (4-50 characters)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ScanBarcodePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ScanBarcodeForm />
    </Suspense>
  );
}