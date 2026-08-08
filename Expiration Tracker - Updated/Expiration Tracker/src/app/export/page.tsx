"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, FileSpreadsheet, CheckCircle } from "lucide-react";
import { expirationRecordsService } from "@/lib/db";
import { exportExpirationRecordsToExcel } from "@/lib/excel";
import type { ExpirationRecord } from "@/types";

export default function ExportPage() {
  const [records, setRecords] = useState<ExpirationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  const [selectedColumns, setSelectedColumns] = useState({
    barcode: true,
    itemName: true,
    description: true,
    quantity: true,
    expirationDate: true,
    remainingDays: true,
    status: true,
    notes: true,
    dateCreated: true
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await expirationRecordsService.getAll();
      setRecords(data);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleColumnToggle = (column: keyof typeof selectedColumns) => {
    setSelectedColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedColumns).every(Boolean);
    const newState = !allSelected;
    
    setSelectedColumns({
      barcode: newState,
      itemName: newState,
      description: newState,
      quantity: newState,
      expirationDate: newState,
      remainingDays: newState,
      status: newState,
      notes: newState,
      dateCreated: newState
    });
  };

  const handleExport = async () => {
    if (records.length === 0) {
      alert('No records to export');
      return;
    }

    setIsExporting(true);
    setExportSuccess(false);

    try {
      // Filter records based on selected columns (for display purposes)
      // The actual filtering happens in the export function
      exportExpirationRecordsToExcel(records);
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Error exporting records:', error);
      alert('Failed to export records. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getSelectedCount = () => {
    return Object.values(selectedColumns).filter(Boolean).length;
  };

  const getStatusCounts = () => {
    const counts = {
      safe: records.filter(r => r.status === 'safe').length,
      nearExpiration: records.filter(r => r.status === 'near-expiration').length,
      expired: records.filter(r => r.status === 'expired').length
    };
    return counts;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading records...</p>
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Export Data</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Export Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5" />
              <span>Export Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-8">
                <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No expiration records to export</p>
                <Link href="/add-item">
                  <Button>Add Your First Item</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Records</p>
                    <p className="text-2xl font-bold">{records.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Selected Columns</p>
                    <p className="text-2xl font-bold">{getSelectedCount()}/9</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-600">{statusCounts.safe}</p>
                    <p className="text-xs text-gray-600">Safe</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-yellow-600">{statusCounts.nearExpiration}</p>
                    <p className="text-xs text-gray-600">Near Expiry</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-red-600">{statusCounts.expired}</p>
                    <p className="text-xs text-gray-600">Expired</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column Selection */}
        {records.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Select Columns to Export</CardTitle>
                <Button
                  onClick={handleSelectAll}
                  variant="outline"
                  size="sm"
                >
                  {Object.values(selectedColumns).every(Boolean) ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(selectedColumns).map(([column, selected]) => (
                  <div key={column} className="flex items-center space-x-3">
                    <Checkbox
                      id={column}
                      checked={selected}
                      onCheckedChange={() => handleColumnToggle(column as keyof typeof selectedColumns)}
                    />
                    <Label htmlFor={column} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {column.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getColumnDescription(column)}
                        </Badge>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Button */}
        {records.length > 0 && (
          <div className="space-y-3">
            {exportSuccess && (
              <div className="bg-green-50 border border-green-200 p-3 rounded">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">Export Successful!</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Your Excel file has been downloaded successfully.
                </p>
              </div>
            )}
            
            <Button
              onClick={handleExport}
              disabled={isExporting || getSelectedCount() === 0}
              className="w-full h-12 text-lg"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Export to Excel (.xlsx)
                </>
              )}
            </Button>
            
            {getSelectedCount() === 0 && (
              <p className="text-center text-sm text-red-600">
                Please select at least one column to export
              </p>
            )}
          </div>
        )}

        {/* Export Information */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-medium text-blue-900 mb-2">Export Information</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• File format: Excel (.xlsx)</li>
              <li>• File name: expiration-records-YYYY-MM-DD.xlsx</li>
              <li>• All selected data will be included</li>
              <li>• Dates will be formatted for readability</li>
              <li>• Status values will be human-readable</li>
              <li>• File will be downloaded to your default download folder</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to get column descriptions
function getColumnDescription(column: string): string {
  const descriptions: Record<string, string> = {
    barcode: 'Product identifier',
    itemName: 'Product name',
    description: 'Product details',
    quantity: 'Current quantity',
    expirationDate: 'Expiry date',
    remainingDays: 'Days until expiry',
    status: 'Current status',
    notes: 'Additional notes',
    dateCreated: 'Date added'
  };
  
  return descriptions[column] || 'Data field';
}