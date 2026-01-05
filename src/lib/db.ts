"use client";

import Dexie, { Table } from "dexie";
import type {
  ExpirationRecord,
  ProductData,
  NotificationSettings,
} from "@/types";

/* =========================================================
   DATABASE TYPES
========================================================= */

export interface DBExpirationRecord
  extends Omit<
    ExpirationRecord,
    "expirationDate" | "dateCreated" | "remainingDays" | "status"
  > {
  expirationDate: string; // ISO string
  dateCreated: string; // ISO string
}

export type DBProductData = ProductData;

export interface DBSettings {
  id: string;
  notifications: NotificationSettings;
  theme: "light" | "dark" | "system";
}

/* =========================================================
   DATABASE SETUP
========================================================= */

class ExpirationTrackerDB extends Dexie {
  expirationRecords!: Table<DBExpirationRecord>;
  productData!: Table<DBProductData>;
  settings!: Table<DBSettings>;

  constructor() {
    super("ExpirationTrackerDB");

    this.version(1).stores({
      expirationRecords:
        "id, barcode, itemName, expirationDate, dateCreated",
      productData: "barcode, itemName",
      settings: "id",
    });
  }
}

export const db = new ExpirationTrackerDB();

/* =========================================================
   DATE HELPERS
========================================================= */

export const convertToExpirationRecord = (
  dbRecord: DBExpirationRecord
): ExpirationRecord => {
  const expirationDate = new Date(dbRecord.expirationDate);
  const dateCreated = new Date(dbRecord.dateCreated);

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
    ...dbRecord,
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

/* =========================================================
   PRODUCT LOOKUP (BARCODE OR NAME)
========================================================= */

export const lookupProductData = async (
  input: string
): Promise<ProductData[]> => {
  const value = input.trim().toLowerCase();
  if (!value) return [];

  const normalizedBarcode = value.replace(/\D/g, "").slice(0, 12);
  const products = await db.productData.toArray();

  return products.filter((p) =>
    normalizedBarcode.length >= 8
      ? p.barcode.startsWith(normalizedBarcode)
      : p.itemName.toLowerCase().includes(value)
  );
};

/* =========================================================
   EXPIRATION RECORDS SERVICE
========================================================= */

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

  async create(
    record: Omit<ExpirationRecord, "id" | "remainingDays" | "status">
  ): Promise<string> {
    try {
      const existing = await db.expirationRecords
        .where("barcode")
        .equals(record.barcode)
        .toArray();

      const sameBatch = existing.find(
        (r) =>
          new Date(r.expirationDate).toDateString() ===
          record.expirationDate.toDateString()
      );

      if (sameBatch) {
        await db.expirationRecords.update(sameBatch.id, {
          quantity: sameBatch.quantity + record.quantity,
        });
        return sameBatch.id;
      }

      const id = crypto.randomUUID();
      const dbRecord = convertToDBRecord({ ...record, id });
      await db.expirationRecords.add(dbRecord);
      return id;
    } catch (error) {
      console.error("Error creating expiration record:", error);
      throw error;
    }
  },

  async update(
    id: string,
    updates: Partial<Omit<ExpirationRecord, "id" | "remainingDays" | "status">>
  ): Promise<void> {
    const dbUpdates: Partial<DBExpirationRecord> = {};

    if (updates.expirationDate) {
      dbUpdates.expirationDate = updates.expirationDate.toISOString();
    }
    if (updates.dateCreated) {
      dbUpdates.dateCreated = updates.dateCreated.toISOString();
    }

    Object.keys(updates).forEach((key) => {
      if (key !== "expirationDate" && key !== "dateCreated") {
        (dbUpdates as any)[key] = (updates as any)[key];
      }
    });

    await db.expirationRecords.update(id, dbUpdates);
  },

  async delete(id: string): Promise<void> {
    await db.expirationRecords.delete(id);
  },
};

/* =========================================================
   PRODUCT DATA SERVICE (IMPORTED DATA)
========================================================= */

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

  async delete(barcode: string): Promise<void> {
    await db.productData.delete(barcode);
  },

  async bulkCreate(
    products: ProductData[]
  ): Promise<{ success: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;

    for (const product of products) {
      try {
        await this.create(product);
        success++;
      } catch {
        errors.push(`Failed to import ${product.barcode}`);
      }
    }

    return { success, errors };
  },

  async clear(): Promise<void> {
    await db.productData.clear();
  },
};

/* =========================================================
   SETTINGS
========================================================= */

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

/* =========================================================
   INIT
========================================================= */

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
