"use client";

import Dexie, { Table } from 'dexie';
import type { ExpirationRecord, ProductData, NotificationSettings } from '@/types';

// Database schema
export interface DBExpirationRecord extends Omit<ExpirationRecord, 'expirationDate' | 'dateCreated' | 'remainingDays' | 'status'> {
  expirationDate: string; // ISO string for storage
  dateCreated: string; // ISO string for storage
}

export type DBProductData = ProductData & { matchKey: string };

export interface DBSettings {
  id: string;
  notifications: NotificationSettings;
  theme: 'light' | 'dark' | 'system';
}

class ExpirationTrackerDB extends Dexie {
  expirationRecords!: Table<DBExpirationRecord>;
  productData!: Table<DBProductData>;
  settings!: Table<DBSettings>;

  constructor() {
    super('ExpirationTrackerDB');
    
    this.version(1).stores({
      expirationRecords: 'id, barcode, itemName, expirationDate, status, dateCreated',
      productData: 'barcode, itemName',
      settings: 'id'
    });

    this.version(2).stores({
      expirationRecords: 'id, barcode, itemName, expirationDate, status, dateCreated',
      productData: 'barcode, itemName, matchKey',
      settings: 'id'
    }).upgrade(async tx => {
      await tx.table('productData').toCollection().modify((product: DBProductData) => {
        product.matchKey = normalizeBarcodeForMatch(product.barcode);
      });
    });
  }
}

export const db = new ExpirationTrackerDB();

/**
 * Canonical barcode key used for matching imported product data with
 * expiration records. Handles Excel scientific notation and formatting.
 */
export const normalizeBarcodeForMatch = (value: unknown): string => {
  let raw = String(value ?? "").trim().replace(/\s+/g, "");

  if (!raw) return "";

  // Excel may expose a long barcode as scientific notation.
  if (/^[+-]?\d+(?:\.\d+)?e[+-]?\d+$/i.test(raw)) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      raw = numeric.toLocaleString("fullwide", {
        useGrouping: false,
        maximumFractionDigits: 0,
      });
    }
  }

  // Remove separators such as spaces, hyphens, and decimal suffixes.
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // Also make a zero-trimmed key useful for files that lost leading zeros.
  return digits;
};

export const barcodeMatches = (a: unknown, b: unknown): boolean => {
  const left = normalizeBarcodeForMatch(a);
  const right = normalizeBarcodeForMatch(b);

  if (!left || !right) return false;
  if (left === right) return true;

  return left.replace(/^0+/, "") === right.replace(/^0+/, "");
};

// Utility functions for date conversion
export const convertToExpirationRecord = (dbRecord: DBExpirationRecord): ExpirationRecord => {
  const expirationDate = new Date(dbRecord.expirationDate);
  const dateCreated = new Date(dbRecord.dateCreated);
  const today = new Date();
  const timeDiff = expirationDate.getTime() - today.getTime();
  const remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  let status: 'safe' | 'near-expiration' | 'expired';
  if (remainingDays < 0) {
    status = 'expired';
  } else if (remainingDays <= 7) {
    status = 'near-expiration';
  } else {
    status = 'safe';
  }

  const description =
    dbRecord.description?.trim().toLowerCase() === 'created from scan'
      ? ''
      : dbRecord.description;

  return {
    ...dbRecord,
    description,
    expirationDate,
    dateCreated,
    remainingDays,
    status
  };
};

export const convertToDBRecord = (record: Omit<ExpirationRecord, 'remainingDays' | 'status'>): DBExpirationRecord => ({
  ...record,
  expirationDate: record.expirationDate.toISOString(),
  dateCreated: record.dateCreated.toISOString()
});

// CRUD operations for expiration records
export const expirationRecordsService = {
  async getAll(): Promise<ExpirationRecord[]> {
    try {
      const records = await db.expirationRecords.orderBy('expirationDate').toArray();
      return records.map(convertToExpirationRecord);
    } catch (error) {
      console.error('Error fetching expiration records:', error);
      return [];
    }
  },

  async getById(id: string): Promise<ExpirationRecord | null> {
    try {
      const record = await db.expirationRecords.get(id);
      return record ? convertToExpirationRecord(record) : null;
    } catch (error) {
      console.error('Error fetching expiration record:', error);
      return null;
    }
  },

  async create(record: Omit<ExpirationRecord, 'id' | 'remainingDays' | 'status'>): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const dbRecord = convertToDBRecord({ ...record, id });
      await db.expirationRecords.add(dbRecord);
      return id;
    } catch (error) {
      console.error('Error creating expiration record:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Omit<ExpirationRecord, 'id' | 'remainingDays' | 'status'>>): Promise<void> {
    try {
      const dbUpdates: Partial<DBExpirationRecord> = {};
      
      if (updates.expirationDate) {
        dbUpdates.expirationDate = updates.expirationDate.toISOString();
      }
      if (updates.dateCreated) {
        dbUpdates.dateCreated = updates.dateCreated.toISOString();
      }
      
      // Copy other fields
      Object.keys(updates).forEach(key => {
        if (key !== 'expirationDate' && key !== 'dateCreated') {
          (dbUpdates as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key];
        }
      });

      await db.expirationRecords.update(id, dbUpdates);
    } catch (error) {
      console.error('Error updating expiration record:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await db.expirationRecords.delete(id);
    } catch (error) {
      console.error('Error deleting expiration record:', error);
      throw error;
    }
  },

  async search(query: string): Promise<ExpirationRecord[]> {
    try {
      const records = await db.expirationRecords
        .filter(record => 
          record.itemName.toLowerCase().includes(query.toLowerCase()) ||
          record.description.toLowerCase().includes(query.toLowerCase()) ||
          record.barcode.includes(query)
        )
        .toArray();
      return records.map(convertToExpirationRecord);
    } catch (error) {
      console.error('Error searching expiration records:', error);
      return [];
    }
  }
};

// CRUD operations for product data
export const productDataService = {
  async getAll(): Promise<ProductData[]> {
    try {
      return await db.productData.orderBy('itemName').toArray();
    } catch (error) {
      console.error('Error fetching product data:', error);
      return [];
    }
  },

  async getFirst(limit = 100): Promise<ProductData[]> {
    try {
      return await db.productData.orderBy('itemName').limit(limit).toArray();
    } catch (error) {
      console.error('Error fetching product preview:', error);
      return [];
    }
  },

  async count(): Promise<number> {
    try {
      return await db.productData.count();
    } catch (error) {
      console.error('Error counting product data:', error);
      return 0;
    }
  },

  async getByBarcode(barcode: string): Promise<ProductData | null> {
    try {
      const matchKey = normalizeBarcodeForMatch(barcode);
      if (!matchKey) return null;
      const exact = await db.productData.where('matchKey').equals(matchKey).first();
      if (exact) return exact;
      const trimmed = matchKey.replace(/^0+/, '');
      if (trimmed && trimmed !== matchKey) {
        return await db.productData.where('matchKey').equals(trimmed).first() || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching product by barcode:', error);
      return null;
    }
  },

  async getDescriptionsByBarcodes(barcodes: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const keys = Array.from(new Set(barcodes.map(normalizeBarcodeForMatch).filter(Boolean)));
    if (!keys.length) return result;
    try {
      const products = await db.productData.where('matchKey').anyOf(keys).toArray();
      for (const product of products) {
        const description = product.description?.trim();
        if (description && description.toLowerCase() !== 'created from scan') {
          result.set(product.matchKey, description);
        }
      }
      return result;
    } catch (error) {
      console.error('Error fetching product descriptions:', error);
      return result;
    }
  },

  async create(product: ProductData): Promise<void> {
    try {
      const normalized = normalizeBarcodeForMatch(product.barcode);
      if (!normalized) throw new Error('Barcode is required');
      await db.productData.put({ ...product, barcode: product.barcode.trim(), matchKey: normalized });
    } catch (error) {
      console.error('Error creating product data:', error);
      throw error;
    }
  },

  async update(barcode: string, updates: Partial<Omit<ProductData, 'barcode'>>): Promise<void> {
    try {
      await db.productData.update(barcode, updates);
    } catch (error) {
      console.error('Error updating product data:', error);
      throw error;
    }
  },

  async delete(barcode: string): Promise<void> {
    try {
      await db.productData.delete(barcode);
    } catch (error) {
      console.error('Error deleting product data:', error);
      throw error;
    }
  },

  async bulkCreate(
    products: ProductData[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ success: number; errors: string[]; skipped: number }> {
    const errors: string[] = [];
    let success = 0;
    let skipped = 0;
    const batchSize = 250;

    for (let start = 0; start < products.length; start += batchSize) {
      const batch = products.slice(start, start + batchSize);
      const valid = batch
        .map(product => ({
          ...product,
          barcode: product.barcode.trim(),
          matchKey: normalizeBarcodeForMatch(product.barcode),
        }))
        .filter(product => {
          if (!product.matchKey) {
            skipped++;
            return false;
          }
          return true;
        });

      try {
        await db.productData.bulkPut(valid);
        success += valid.length;
      } catch (error) {
        // Fall back to individual writes only for a failed batch so one bad row
        // cannot abort the entire import.
        for (const product of valid) {
          try {
            await db.productData.put(product);
            success++;
          } catch (rowError) {
            errors.push(`Failed to import ${product.barcode}: ${rowError}`);
          }
        }
      }

      onProgress?.(Math.min(start + batch.length, products.length), products.length);
      // Yield to Safari/iOS between batches so the browser can repaint and
      // handle input instead of appearing frozen during a large import.
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return { success, errors, skipped };
  },

  async clear(): Promise<void> {
    try {
      await db.productData.clear();
    } catch (error) {
      console.error('Error clearing product data:', error);
      throw error;
    }
  }
};

// Settings operations
export const settingsService = {
  async get(): Promise<NotificationSettings> {
    try {
      const settings = await db.settings.get('default');
      return settings?.notifications || {
        daysBeforeExpiration: 7,
        notifyOnExpirationDay: true,
        quantityThreshold: 2
      };
    } catch (error) {
      console.error('Error fetching settings:', error);
      return {
        daysBeforeExpiration: 7,
        notifyOnExpirationDay: true,
        quantityThreshold: 2
      };
    }
  },

  async update(notifications: NotificationSettings): Promise<void> {
    try {
      await db.settings.put({
        id: 'default',
        notifications,
        theme: 'system'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }
};

// Initialize database with default settings
export const initializeDatabase = async (): Promise<void> => {
  try {
    await db.open();
    
    // Check if settings exist, if not create default
    const existingSettings = await db.settings.get('default');
    if (!existingSettings) {
      await settingsService.update({
        daysBeforeExpiration: 7,
        notifyOnExpirationDay: true,
        quantityThreshold: 2
      });
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};