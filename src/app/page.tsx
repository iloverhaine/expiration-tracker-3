"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Settings, Plus, Search, Scan } from "lucide-react";
import {
  expirationRecordsService,
  initializeDatabase,
  settingsService,
} from "@/lib/db";
import { scheduleDailyNotificationCheck } from "@/lib/notifications";
import type { ExpirationRecord } from "@/types";

export default function HomePage() {
  const [records, setRecords] = useState<ExpirationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRecords = async () => {
    const data = await expirationRecordsService.getAll();
    setRecords(data);
  };

  const initializeApp = useCallback(async () => {
    try {
      await initializeDatabase();
      await loadRecords();

      scheduleDailyNotificationCheck(
        () => expirationRecordsService.getAll(),
        () => settingsService.get()
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    const onFocus = () => loadRecords();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filteredRecords = records.filter(
    (r) =>
      r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.barcode.includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    if (status === "expired") return "bg-red-100 text-red-800 border-red-200";
    if (status === "near-expiration")
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4 flex justify-between">
        <h1 className="text-xl font-bold">Expiration Tracker</h1>
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      </header>

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/scan">
            <Button className="w-full">
              <Scan className="h-4 w-4 mr-2" />
              Scan Barcode
            </Button>
          </Link>
          <Link href="/add-item">
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Items */}
      <div className="px-4 pb-6 space-y-3">
        {filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No items found
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record) => (
            /** ✅ FIXED ROUTE HERE */
            <Link
              key={record.id}
              href={`/edit-item/${record.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle>{record.itemName}</CardTitle>
                    <Badge
                      variant="outline"
                      className={getStatusColor(record.status)}
                    >
                      Qty: {record.quantity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-sm">
                  <p className="text-gray-600">{record.description}</p>
                  <p className="mt-1">
                    Expires:{" "}
                    {record.expirationDate.toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
