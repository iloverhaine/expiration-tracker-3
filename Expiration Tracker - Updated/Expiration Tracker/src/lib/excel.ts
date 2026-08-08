"use client";

import * as XLSX from 'xlsx';
import type { ExpirationRecord, ProductData, ExcelImportResult, ExcelExportData } from '@/types';

// Excel import for product data
export const importProductDataFromExcel = async (file: File): Promise<ExcelImportResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
    
    if (jsonData.length < 2) {
      return {
        success: false,
        imported: 0,
        errors: ['File must contain at least a header row and one data row']
      };
    }

    const headers = jsonData[0].map(h => h?.toString().toLowerCase().trim());
    
    // Find column indices with flexible matching
    const barcodeIndex = headers.findIndex(h => 
      h.includes('barcode') || h.includes('upc') || h.includes('ean') || h.includes('code')
    );
    
    const itemNameIndex = headers.findIndex(h => 
      h.includes('item') || h.includes('name') || h.includes('product') || h.includes('title')
    );
    
    const descriptionIndex = headers.findIndex(h => 
      h.includes('description') || h.includes('desc') || h.includes('detail')
    );

    // Check for required columns
    if (barcodeIndex === -1) {
      return {
        success: false,
        imported: 0,
        errors: ['Barcode column not found. Expected column names: Barcode, UPC, EAN, or Code']
      };
    }
    
    if (itemNameIndex === -1) {
      return {
        success: false,
        imported: 0,
        errors: ['Item name column not found. Expected column names: Item Name, Name, Product, or Title']
      };
    }

    const products: ProductData[] = [];
    const errors: string[] = [];

    // Process data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (!row || row.length === 0) continue;

      const barcode = row[barcodeIndex]?.toString().trim();
      const itemName = row[itemNameIndex]?.toString().trim();
      const description = row[descriptionIndex]?.toString().trim();

      if (!barcode || !itemName) {
        errors.push(`Row ${i + 1}: Missing barcode or item name`);
        continue;
      }

      products.push({
        barcode,
        itemName,
        description: description || ''
      });
    }

    return {
      success: true,
      imported: products.length,
      errors,
      data: products
    };

  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [`Failed to parse Excel file: ${error}`]
    };
  }
};

// Excel export for expiration records with column filtering
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
  try {
    // Default to include all columns if no options provided
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
      ...columnOptions
    };

    // Prepare full data for export
    const fullExportData: ExcelExportData[] = records.map(record => ({
      barcode: record.barcode,
      itemName: record.itemName,
      description: record.description,
      quantity: record.quantity,
      expirationDate: record.expirationDate.toLocaleDateString(),
      remainingDays: record.remainingDays,
      status: record.status.replace('-', ' '),
      notes: record.notes,
      dateCreated: record.dateCreated.toLocaleDateString()
    }));

    // Filter data based on selected columns
    const filteredData = fullExportData.map(row => {
      const filtered: Partial<ExcelExportData> = {};
      
      if (options.barcode) filtered.barcode = row.barcode;
      if (options.itemName) filtered.itemName = row.itemName;
      if (options.description) filtered.description = row.description;
      if (options.quantity) filtered.quantity = row.quantity;
      if (options.expirationDate) filtered.expirationDate = row.expirationDate;
      if (options.remainingDays) filtered.remainingDays = row.remainingDays;
      if (options.status) filtered.status = row.status;
      if (options.notes) filtered.notes = row.notes;
      if (options.dateCreated) filtered.dateCreated = row.dateCreated;
      
      return filtered;
    });

    // Create dynamic headers based on selected columns
    const headerMapping: Record<string, string> = {
      barcode: 'Barcode',
      itemName: 'Item Name',
      description: 'Description',
      quantity: 'Quantity',
      expirationDate: 'Expiration Date',
      remainingDays: 'Remaining Days',
      status: 'Status',
      notes: 'Notes',
      dateCreated: 'Date Created'
    };

    const selectedHeaders = Object.keys(options)
      .filter(key => options[key as keyof typeof options])
      .map(key => headerMapping[key]);

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(filteredData);

    // Set custom headers
    selectedHeaders.forEach((header, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].v = header;
      }
    });

    // Set dynamic column widths based on selected columns
    const columnWidthMapping: Record<string, number> = {
      barcode: 15,
      itemName: 25,
      description: 30,
      quantity: 10,
      expirationDate: 15,
      remainingDays: 15,
      status: 15,
      notes: 30,
      dateCreated: 15
    };

    const columnWidths = Object.keys(options)
      .filter(key => options[key as keyof typeof options])
      .map(key => ({ wch: columnWidthMapping[key] || 15 }));

    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expiration Records');

    // Generate filename with current date and column count
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const columnCount = Object.values(options).filter(Boolean).length;
    const filename = `expiration-records-${dateStr}-${columnCount}cols.xlsx`;

    // Write and download file
    XLSX.writeFile(workbook, filename);

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export data to Excel');
  }
};

// Template download for product data import
export const downloadProductDataTemplate = (): void => {
  try {
    const templateData = [
      {
        'Barcode': '0123456789',
        'Item Name': 'Sample Product',
        'Description': 'Sample product description'
      },
      {
        'Barcode': '9876543210', 
        'Item Name': 'Another Product',
        'Description': 'Another product description'
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Barcode
      { wch: 25 }, // Item Name
      { wch: 30 }  // Description
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Data Template');
    XLSX.writeFile(workbook, 'product-data-template.xlsx');

  } catch (error) {
    console.error('Error creating template:', error);
    throw new Error('Failed to create template file');
  }
};

// Validate Excel file before processing
export const validateExcelFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a valid Excel file (.xlsx, .xls) or CSV file'
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 10MB'
    };
  }

  return { valid: true };
};

// CSV import support
export const importProductDataFromCSV = async (file: File): Promise<ExcelImportResult> => {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return {
        success: false,
        imported: 0,
        errors: ['CSV file must contain at least a header row and one data row']
      };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Find column indices with flexible matching
    const barcodeIndex = headers.findIndex(h => 
      h.includes('barcode') || h.includes('upc') || h.includes('ean') || h.includes('code')
    );
    
    const itemNameIndex = headers.findIndex(h => 
      h.includes('item') || h.includes('name') || h.includes('product') || h.includes('title')
    );
    
    const descriptionIndex = headers.findIndex(h => 
      h.includes('description') || h.includes('desc') || h.includes('detail')
    );

    // Check for required columns
    if (barcodeIndex === -1) {
      return {
        success: false,
        imported: 0,
        errors: ['Barcode column not found. Expected column names: Barcode, UPC, EAN, or Code']
      };
    }
    
    if (itemNameIndex === -1) {
      return {
        success: false,
        imported: 0,
        errors: ['Item name column not found. Expected column names: Item Name, Name, Product, or Title']
      };
    }

    const products: ProductData[] = [];
    const errors: string[] = [];

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      const barcode = values[barcodeIndex]?.trim();
      const itemName = values[itemNameIndex]?.trim();
      const description = values[descriptionIndex]?.trim();

      if (!barcode || !itemName) {
        errors.push(`Row ${i + 1}: Missing barcode or item name`);
        continue;
      }

      products.push({
        barcode,
        itemName,
        description: description || ''
      });
    }

    return {
      success: true,
      imported: products.length,
      errors,
      data: products
    };

  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [`Failed to parse CSV file: ${error}`]
    };
  }
};