"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Settings, Plus, Search, Scan } from "lucide-react";
import { expirationRecordsService, initializeDatabase } from "@/lib/db";
import { scheduleDailyNotificationCheck } from "@/lib/notifications";
import { settingsService } from "@/lib/db";
import type { ExpirationRecord } from "@/types";

export default function HomePage() {
  const [records, setRecords] = useState<ExpirationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const initializeApp = useCallback(async () => {
    try {
      // Initialize database
      await initializeDatabase();
      
      // Load records
      await loadRecords();
      
      // Setup notifications
      scheduleDailyNotificationCheck(
        () => expirationRecordsService.getAll(),
        () => settingsService.get()
      );
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const loadRecords = async () => {
    try {
      const data = await expirationRecordsService.getAll();
      setRecords(data);
    } catch (error) {
      console.error('Error loading records:', error);
    }
  };

  // Refresh records when returning to page
  useEffect(() => {
    const handleFocus = () => {
      loadRecords();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

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

  const filteredRecords = records.filter(record =>
    record.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.barcode.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Expiration Tracker</h1>
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Action Buttons */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/scan" className="block">
            <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700">
              <Scan className="h-5 w-5 mr-2" />
              Scan Barcode
            </Button>
          </Link>
          <Link href="/add-item" className="block">
            <Button variant="outline" className="w-full h-12">
              <Plus className="h-5 w-5 mr-2" />
              Add Item
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="px-4 pb-4 space-y-3">
        {filteredRecords.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <div className="text-gray-500 mb-4">
                <img 
                  src="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/7af2606a-cacc-45ad-bb2d-c6222566f659.png" 
                  alt="No items found illustration"
                  className="mx-auto mb-4 rounded-lg opacity-50"
                />
              </div>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "No items match your search" : "No items tracked yet"}
              </p>
              <Link href="/add-item">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record) => (
            <Link key={record.id} href={`/item/${record.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {record.itemName}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {record.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <span className="text-lg">{getStatusIcon(record.status)}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(record.status)}`}
                      >
                        Qty: {record.quantity}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-600">
                        Expires: {record.expirationDate.toLocaleDateString()}
                      </p>
                      <p className={`font-medium ${
                        record.remainingDays < 0 
                          ? "text-red-600" 
                          : record.remainingDays <= 7 
                          ? "text-yellow-600" 
                          : "text-green-600"
                      }`}>
                        {record.remainingDays < 0 
                          ? `Expired ${Math.abs(record.remainingDays)} days ago`
                          : record.remainingDays === 0
                          ? "Expires today"
                          : `${record.remainingDays} days remaining`
                        }
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(record.status)}
                    >
                      {record.status.replace('-', ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Quick Stats */}
      {filteredRecords.length > 0 && (
        <div className="px-4 pb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {filteredRecords.filter(r => r.status === 'expired').length}
                  </p>
                  <p className="text-xs text-gray-600">Expired</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {filteredRecords.filter(r => r.status === 'near-expiration').length}
                  </p>
                  <p className="text-xs text-gray-600">Near Expiry</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredRecords.filter(r => r.status === 'safe').length}
                  </p>
                  <p className="text-xs text-gray-600">Safe</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}