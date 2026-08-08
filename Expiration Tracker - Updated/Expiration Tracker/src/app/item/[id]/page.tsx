"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Trash2, Calendar, Package, BarChart3, StickyNote } from "lucide-react";
import { expirationRecordsService } from "@/lib/db";
import { formatBarcodeForDisplay } from "@/lib/barcode";
import type { ExpirationRecord } from "@/types";

function ItemDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  
  const [item, setItem] = useState<ExpirationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadItem = useCallback(async () => {
    try {
      const record = await expirationRecordsService.getById(itemId);
      setItem(record);
    } catch (error) {
      console.error('Error loading item:', error);
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const handleDelete = async () => {
    if (!item || !confirm(`Are you sure you want to delete "${item.itemName}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await expirationRecordsService.delete(itemId);
      router.push('/');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "expired":
        return "bg-red-100 text-red-800 border-red-200";
      case "near-expiration":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "safe":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "expired":
        return "🔴";
      case "near-expiration":
        return "🟡";
      case "safe":
        return "🟢";
      default:
        return "⚪";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Item Not Found</h1>
          </div>
        </header>
        <div className="p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-4">The requested item could not be found.</p>
              <Link href="/">
                <Button>Return to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-bold text-gray-900">Item Details</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getStatusIcon(item.status)}</span>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Main Item Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {item.itemName}
                </CardTitle>
                {item.description && (
                  <p className="text-gray-600 text-lg">{item.description}</p>
                )}
              </div>
              <Badge 
                variant="outline" 
                className={`text-sm ${getStatusColor(item.status)}`}
              >
                {item.status.replace('-', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Package className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Quantity</p>
                  <p className="text-xl font-semibold">{item.quantity}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Expires</p>
                  <p className="text-lg font-medium">{item.expirationDate.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Time Remaining</p>
                <p className={`text-lg font-semibold ${
                  item.remainingDays < 0 
                    ? "text-red-600" 
                    : item.remainingDays <= 7 
                    ? "text-yellow-600" 
                    : "text-green-600"
                }`}>
                  {item.remainingDays < 0 
                    ? `Expired ${Math.abs(item.remainingDays)} days ago`
                    : item.remainingDays === 0
                    ? "Expires today"
                    : `${item.remainingDays} days remaining`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barcode Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Barcode Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Barcode</p>
              <p className="text-xl font-mono font-semibold">{formatBarcodeForDisplay(item.barcode)}</p>
              <p className="text-sm text-gray-500 mt-1">Raw: {item.barcode}</p>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {item.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <StickyNote className="h-5 w-5" />
                <span>Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{item.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Item History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Date Added</p>
                <p className="font-medium">{item.dateCreated.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Status</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-lg">{getStatusIcon(item.status)}</span>
                  <Badge 
                    variant="outline" 
                    className={getStatusColor(item.status)}
                  >
                    {item.status.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-12"
            onClick={() => router.push(`/edit-item/${itemId}`)}
          >
            <Edit className="h-5 w-5 mr-2" />
            Edit Item
          </Button>
          <Button 
            variant="destructive" 
            className="h-12"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-5 w-5 mr-2" />
                Delete Item
              </>
            )}
          </Button>
        </div>

        {/* Quick Actions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-medium text-blue-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/add-item" className="block">
                <Button variant="outline" className="w-full justify-start bg-white">
                  Add Similar Item
                </Button>
              </Link>
              <Link href="/export" className="block">
                <Button variant="outline" className="w-full justify-start bg-white">
                  Export All Items
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ItemDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ItemDetailsContent />
    </Suspense>
  );
}