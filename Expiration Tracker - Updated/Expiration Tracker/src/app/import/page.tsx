"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Trash2, Edit } from "lucide-react";
import { productDataService } from "@/lib/db";
import { importProductDataFromExcel, importProductDataFromCSV, downloadProductDataTemplate, validateExcelFile } from "@/lib/excel";
import type { ProductData, ExcelImportResult } from "@/types";

export default function ImportPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);
  const [productData, setProductData] = useState<ProductData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProductData = async () => {
    setIsLoadingData(true);
    try {
      const data = await productDataService.getAll();
      setProductData(data);
    } catch (error) {
      console.error('Error loading product data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateExcelFile(file);
    if (!validation.valid) {
      setImportResult({
        success: false,
        imported: 0,
        errors: [validation.error || 'Invalid file']
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      let result: ExcelImportResult;
      
      if (file.type === 'text/csv') {
        result = await importProductDataFromCSV(file);
      } else {
        result = await importProductDataFromExcel(file);
      }

      if (result.success && result.data) {
        // Import to database
        const dbResult = await productDataService.bulkCreate(result.data);
        setImportResult({
          success: true,
          imported: dbResult.success,
          errors: [...result.errors, ...dbResult.errors]
        });
        
        // Reload product data
        await loadProductData();
      } else {
        setImportResult(result);
      }
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        errors: [`Import failed: ${error}`]
      });
    } finally {
      setIsImporting(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadProductDataTemplate();
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  const handleDeleteProduct = async (barcode: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await productDataService.delete(barcode);
      await loadProductData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const handleEditProduct = (product: ProductData) => {
    setEditingProduct(product);
  };

  const handleSaveEdit = async (updatedProduct: ProductData) => {
    try {
      await productDataService.update(updatedProduct.barcode, {
        itemName: updatedProduct.itemName,
        description: updatedProduct.description
      });
      setEditingProduct(null);
      await loadProductData();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('Are you sure you want to delete ALL product data? This action cannot be undone.')) {
      return;
    }

    try {
      await productDataService.clear();
      setProductData([]);
      setImportResult(null);
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data. Please try again.');
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadProductData();
  }, []);

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
            <h1 className="text-xl font-bold text-gray-900">Import Product Data</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Import from Excel/CSV</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={isImporting}
                className="mt-2"
              />
              <p className="text-sm text-gray-600 mt-1">
                Supported formats: Excel (.xlsx, .xls) and CSV (.csv)
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Select File
                  </>
                )}
              </Button>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className={`p-4 rounded border ${
                importResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    importResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {importResult.success ? 'Import Successful' : 'Import Failed'}
                  </span>
                </div>
                
                {importResult.success && (
                  <p className="text-green-700 text-sm mb-2">
                    Successfully imported {importResult.imported} products
                  </p>
                )}
                
                {importResult.errors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">
                      {importResult.success ? 'Warnings:' : 'Errors:'}
                    </p>
                    <ul className="text-sm space-y-1">
                      {importResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index} className="text-gray-700">• {error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li className="text-gray-600">
                          ... and {importResult.errors.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Product Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Product Database</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {productData.length} products
                </Badge>
                {productData.length > 0 && (
                  <Button
                    onClick={handleClearAllData}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading product data...</p>
              </div>
            ) : productData.length === 0 ? (
              <div className="text-center py-8">
                <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No product data imported yet</p>
                <Button onClick={handleDownloadTemplate} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template to Get Started
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {productData.map((product) => (
                  <div key={product.barcode}>
                    {editingProduct?.barcode === product.barcode ? (
                      <EditProductForm
                        product={editingProduct}
                        onSave={handleSaveEdit}
                        onCancel={() => setEditingProduct(null)}
                      />
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <div className="flex-1">
                          <p className="font-medium">{product.itemName}</p>
                          <p className="text-sm text-gray-600">{product.description}</p>
                          <p className="text-xs text-gray-500 font-mono">
                            Barcode: {product.barcode}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleEditProduct(product)}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteProduct(product.barcode)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-medium text-blue-900 mb-2">Import Requirements</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• File must contain columns: Barcode, Item Name, Description</li>
              <li>• Barcode column is required and must be unique</li>
              <li>• Item Name column is required</li>
              <li>• Description column is optional</li>
              <li>• Maximum file size: 10MB</li>
              <li>• Supported formats: .xlsx, .xls, .csv</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Edit Product Form Component
function EditProductForm({ 
  product, 
  onSave, 
  onCancel 
}: { 
  product: ProductData; 
  onSave: (product: ProductData) => void; 
  onCancel: () => void; 
}) {
  const [editForm, setEditForm] = useState(product);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm.itemName.trim()) {
      onSave(editForm);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-white rounded border border-blue-200">
      <div className="space-y-3">
        <div>
          <Label htmlFor="edit-itemName">Item Name</Label>
          <Input
            id="edit-itemName"
            value={editForm.itemName}
            onChange={(e) => setEditForm(prev => ({ ...prev, itemName: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="edit-description">Description</Label>
          <Input
            id="edit-description"
            value={editForm.description}
            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button type="submit" size="sm">Save</Button>
          <Button type="button" onClick={onCancel} variant="outline" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}