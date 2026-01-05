"use client";

import Dexie, { Table } from "dexie";
import type {
  ExpirationRecord,
  ProductData,
  NotificationSettings,
} from "@/types";

/* =========================
   DATABASE TYPES
========================= */

export interface DBExpirationRecord
  extends Omit<
    ExpirationRecord,
    "expirationDate" | "dateCreated" | "remainingDays" | "status"
  > {
  expirationDate: string;
  dateCreated: string;
}

export type DBProductData = ProductData;

export interface DBSettings {
  id: string;
  notifications: NotificationSettings;
  theme: "light" | "dark" | "system";
}

/* =========================
   DATABASE
========================= */

class ExpirationTrackerDB extends Dexie {
  expirationRecords!: Table<DBExpirationRecord>;
  productData!: Table<DBProductData>;
  settings!: Table<DBSettings>;

  constructor() {
    super("ExpirationTrackerDB");

    this.version(1).stores({
      expirationRecords:
        "id, barcode, itemName, expirationDate, status, dateCreated",
      productData: "barcode, itemName",
      settings: "id",
    });
  }
}

export const db = new ExpirationTrackerDB();

/* =========================
   DATE HELPERS
========================= */

export const convertToExpirationRecord = (
  record: DBExpirationRecord
): ExpirationRecord => {
  const expirationDate = new Date(record.expirationDate);
  const dateCreated = new Date(record.dateCreated);
  const today = new Date();

  const remainingDays = Math.ceil(
    (expirationDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  let status: "safe" | "near-expiration" | "expired";
  if (remainingDays < 0) status = "expired";
  else if (remainingDays <= 7) status = "near-expiration";
  else status = "safe";

  return {
    ...record,
    expirationDate,
    dateCreated,
    remainingDays,
    status,
  };
};

export const convertToDBRecord = (
  record: Omit<ExpirationRecord, "remainingDays" | "status">
): DBExpirationRecord => ({
  ...record,
  expirationDate: record.expirationDate.toISOString(),
  dateCreated: record.dateCreated.toISOString(),
});

/* =========================
   EXPIRATION RECORDS
========================= */

export const expirationRecordsService = {
  async getAll(): Promise<ExpirationRecord[]> {
    const records = await db.expirationRecords
      .orderBy("expirationDate")
      .toArray();
    return records.map(convertToExpirationRecord);
  },

  async getById(id: string): Promise<ExpirationRecord | null> {
    const record = await db.expirationRecords.get(id);
    return record ? convertToExpirationRecord(record) : null;
  },

  /**
   * ✅ Allows duplicate items IF expiration date is different
   * 🔁 Merges quantity only if SAME item + SAME expiration day
   */
  async add(
    record: Omit<ExpirationRecord, "id" | "remainingDays" | "status">
  ): Promise<string | void> {
    const existing = await this.getAll();

    const sameDay = existing.find(
      (r) =>
        r.itemName === record.itemName &&
        new Date(r.expirationDate).toDateString() ===
          new Date(record.expirationDate).toDateString()
    );

    if (sameDay) {
      await this.update(sameDay.id, {
        quantity: sameDay.quantity + record.quantity,
      });
      return;
    }

    const id = crypto.randomUUID();
    await db.expirationRecords.add(
      convertToDBRecord({ ...record, id })
    );
    return id;
  },

  async update(
    id: string,
    updates: Partial<Omit<ExpirationRecord, "id" | "remainingDays" | "status">>
  ): Promise<void> {
    const dbUpdates: Partial<DBExpirationRecord> = {};

    if (updates.expirationDate)
      dbUpdates.expirationDate = updates.expirationDate.toISOString();
    if (updates.dateCreated)
      dbUpdates.dateCreated = updates.dateCreated.toISOString();

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== "expirationDate" && key !== "dateCreated") {
        (dbUpdates as any)[key] = value;
      }
    });

    await db.expirationRecords.update(id, dbUpdates);
  },

  async delete(id: string): Promise<void> {
    await db.expirationRecords.delete(id);
  },
};

/* =========================
   PRODUCT DATA
========================= */

export const productDataService = {
  async getAll(): Promise<ProductData[]> {
    return await db.productData.orderBy("itemName").toArray();
  },

  async getByBarcode(barcode: string): Promise<ProductData | null> {
    return (await db.productData.get(barcode)) || null;
  },

  async create(product: ProductData): Promise<void> {
    await db.productData.put(product);
  },

  async update(
    barcode: string,
    updates: Partial<Omit<ProductData, "barcode">>
  ): Promise<void> {
    await db.productData.update(barcode, updates);
  },

  async delete(barcode: string): Promise<void> {
    await db.productData.delete(barcode);
  },

  async bulkCreate(
    products: ProductData[]
  ): Promise<{ success: number; errors: string[] }> {
    let success = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        await this.create(product);
        success++;
      } catch {
        errors.push(product.barcode);
      }
    }

    return { success, errors };
  },

  async clear(): Promise<void> {
    await db.productData.clear();
  },
};

/* =========================
   SETTINGS
========================= */

export const settingsService = {
  async get(): Promise<NotificationSettings> {
    const settings = await db.settings.get("default");
    return (
      settings?.notifications || {
        daysBeforeExpiration: 7,
        notifyOnExpirationDay: true,
        quantityThreshold: 2,
      }
    );
  },

  async update(notifications: NotificationSettings): Promise<void> {
    await db.settings.put({
      id: "default",
      notifications,
      theme: "system",
    });
  },
};

/* =========================
   INIT
========================= */

export const initializeDatabase = async (): Promise<void> => {
  await db.open();

  const existing = await db.settings.get("default");
  if (!existing) {
    await settingsService.update({
      daysBeforeExpiration: 7,
      notifyOnExpirationDay: true,
      quantityThreshold: 2,
    });
  }
};
