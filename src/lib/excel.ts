"use client";

import * as XLSX from "xlsx";
import type { ExpirationRecord, ProductData, ExcelImportResult } from "@/types";

/* =====================================================
   EXPORT EXPIRATION RECORDS (WITH COLUMN FILTERING)
===================================================== */

export const exportExpirationRecordsToExcel = (
  records: ExpirationRecord[],
  columnOptions?: {
    barcode?: boolean;
    itemName?: boolean;
    description?: boolean;
    quantity?: boolean;
    expirationDate?: boolean;
    remainingDays?: boolean;
    status?: boolean;
    notes?: boolean;
    dateCreated?: boolean;
  }
): void => {
  const options = {
    barcode: true,
    itemName: true,
    description: true,
    quantity: true,
    expirationDate: true,
    remainingDays: true,
    status: true,
    notes: true,
    dateCreated: true,
    ...columnOptions,
  };

  const rows = records.map((r) => {
    const row: Record<string, string | number> = {};

    if (options.barcode) row["Barcode"] = r.barcode;
    if (options.itemName) row["Item Name"] = r.itemName;
    if (options.description) row["Description"] = r.description;
    if (options.quantity) row["Quantity"] = r.quantity;
    if (options.expirationDate)
      row["Expiration Date"] = r.expirationDate.toLocaleDateString();
    if (options.remainingDays) row["Remaining Days"] = r.remainingDays;
    if (options.status)
      row["Status"] = r.status.replace("-", " ");
    if (options.notes) row["Notes"] = r.notes;
    if (options.dateCreated)
      row["Date Created"] = r.dateCreated.toLocaleDateString();

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Expiration Records");

  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `expiration-records-${date}.xlsx`);
};

/* =====================================================
   IMPORT PRODUCT DATA (EXCEL)
===================================================== */

export const importProductDataFromExcel = async (
  file: File
): Promise<ExcelImportResult> => {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    const products: ProductData[] = [];
    const errors: string[] = [];

    rows.forEach((row, index) => {
      const barcode = String(
        row.Barcode || row.barcode || row.UPC || ""
      ).trim();
      const itemName = String(
        row["Item Name"] || row.itemName || ""
      ).trim();
      const description = String(row.Description || "").trim();

      if (!barcode || !itemName) {
        errors.push(`Row ${index + 2}: Missing barcode or item name`);
        return;
      }

      products.push({ barcode, itemName, description });
    });

    return {
      success: errors.length === 0,
      imported: products.length,
      errors,
      data: products,
    };
  } catch (err) {
    return {
      success: false,
      imported: 0,
      errors: ["Failed to read Excel file"],
    };
  }
};

/* =====================================================
   IMPORT PRODUCT DATA (CSV)
===================================================== */

export const importProductDataFromCSV = async (
  file: File
): Promise<ExcelImportResult> => {
  const text = await file.text();
  const lines = text.split("\n").filter(Boolean);

  const headers = lines[0].split(",").map((h) => h.toLowerCase());
  const barcodeIndex = headers.findIndex((h) => h.includes("barcode"));
  const nameIndex = headers.findIndex((h) => h.includes("name"));
  const descIndex = headers.findIndex((h) => h.includes("desc"));

  const products: ProductData[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");

    const barcode = cols[barcodeIndex]?.trim();
    const itemName = cols[nameIndex]?.trim();
    const description = cols[descIndex]?.trim() ?? "";

    if (!barcode || !itemName) {
      errors.push(`Row ${i + 1}: Missing barcode or item name`);
      continue;
    }

    products.push({ barcode, itemName, description });
  }

  return {
    success: errors.length === 0,
    imported: products.length,
    errors,
    data: products,
  };
};

/* =====================================================
   FILE VALIDATION
===================================================== */

export const validateExcelFile = (file: File) => {
  const allowed = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ];

  if (!allowed.includes(file.type)) {
    return { valid: false, error: "Invalid file type" };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: "File too large (max 10MB)" };
  }

  return { valid: true };
};

/* =====================================================
   DOWNLOAD PRODUCT DATA TEMPLATE
===================================================== */

export const downloadProductDataTemplate = (): void => {
  const template = [
    {
      Barcode: "012345678901",
      "Item Name": "Sample Product",
      Description: "Optional description",
    },
    {
      Barcode: "098765432109",
      "Item Name": "Another Product",
      Description: "Another description",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();

  worksheet["!cols"] = [
    { wch: 18 }, // Barcode
    { wch: 30 }, // Item Name
    { wch: 40 }, // Description
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Product Template");
  XLSX.writeFile(workbook, "product-data-template.xlsx");
};

