"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle,
  MoreVertical,
  RotateCcw,
  Scan,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  expirationRecordsService,
  initializeDatabase,
} from "@/lib/db";
import { formatBarcodeForDisplay } from "@/lib/barcode";
import { scheduleDailyNotificationCheck } from "@/lib/notifications";
import { importExpirationRecords } from "@/lib/importExport";
import type { ExpirationRecord } from "@/types";

export default function HomePage() {
  const [records, setRecords] = useState<ExpirationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNotifications, setShowNotifications] = useState(true);
  const [importMessage, setImportMessage] = useState<string>("");

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
          quantityThreshold: 0,
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
      const importedRecords = (await importExpirationRecords(file)) ?? [];

      if (importedRecords.length === 0) {
        setImportMessage("Failed to import file. No valid records found.");
        return;
      }

      const currentRecords = await expirationRecordsService.getAll();

      const newRecords = importedRecords.filter(
        (importedRecord: ExpirationRecord) => {
          return !currentRecords.some(
            (currentRecord: ExpirationRecord) =>
              currentRecord.barcode === importedRecord.barcode &&
              currentRecord.description === importedRecord.description &&
              currentRecord.quantity === importedRecord.quantity &&
              currentRecord.expirationDate.toISOString() ===
                importedRecord.expirationDate.toISOString()
          );
        }
      );

      if (newRecords.length > 0) {
        for (const record of newRecords) {
          await expirationRecordsService.create(record);
        }
        setImportMessage(
          "File imported successfully! Some records were skipped due to duplicates."
        );
      } else {
        setImportMessage(
          "No new records to import. All records are duplicates."
        );
      }

      await loadRecords();
    } catch (e) {
      console.error(e);
      setImportMessage("Failed to import file. Please try again.");
    }
  };

  /* ---------------- BULK DELETE ---------------- */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const ok = confirm(`Delete ${selectedIds.size} selected item(s)?`);
    if (!ok) return;

    for (const id of selectedIds) {
      await expirationRecordsService.delete(id);
    }

    clearSelection();
    await loadRecords();
  };

  const handleSingleDelete = async (record: ExpirationRecord) => {
    const ok = confirm(`Delete \"${record.itemName}\"?`);
    if (!ok) return;

    await expirationRecordsService.delete(record.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(record.id);
      return next;
    });
    await loadRecords();
  };

  /* ---------------- MONTH-ONLY EXPIRATION LOGIC ---------------- */
  const getMonthStatus = (expirationDate: Date) => {
    const today = new Date();

    const currentTotalMonths = today.getFullYear() * 12 + today.getMonth();
    const expTotalMonths =
      expirationDate.getFullYear() * 12 + expirationDate.getMonth();

    const monthsRemaining = expTotalMonths - currentTotalMonths;
    const safeMonths = Math.max(0, monthsRemaining);

    if (safeMonths <= 1) {
      return {
        status: "expired" as const,
        label: "Expired",
        monthsRemaining: safeMonths,
        icon: AlertCircle,
      };
    }

    if (safeMonths <= 3) {
      return {
        status: "push" as const,
        label: "For Push Item/Items",
        monthsRemaining: safeMonths,
        icon: AlertTriangle,
      };
    }

    if (safeMonths === 4) {
      return {
        status: "return" as const,
        label: "For Return this Month",
        monthsRemaining: safeMonths,
        icon: RotateCcw,
      };
    }

    return {
      status: "good" as const,
      label: "Good",
      monthsRemaining: safeMonths,
      icon: CheckCircle,
    };
  };

  /* ---------------- FILTER ---------------- */
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRecords = records.filter(
    (r) =>
      r.itemName.toLowerCase().includes(normalizedSearch) ||
      (r.description ?? "").toLowerCase().includes(normalizedSearch) ||
      (r.notes ?? "").toLowerCase().includes(normalizedSearch) ||
      (r.barcode ?? "").toLowerCase().includes(normalizedSearch)
  );

  const allFilteredSelected =
    filteredRecords.length > 0 &&
    filteredRecords.every((record) => selectedIds.has(record.id));

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredRecords.forEach((record) => next.delete(record.id));
      } else {
        filteredRecords.forEach((record) => next.add(record.id));
      }
      return next;
    });
  };

  /* ---------------- NOTIFICATIONS DATA ---------------- */
  const expiredItems = records.filter(
    (r) => getMonthStatus(r.expirationDate).status === "expired"
  );

  const pushItems = records.filter(
    (r) => getMonthStatus(r.expirationDate).status === "push"
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
      {/* NOTIFICATIONS PANEL */}
      {showNotifications && (expiredItems.length > 0 || pushItems.length > 0) && (
        <div className="mx-4 mt-4 mb-2 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-700" />
              <h3 className="font-semibold text-yellow-800">
                Expiration Alerts
              </h3>
            </div>

            <button
              onClick={() => setShowNotifications(false)}
              className="text-xs text-yellow-700 underline"
            >
              Dismiss
            </button>
          </div>

          <div className="mt-2 text-sm text-yellow-800">
            <p>🔴 Expired: {expiredItems.length}</p>
            <p>🟡 Expiring Soon: {pushItems.length}</p>
          </div>

          <div className="mt-3 space-y-2">
            {[...expiredItems, ...pushItems].slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/item/${item.id}`}
                className="block rounded-md bg-white px-3 py-2 text-sm hover:bg-gray-100"
              >
                {item.itemName} — expires{" "}
                {item.expirationDate.toLocaleDateString()}
              </Link>
            ))}
          </div>
        </div>
      )}

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
            onClick={() => document.getElementById("import-file")?.click()}
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
            placeholder="Search items, item codes, or remarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* DISPLAY NUMBER OF RECORDS */}
        <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
          <p>Total records: {records.length}</p>
          {filteredRecords.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={toggleSelectAllFiltered}
            >
              {allFilteredSelected ? "Unselect shown" : "Select all shown"}
            </Button>
          )}
        </div>

        {/* BATCH DELETE BAR */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="text-sm font-medium text-red-800">
              {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"} selected
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete selected
              </Button>
            </div>
          </div>
        )}

        {/* IMPORT SUCCESS OR ERROR MESSAGE */}
        {importMessage && (
          <div className="mt-2 text-sm text-center font-medium text-gray-800">
            <p
              className={
                importMessage.includes("success")
                  ? "text-green-500"
                  : "text-red-500"
              }
            >
              {importMessage}
            </p>
          </div>
        )}
      </div>

      {/* ITEM LIST */}
      <div className="px-4 pb-6 space-y-3">
        {filteredRecords.map((record) => {
          const result = getMonthStatus(record.expirationDate);
          const status = result.status;
          const StatusIcon = result.icon;
          const isSelected = selectedIds.has(record.id);
          const hasUsefulDescription =
            record.description?.trim() &&
            record.description.trim().toLowerCase() !== "created from scan";

          const statusBorderClass =
            status === "expired"
              ? "border-2 border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.35)]"
              : status === "push"
              ? "border-2 border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.35)]"
              : status === "return"
              ? "border-2 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.35)]"
              : "border border-green-300";

          return (
            <Card
              key={record.id}
              className={`transition-shadow hover:shadow-lg ${statusBorderClass} ${
                isSelected ? "ring-2 ring-red-500 ring-offset-2" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <Link href={`/item/${record.id}`} className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold">
                      {record.itemName}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Item Code:</span>{" "}
                      <span className="font-mono">
                        {formatBarcodeForDisplay(record.barcode) || "—"}
                      </span>
                    </p>
                    {hasUsefulDescription && (
                      <p className="mt-1 text-sm text-gray-500">
                        {record.description}
                      </p>
                    )}
                  </Link>

                  <div className="flex shrink-0 items-center gap-2">
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

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label={`Options for ${record.itemName}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuCheckboxItem
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(record.id)}
                        >
                          Select for batch delete
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => void handleSingleDelete(record)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {record.notes?.trim() && (
                  <div className="mt-3 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700">
                    <span className="font-medium">Remarks:</span>{" "}
                    <span className="whitespace-pre-wrap break-words">
                      {record.notes.trim()}
                    </span>
                  </div>
                )}

                <Link
                  href={`/item/${record.id}`}
                  className="mt-4 flex justify-between items-end gap-3"
                >
                  <div>
                    <p className="text-sm text-gray-600">
                      Expires: {record.expirationDate.toLocaleDateString()}
                    </p>

                    <p className="text-sm text-gray-500">
                      Time remaining:{" "}
                      <span className="font-medium">
                        {result.monthsRemaining} month
                        {result.monthsRemaining !== 1 ? "s" : ""}
                      </span>
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
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
