"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Scan, Upload } from "lucide-react";
import {
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import {
  expirationRecordsService,
  initializeDatabase,
} from "@/lib/db";
import { scheduleDailyNotificationCheck } from "@/lib/notifications";
import { importExpirationRecords } from "@/lib/importExport";
import type { ExpirationRecord } from "@/types";

export default function HomePage() {
  const [records, setRecords] = useState<ExpirationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ---------------- INIT ---------------- */
  const loadRecords = async () => {
    const data = await expirationRecordsService.getAll();
    setRecords(data);
  };

  const initializeApp = useCallback(async () => {
    try {
      await initializeDatabase();
      await loadRecords();

      // ✅ LOW QUANTITY NOTIFICATIONS DISABLED HERE
      scheduleDailyNotificationCheck(
        () => expirationRecordsService.getAll(),
        async () => ({
          notificationsEnabled: true,
          daysBeforeExpiration: 7,
          notifyOnExpirationDay: true,
          quantityThreshold: 0, // ✅ OFF
        })
      );
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

  /* ---------------- IMPORT ---------------- */
  const handleImport = async (file: File) => {
    try {
      await importExpirationRecords(file);
      await loadRecords();
    } catch (e) {
      console.error(e);
      alert("Failed to import file");
    }
  };

  /* ---------------- BULK DELETE ---------------- */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const ok = confirm(
      `Delete ${selectedIds.size} selected item(s)?`
    );
    if (!ok) return;

    for (const id of selectedIds) {
      await expirationRecordsService.delete(id);
    }

    clearSelection();
    await loadRecords();
  };

  /* ---------------- MONTH-ONLY EXPIRATION LOGIC ---------------- */
  const getMonthStatus = (expirationDate: Date) => {
    const today = new Date();

    const currentTotalMonths =
      today.getFullYear() * 12 + today.getMonth();
    const expTotalMonths =
      expirationDate.getFullYear() * 12 +
      expirationDate.getMonth();

    const monthsRemaining =
      expTotalMonths - currentTotalMonths;

    // 1 month or less → Expired
    if (monthsRemaining <= 1) {
      return {
        status: "expired" as const,
        label: "Expired",
        icon: AlertCircle,
      };
    }

    // 3 months or less → For Push Item/Items
    if (monthsRemaining <= 3) {
      return {
        status: "push" as const,
        label: "For Push Item/Items",
        icon: AlertTriangle,
      };
    }

    // Exactly 4 months → For Return this Month
    if (monthsRemaining === 4) {
      return {
        status: "return" as const,
        label: "For Return this Month",
        icon: RotateCcw,
      };
    }

    // More than 4 months → Good
    return {
      status: "good" as const,
      label: "Good",
      icon: CheckCircle,
    };
  };

  /* ---------------- FILTER ---------------- */
  const filteredRecords = records.filter(
    (r) =>
      r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description ?? "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (r.barcode ?? "").includes(searchTerm)
  );

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ACTIONS */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/scan">
            <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700">
              <Scan className="h-5 w-5 mr-2" />
              Scan Barcode
            </Button>
          </Link>

          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() =>
              document.getElementById("import-file")?.click()
            }
          >
            <Upload className="h-5 w-5 mr-2" />
            Import
          </Button>

          <input
            id="import-file"
            type="file"
            accept=".xlsx,.csv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.currentTarget.value = "";
            }}
          />
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* BULK DELETE BAR */}
      {selectedIds.size > 0 && (
        <div className="mx-4 mb-3 flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-3">
          <span className="text-sm text-red-700">
            {selectedIds.size} selected
          </span>

          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
          >
            Delete Selected
          </Button>
        </div>
      )}

      {/* ITEM LIST */}
      <div className="px-4 pb-6 space-y-3">
        {filteredRecords.map((record) => {
          const result = getMonthStatus(
            record.expirationDate
          );
          const status = result.status;
          const StatusIcon = result.icon;

          return (
            <Link key={record.id} href={`/item/${record.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* TOP */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.id)}
                        onChange={() =>
                          toggleSelect(record.id)
                        }
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                        className="mt-1 h-4 w-4"
                      />

                      <div>
                        <h3 className="text-lg font-semibold">
                          {record.itemName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {record.description ||
                            "Created from scan"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusIcon
                        className={`h-5 w-5 ${
                          status === "expired"
                            ? "text-red-600"
                            : status === "push"
                            ? "text-yellow-600"
                            : status === "return"
                            ? "text-blue-600"
                            : "text-green-600"
                        }`}
                      />

                      <span className="px-2 py-1 text-xs rounded-full border">
                        Qty: {record.quantity}
                      </span>
                    </div>
                  </div>

                  {/* BOTTOM */}
                  <div className="mt-4 flex justify-between items-end">
                    <div>
                      <p className="text-sm text-gray-600">
                        Expires:{" "}
                        {record.expirationDate.toLocaleDateString()}
                      </p>

                      <p
                        className={`text-sm font-medium ${
                          status === "expired"
                            ? "text-red-600"
                            : status === "push"
                            ? "text-yellow-600"
                            : status === "return"
                            ? "text-blue-600"
                            : "text-green-600"
                        }`}
                      >
                        {result.label}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 text-xs rounded-full ${
                        status === "expired"
                          ? "bg-red-100 text-red-700"
                          : status === "push"
                          ? "bg-yellow-100 text-yellow-700"
                          : status === "return"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {result.label}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
