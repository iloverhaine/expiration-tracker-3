"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CameraOff } from 'lucide-react';

export default function CameraTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        setIsActive(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="h-5 w-5" />
          <span>Camera Test</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button
            onClick={isActive ? stopCamera : startCamera}
            variant={isActive ? "destructive" : "default"}
            className="w-full"
          >
            {isActive ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Test Camera Access
              </>
            )}
          </Button>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {isActive && (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-48 bg-black rounded-lg object-cover"
                playsInline
                muted
                autoPlay
              />
              <div className="absolute top-2 left-2">
                <div className="bg-green-500 text-white px-2 py-1 rounded text-xs">
                  Camera Active
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}