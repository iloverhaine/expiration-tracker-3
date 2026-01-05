"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CameraOff,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Zap,
} from "lucide-react";

import {
  BrowserMultiFormatReader,
  Result,
} from "@zxing/library";

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

export default function BarcodeScanner({
  onScanSuccess,
  isActive,
  onToggle,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [reader, setReader] =
    useState<BrowserMultiFormatReader | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  /* ---------------------------------------------
     Initialize ZXing (ALL BARCODE FORMATS)
  ----------------------------------------------*/
  useEffect(() => {
    let mounted = true;

    try {
      const zxReader = new BrowserMultiFormatReader();
      if (mounted) setReader(zxReader);
    } catch (err) {
      console.error(err);
      setError("Failed to initialize barcode scanner.");
    } finally {
      if (mounted) setInitializing(false);
    }

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------------------------------------
     Request camera permission (USER ACTION)
  ----------------------------------------------*/
  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      stream.getTracks().forEach((t) => t.stop());
      setHasPermission(true);
      setError(null);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (d) => d.kind === "videoinput"
      );

      const backCamera =
        videoDevices.find((d) =>
          d.label.toLowerCase().includes("back")
        ) || videoDevices[0];

      setDeviceId(backCamera?.deviceId || "");
    } catch (err) {
      console.error(err);
      setHasPermission(false);
      setError("Camera permission denied.");
    }
  };

  /* ---------------------------------------------
     Start scanning — ALL formats, trim to 12 digits
  ----------------------------------------------*/
  const startScanning = async () => {
    if (!reader || !videoRef.current || !deviceId) return;

    try {
      setScanning(true);
      setScanAttempts(0);
      setError(null);

      await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result: Result | undefined) => {
          if (!result) {
            setScanAttempts((v) => v + 1);
            return;
          }

          // Raw scanned text
          const rawText = result.getText();

          // Keep digits only
          const digitsOnly = rawText.replace(/\D/g, "");

          // Trim to 12 digits max
          const trimmed = digitsOnly.slice(0, 12);

          // Accept only when we have 12 digits
          if (trimmed.length === 12) {
            onScanSuccess(trimmed);
            stopScanning();
          } else {
            setScanAttempts((v) => v + 1);
          }
        }
      );
    } catch (err) {
      console.error(err);
      setError("Failed to start scanning.");
      setScanning(false);
    }
  };

  /* ---------------------------------------------
     Stop scanning
  ----------------------------------------------*/
  const stopScanning = () => {
    try {
      reader?.reset();
    } catch {}
    setScanning(false);
    setScanAttempts(0);
  };

  /* ---------------------------------------------
     Auto start / stop
  ----------------------------------------------*/
  useEffect(() => {
    if (isActive && hasPermission && !scanning) {
      startScanning();
    }
    if (!isActive && scanning) {
      stopScanning();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, hasPermission, deviceId]);

  useEffect(() => {
    return () => stopScanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------
     UI STATES
  ----------------------------------------------*/
  if (initializing) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4 rounded-full" />
          Initializing scanner...
        </CardContent>
      </Card>
    );
  }

  if (hasPermission === false) {
    return (
      <Card className="border-red-300 bg-red-50">
        <CardContent className="p-4 text-red-700 space-y-3">
          <div className="flex items-center space-x-2">
            <CameraOff className="h-5 w-5" />
            <span className="font-medium">Camera access required</span>
          </div>
          <Button onClick={() => window.location.reload()} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reload
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isActive ? "border-green-500 bg-green-50" : ""}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Barcode Scanner</span>
            {scanning && (
              <Badge className="bg-green-100 text-green-800">
                <Zap className="h-3 w-3 mr-1 animate-pulse" />
                Scanning
              </Badge>
            )}
          </div>

          <Button
            size="sm"
            variant={isActive ? "destructive" : "default"}
            onClick={async () => {
              if (!isActive) await requestPermission();
              onToggle();
            }}
          >
            {isActive ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isActive ? (
          <>
            <div className="relative mb-4">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                autoPlay
                muted
                playsInline
              />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-dashed border-white w-48 h-32 rounded-lg flex items-center justify-center">
                  <span className="text-white bg-black bg-opacity-60 px-3 py-1 rounded text-sm">
                    {scanning
                      ? `Scanning… (${scanAttempts})`
                      : "Align barcode"}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-100 border border-red-300 p-2 rounded flex items-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="text-xs text-green-700 bg-green-100 border border-green-300 rounded p-3 mt-3">
              <CheckCircle className="inline h-4 w-4 mr-1" />
              Any barcode supported • Only first 12 digits are used
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-600">
            <Camera className="h-12 w-12 mx-auto mb-4 text-blue-500" />
            Tap <strong>Start Camera</strong> to scan a barcode
          </div>
        )}
      </CardContent>
    </Card>
  );
}
