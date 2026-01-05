// Core data models for the Expiration Tracker application

export interface ExpirationRecord {
  id: string;
  barcode: string;
  itemName: string;
  description: string;
  quantity: number;
  expirationDate: Date;
  notes: string;
  dateCreated: Date;
  remainingDays: number; // computed field
  status: 'safe' | 'near-expiration' | 'expired'; // computed field
}

export interface ProductData {
  barcode: string; // primary key
  itemName: string;
  description: string;
}

export interface NotificationSettings {
  daysBeforeExpiration: number;
  notifyOnExpirationDay: boolean;
  quantityThreshold: number;
}

export interface AppSettings {
  notifications: NotificationSettings;
  theme: 'light' | 'dark' | 'system';
}

// Form interfaces for creating/editing records
export interface ExpirationRecordForm {
  barcode: string;
  itemName: string;
  description: string;
  quantity: number;
  expirationDate: string; // ISO date string for forms
  notes: string;
}

export interface ProductDataForm {
  barcode: string;
  itemName: string;
  description: string;
}

// Database operation results
export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Excel import/export interfaces
export interface ExcelImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  data?: ProductData[];
}

export interface ExcelExportData {
  barcode: string;
  itemName: string;
  description: string;
  quantity: number;
  expirationDate: string;
  remainingDays: number;
  status: string;
  notes: string;
  dateCreated: string;
}

// Status calculation helpers
export type ExpirationStatus = 'safe' | 'near-expiration' | 'expired';

export interface StatusThresholds {
  nearExpirationDays: number;
}