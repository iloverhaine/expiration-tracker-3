"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Scan, Upload } from "lucide-react";
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

      scheduleDailyNotificationCheck(
        () => expirationRecordsService.getAll(),
        async () => ({
          notificationsEnabled: true,
          daysBeforeExpiration: 7,
          notifyOnExpirationDay: true,
          quantityThreshold: 1,
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

  /* ---------------- HELPERS ---------------- */
  const getDaysUntilExpiration = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(date);
    exp.setHours(0, 0, 0, 0);

    return Math.ceil(
      (exp.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  };

  const getStatus = (days: number) => {
    if (days < 0) return "expired";
    if (days <= 7) return "expiring";
    return "ok";
  };

  const formatTimeRemaining = (days: number) => {
    if (days < 0) return "Expired";

    const months = Math.floor(days / 30);
    const remainingDays = days % 30;

    if (months > 0 && remainingDays > 0) {
      return `${months} month${months > 1 ? "s" : ""} ${remainingDays} day${remainingDays > 1 ? "s" : ""}`;
    }

    if (months > 0) {
      return `${months} month${months > 1 ? "s" : ""}`;
    }

    return `${days} day${days !== 1 ? "s" : ""}`;
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
          const days = getDaysUntilExpiration(
            record.expirationDate
          );
          const status = getStatus(days);

          return (
            <Link key={record.id} href={`/item/${record.id}`}>
              <Card
                className="hover:shadow-md transition-shadow"
                onClick={(e) => {
                  if (
                    (e.target as HTMLElement).tagName ===
                    "INPUT"
                  ) {
                    e.preventDefault();
                  }
                }}
              >
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
                      <span
                        className={`h-3 w-3 rounded-full ${
                          status === "expired"
                            ? "bg-red-500"
                            : status === "expiring"
                            ? "bg-yellow-400"
                            : "bg-green-500"
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
                            : status === "expiring"
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        Time remaining:{" "}
                        {formatTimeRemaining(days)}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 text-xs rounded-full capitalize ${
                        status === "expired"
                          ? "bg-red-100 text-red-700"
                          : status === "expiring"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {status}
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
