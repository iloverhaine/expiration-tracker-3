"use client";

import Dexie, { Table } from 'dexie';
import type { ExpirationRecord, ProductData, NotificationSettings } from '@/types';

// Database schema
export interface DBExpirationRecord extends Omit<ExpirationRecord, 'expirationDate' | 'dateCreated' | 'remainingDays' | 'status'> {
  expirationDate: string; // ISO string for storage
  dateCreated: string; // ISO string for storage
}

export type DBProductData = ProductData;

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
  }
}

export const db = new ExpirationTrackerDB();

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

  return {
    ...dbRecord,
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

  async getByBarcode(barcode: string): Promise<ProductData | null> {
    try {
      return await db.productData.get(barcode) || null;
    } catch (error) {
      console.error('Error fetching product by barcode:', error);
      return null;
    }
  },

  async create(product: ProductData): Promise<void> {
    try {
      await db.productData.put(product);
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

  async bulkCreate(products: ProductData[]): Promise<{ success: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;

    for (const product of products) {
      try {
        await this.create(product);
        success++;
      } catch (error) {
        errors.push(`Failed to import ${product.barcode}: ${error}`);
      }
    }

    return { success, errors };
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