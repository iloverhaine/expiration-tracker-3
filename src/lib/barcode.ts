"use client";

import type { ProductData } from '@/types';
import { productDataService } from './db';

// Barcode validation patterns
const BARCODE_PATTERNS = {
  UPC_A: /^\d{12}$/,
  UPC_E: /^\d{8}$/,
  EAN_13: /^\d{13}$/,
  EAN_8: /^\d{8}$/,
  CODE_128: /^[\x00-\x7F]+$/,
  CODE_39: /^[A-Z0-9\-\.\$\/\+\%\s]+$/
};

// Validate barcode format
export const validateBarcode = (barcode: string): { valid: boolean; type?: string; error?: string } => {
  if (!barcode || barcode.trim().length === 0) {
    return { valid: false, error: 'Barcode cannot be empty' };
  }

  const cleanBarcode = barcode.trim();

  // Check against known patterns
  for (const [type, pattern] of Object.entries(BARCODE_PATTERNS)) {
    if (pattern.test(cleanBarcode)) {
      return { valid: true, type };
    }
  }

  // If no pattern matches but it's not empty, allow it (could be a custom format)
  if (cleanBarcode.length >= 4 && cleanBarcode.length <= 50) {
    return { valid: true, type: 'CUSTOM' };
  }

  return { 
    valid: false, 
    error: 'Invalid barcode format. Must be 4-50 characters and contain valid characters.' 
  };
};

// Lookup product data by barcode
export const lookupProductByBarcode = async (barcode: string): Promise<{
  found: boolean;
  product?: ProductData;
  error?: string;
}> => {
  try {
    // Validate barcode first
    const validation = validateBarcode(barcode);
    if (!validation.valid) {
      return { found: false, error: validation.error };
    }

    // Search in local database
    const product = await productDataService.getByBarcode(barcode.trim());
    
    if (product) {
      return { found: true, product };
    }

    return { found: false };
  } catch (error) {
    console.error('Error looking up product by barcode:', error);
    return { found: false, error: 'Failed to lookup product data' };
  }
};

// Generate barcode suggestions based on partial input
export const generateBarcodeSuggestions = async (partial: string): Promise<ProductData[]> => {
  try {
    if (!partial || partial.length < 2) {
      return [];
    }

    const allProducts = await productDataService.getAll();
    return allProducts
      .filter(product => product.barcode.includes(partial))
      .slice(0, 10); // Limit to 10 suggestions
  } catch (error) {
    console.error('Error generating barcode suggestions:', error);
    return [];
  }
};

// Format barcode for display
export const formatBarcodeForDisplay = (barcode: string): string => {
  if (!barcode) return '';
  
  const clean = barcode.trim();
  
  // Format common barcode types with spaces for readability
  if (BARCODE_PATTERNS.UPC_A.test(clean)) {
    // UPC-A: 123456 789012
    return `${clean.slice(0, 6)} ${clean.slice(6)}`;
  }
  
  if (BARCODE_PATTERNS.EAN_13.test(clean)) {
    // EAN-13: 1 234567 890123
    return `${clean.slice(0, 1)} ${clean.slice(1, 7)} ${clean.slice(7)}`;
  }
  
  if (BARCODE_PATTERNS.UPC_E.test(clean)) {
    // UPC-E: 1234 5678
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  }
  
  if (BARCODE_PATTERNS.EAN_8.test(clean)) {
    // EAN-8: 1234 5678
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  }
  
  // For other formats, just return as-is
  return clean;
};

// Check if barcode already exists in expiration records
export const checkBarcodeExists = async (barcode: string): Promise<boolean> => {
  try {
    const product = await productDataService.getByBarcode(barcode.trim());
    return !!product;
  } catch (error) {
    console.error('Error checking barcode existence:', error);
    return false;
  }
};

// Generate a random barcode for testing (development only)
export const generateTestBarcode = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${timestamp.slice(-9)}${random}`;
};

// Parse barcode from various input formats
export const parseBarcode = (input: string): string => {
  if (!input) return '';
  
  // Remove common prefixes and suffixes
  let cleaned = input.trim();
  
  // Remove common barcode prefixes
  const prefixes = ['UPC:', 'EAN:', 'CODE:', 'BARCODE:'];
  for (const prefix of prefixes) {
    if (cleaned.toUpperCase().startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
    }
  }
  
  // Remove spaces and dashes (but keep other characters for custom formats)
  cleaned = cleaned.replace(/[\s-]/g, '');
  
  return cleaned;
};

// Get barcode type description
export const getBarcodeTypeDescription = (barcode: string): string => {
  const validation = validateBarcode(barcode);
  
  if (!validation.valid) {
    return 'Invalid';
  }
  
  switch (validation.type) {
    case 'UPC_A':
      return 'UPC-A (12 digits)';
    case 'UPC_E':
      return 'UPC-E (8 digits)';
    case 'EAN_13':
      return 'EAN-13 (13 digits)';
    case 'EAN_8':
      return 'EAN-8 (8 digits)';
    case 'CODE_128':
      return 'Code 128';
    case 'CODE_39':
      return 'Code 39';
    case 'CUSTOM':
      return 'Custom Format';
    default:
      return 'Unknown';
  }
};

// Barcode input helpers for manual entry
export const formatBarcodeInput = (value: string): string => {
  // Remove any non-alphanumeric characters except dashes and spaces
  return value.replace(/[^a-zA-Z0-9\-\s]/g, '');
};

// Check if barcode is likely a valid product barcode
export const isLikelyProductBarcode = (barcode: string): boolean => {
  const validation = validateBarcode(barcode);
  return validation.valid && ['UPC_A', 'UPC_E', 'EAN_13', 'EAN_8'].includes(validation.type || '');
};