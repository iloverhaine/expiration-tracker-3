"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Minus, Calendar, Save, Scan } from "lucide-react";
import { expirationRecordsService, initializeDatabase } from "@/lib/db";
import { validateBarcode, formatBarcodeForDisplay } from "@/lib/barcode";
import type { ExpirationRecordForm } from "@/types";

function AddItemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [form, setForm] = useState<ExpirationRecordForm>({
    barcode: "",
    itemName: "",
    description: "",
    quantity: 1,
    expirationDate: "",
    notes: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with URL parameters if coming from barcode scan
  useEffect(() => {
    const barcode = searchParams.get('barcode');
    const itemName = searchParams.get('itemName');
    const description = searchParams.get('description');

    if (barcode) {
      setForm(prev => ({
        ...prev,
        barcode,
        itemName: itemName || "",
        description: description || ""
      }));
    }

    // Initialize database
    initializeDatabase();
  }, [searchParams]);

  const handleInputChange = (field: keyof ExpirationRecordForm, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const adjustQuantity = (delta: number) => {
    const newQuantity = Math.max(1, form.quantity + delta);
    handleInputChange('quantity', newQuantity);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate barcode
    if (!form.barcode.trim()) {
      newErrors.barcode = "Barcode is required";
    } else {
      const barcodeValidation = validateBarcode(form.barcode);
      if (!barcodeValidation.valid) {
        newErrors.barcode = barcodeValidation.error || "Invalid barcode";
      }
    }

    // Validate item name
    if (!form.itemName.trim()) {
      newErrors.itemName = "Item name is required";
    } else if (form.itemName.trim().length < 2) {
      newErrors.itemName = "Item name must be at least 2 characters";
    }

    // Validate expiration date
    if (!form.expirationDate) {
      newErrors.expirationDate = "Expiration date is required";
    } else {
      const expirationDate = new Date(form.expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(expirationDate.getTime())) {
        newErrors.expirationDate = "Invalid date format";
      }
    }

    // Validate quantity
    if (form.quantity < 1) {
      newErrors.quantity = "Quantity must be at least 1";
    } else if (form.quantity > 9999) {
      newErrors.quantity = "Quantity cannot exceed 9999";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await expirationRecordsService.create({
        barcode: form.barcode.trim(),
        itemName: form.itemName.trim(),
        description: form.description.trim(),
        quantity: form.quantity,
        expirationDate: new Date(form.expirationDate),
        notes: form.notes.trim(),
        dateCreated: new Date()
      });

      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Error saving item:', error);
      setErrors({ submit: 'Failed to save item. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMinDate = () => {
    return getTodayDate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Add Item</h1>
          </div>
          <Link href="/scan">
            <Button variant="outline" size="sm">
              <Scan className="h-4 w-4 mr-2" />
              Scan
            </Button>
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Barcode Section */}
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="barcode">Barcode *</Label>
              <Input
                id="barcode"
                type="text"
                placeholder="Enter or scan barcode"
                value={form.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                className={`font-mono ${errors.barcode ? 'border-red-500' : ''}`}
              />
              {form.barcode && !errors.barcode && (
                <p className="text-sm text-gray-600 mt-1">
                  Formatted: {formatBarcodeForDisplay(form.barcode)}
                </p>
              )}
              {errors.barcode && (
                <p className="text-sm text-red-600 mt-1">{errors.barcode}</p>
              )}
            </div>

            <div>
              <Label htmlFor="itemName">Item Name *</Label>
              <Input
                id="itemName"
                type="text"
                placeholder="e.g., Fresh Milk, Brown Rice"
                value={form.itemName}
                onChange={(e) => handleInputChange('itemName', e.target.value)}
                className={errors.itemName ? 'border-red-500' : ''}
              />
              {errors.itemName && (
                <p className="text-sm text-red-600 mt-1">{errors.itemName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                placeholder="e.g., Organic whole milk, Long grain brown rice"
                value={form.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quantity & Expiration */}
        <Card>
          <CardHeader>
            <CardTitle>Quantity & Expiration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Quantity *</Label>
              <div className="flex items-center space-x-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustQuantity(-1)}
                  disabled={form.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <Input
                    type="number"
                    min="1"
                    max="9999"
                    value={form.quantity}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                    className={`text-center text-lg font-semibold ${errors.quantity ? 'border-red-500' : ''}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustQuantity(1)}
                  disabled={form.quantity >= 9999}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.quantity && (
                <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>
              )}
            </div>

            <div>
              <Label htmlFor="expirationDate">Expiration Date *</Label>
              <div className="relative">
                <Input
                  id="expirationDate"
                  type="date"
                  min={getMinDate()}
                  value={form.expirationDate}
                  onChange={(e) => handleInputChange('expirationDate', e.target.value)}
                  className={errors.expirationDate ? 'border-red-500' : ''}
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.expirationDate && (
                <p className="text-sm text-red-600 mt-1">{errors.expirationDate}</p>
              )}
              {form.expirationDate && !errors.expirationDate && (
                <div className="mt-2">
                  {(() => {
                    const expirationDate = new Date(form.expirationDate);
                    const today = new Date();
                    const timeDiff = expirationDate.getTime() - today.getTime();
                    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                    
                    let badgeColor = "bg-green-100 text-green-800 border-green-200";
                    let message = `${daysDiff} days from now`;
                    
                    if (daysDiff < 0) {
                      badgeColor = "bg-red-100 text-red-800 border-red-200";
                      message = `Expired ${Math.abs(daysDiff)} days ago`;
                    } else if (daysDiff <= 7) {
                      badgeColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
                      message = daysDiff === 0 ? "Expires today" : `${daysDiff} days from now`;
                    }
                    
                    return (
                      <Badge variant="outline" className={badgeColor}>
                        {message}
                      </Badge>
                    );
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Optional notes (e.g., storage instructions, brand, etc.)"
              value={form.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="space-y-3">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full h-12 text-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Item
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AddItemPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AddItemForm />
    </Suspense>
  );
}