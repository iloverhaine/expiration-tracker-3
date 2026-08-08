import * as XLSX from "xlsx";
import { expirationRecordsService } from "@/lib/db";

/**
 * Convert Excel date OR string into JS Date
 */
function parseExcelDate(value: any): Date | null {
  if (!value) return null;

  // Excel numeric date
  if (typeof value === "number") {
    const epoch = new Date(1899, 11, 30);
    epoch.setDate(epoch.getDate() + value);
    return epoch;
  }

  // String date (MM/DD/YYYY or similar)
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function importExpirationRecords(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(sheet);

  let imported = 0;

  for (const raw of rows) {
    // 🔑 MAP EXCEL HEADERS HERE
    const barcode = raw.Barcode ?? raw.barcode ?? "";
    const itemName = raw["Item Name"] ?? raw.itemName ?? "";
    const description = raw.Description ?? "";
    const quantity = Number(raw.Quantity ?? raw.quantity ?? 1);
    const expirationDate = parseExcelDate(
      raw["Expiration Date"] ?? raw.expirationDate
    );

    if (!itemName || !expirationDate) {
      console.warn("Skipped row:", raw);
      continue;
    }

    await expirationRecordsService.create({
      barcode: barcode.toString(),
      itemName: itemName.toString(),
      description: description.toString(),
      quantity,
      expirationDate,
      dateCreated: new Date(),
      notes: "",
    });

    imported++;
  }

  console.log(`Imported ${imported} records`);
}
