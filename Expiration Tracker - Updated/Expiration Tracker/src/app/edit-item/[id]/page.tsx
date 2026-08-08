"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Calendar, 
  Save, 
  Trash2, 
  AlertTriangle, 
  Edit,
  Package,
  Clock,
  FileText,
  CheckCircle,
  History
} from "lucide-react";
import { expirationRecordsService, initializeDatabase } from "@/lib/db";
import { formatBarcodeForDisplay } from "@/lib/barcode";
import type { ExpirationRecord, ExpirationRecordForm } from "@/types";

function EditItemForm() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  
  const [originalRecord, setOriginalRecord] = useState<ExpirationRecord | null>(null);
  const [form, setForm] = useState<ExpirationRecordForm>({
    barcode: "",
    itemName: "",
    description: "",
    quantity: 1,
    expirationDate: "",
    notes: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load existing record
  useEffect(() => {
    const loadRecord = async () => {
      setIsLoading(true);
      try {
        await initializeDatabase();
        const record = await expirationRecordsService.getById(itemId);
        
        if (!record) {
          setErrors({ load: 'Item not found' });
          setTimeout(() => router.push('/'), 2000);
          return;
        }

        setOriginalRecord(record);
        setForm({
          barcode: record.barcode,
          itemName: record.itemName,
          description: record.description,
          quantity: record.quantity,
          expirationDate: record.expirationDate.toISOString().split('T')[0],
          notes: record.notes
        });
      } catch (error) {
        console.error('Error loading record:', error);
        setErrors({ load: 'Failed to load item. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    };

    if (itemId) {
      loadRecord();
    }
  }, [itemId, router]);

  const handleInputChange = (field: keyof ExpirationRecordForm, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const adjustQuantity = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(9999, form.quantity + delta));
    handleInputChange('quantity', newQuantity);
  };

  const setQuickQuantity = (quantity: number) => {
    handleInputChange('quantity', quantity);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !originalRecord) {
      return;
    }

    setIsSaving(true);

    try {
      await expirationRecordsService.update(originalRecord.id, {
        itemName: form.itemName.trim(),
        description: form.description.trim(),
        quantity: form.quantity,
        expirationDate: new Date(form.expirationDate),
        notes: form.notes.trim(),
        barcode: form.barcode,
        dateCreated: originalRecord.dateCreated
      });

      setSaveSuccess(true);
      
      // Auto-redirect after successful save
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      console.error('Error updating item:', error);
      setErrors({ submit: 'Failed to update item. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!originalRecord) return;

    setIsDeleting(true);

    try {
      await expirationRecordsService.delete(originalRecord.id);
      router.push('/');
    } catch (error) {
      console.error('Error deleting item:', error);
      setErrors({ delete: 'Failed to delete item. Please try again.' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getStatusPreview = () => {
    if (!form.expirationDate) return null;

    const expirationDate = new Date(form.expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeDiff = expirationDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    let badgeColor = "bg-green-100 text-green-800 border-green-200";
    let message = `${daysDiff} days from now`;
    let status = "Safe";
    let icon = "🟢";
    
    if (daysDiff < 0) {
      badgeColor = "bg-red-100 text-red-800 border-red-200";
      message = `Expired ${Math.abs(daysDiff)} days ago`;
      status = "Expired";
      icon = "🔴";
    } else if (daysDiff <= 7) {
      badgeColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
      message = daysDiff === 0 ? "Expires today" : `${daysDiff} days from now`;
      status = "Near Expiration";
      icon = "🟡";
    }
    
    return { badgeColor, message, status, icon };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "expired":
        return "bg-red-100 text-red-800 border-red-200";
      case "near-expiration":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "safe":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const hasChanges = () => {
    if (!originalRecord) return false;
    
    return (
      originalRecord.itemName !== form.itemName ||
      originalRecord.description !== form.description ||
      originalRecord.quantity !== form.quantity ||
      originalRecord.expirationDate.toISOString().split('T')[0] !== form.expirationDate ||
      originalRecord.notes !== form.notes
    );
  };

  const statusPreview = getStatusPreview();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading item...</p>
        </div>
      </div>
    );
  }

  if (errors.load) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Item</h2>
          <p className="text-gray-600 mb-4">{errors.load}</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!originalRecord) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Item Not Found</h2>
          <p className="text-gray-600 mb-4">The item you're looking for doesn't exist or has been deleted.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
            <div>
              <h1 className="text-xl font-bold text-gray-900">Edit Item</h1>
              <p className="text-sm text-gray-500">Modify expiration date and quantity</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {originalRecord.id.slice(0, 8)}...
          </Badge>
        </div>
      </header>

      {/* Success Message */}
      {saveSuccess && (
        <div className="mx-4 mt-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Item updated successfully! Redirecting...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <form onSubmit={handleSave} className="p-4 space-y-6">
        {/* Current Status Overview */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span>Current Item Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Current Status:</p>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {originalRecord.status === 'expired' ? '🔴' : 
                     originalRecord.status === 'near-expiration' ? '🟡' : '🟢'}
                  </span>
                  <Badge variant="outline" className={getStatusColor(originalRecord.status)}>
                    {originalRecord.status.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Days Remaining:</p>
                <p className={`font-semibold ${
                  originalRecord.remainingDays < 0 ? 'text-red-600' :
                  originalRecord.remainingDays <= 7 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {originalRecord.remainingDays < 0 
                    ? `Expired ${Math.abs(originalRecord.remainingDays)} days ago`
                    : originalRecord.remainingDays === 0
                    ? "Expires today"
                    : `${originalRecord.remainingDays} days`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Product Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="barcode">Barcode (Read-only)</Label>
              <Input
                id="barcode"
                type="text"
                value={formatBarcodeForDisplay(form.barcode)}
                className="font-mono bg-gray-50 text-gray-600"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                Barcode cannot be changed to maintain data integrity
              </p>
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
              {originalRecord.itemName !== form.itemName && (
                <p className="text-sm text-blue-600 mt-1">
                  Changed from: "{originalRecord.itemName}"
                </p>
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
              {originalRecord.description !== form.description && (
                <p className="text-sm text-blue-600 mt-1">
                  Changed from: "{originalRecord.description}"
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* MAIN EDITABLE SECTION: Quantity & Expiration */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-green-600" />
              <span>Quantity & Expiration (Editable)</span>
            </CardTitle>
            <p className="text-sm text-green-700">
              Update quantity and expiration date as needed
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quantity Section */}
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <Label className="flex items-center space-x-2 mb-4">
                <Package className="h-4 w-4" />
                <span className="font-semibold">Quantity *</span>
              </Label>
              
              {/* Quantity Controls */}
              <div className="flex items-center space-x-4 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => adjustQuantity(-1)}
                  disabled={form.quantity <= 1}
                  className="h-14 w-14 text-xl"
                >
                  <Minus className="h-6 w-6" />
                </Button>
                
                <div className="flex-1 text-center">
                  <Input
                    type="number"
                    min="1"
                    max="9999"
                    value={form.quantity}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                    className={`text-center text-3xl font-bold h-14 ${errors.quantity ? 'border-red-500' : 'border-green-300'}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Current quantity</p>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => adjustQuantity(1)}
                  disabled={form.quantity >= 9999}
                  className="h-14 w-14 text-xl"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>

              {/* Quick Quantity Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[1, 5, 10, 20].map(qty => (
                  <Button
                    key={qty}
                    type="button"
                    variant={form.quantity === qty ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuickQuantity(qty)}
                    className="h-8"
                  >
                    {qty}
                  </Button>
                ))}
              </div>

              {errors.quantity && (
                <p className="text-sm text-red-600 mb-2">{errors.quantity}</p>
              )}
              
              {originalRecord.quantity !== form.quantity && (
                <div className="p-3 bg-blue-100 rounded border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">
                    Quantity Change: {originalRecord.quantity} → {form.quantity}
                    <span className="ml-2">
                      {form.quantity > originalRecord.quantity ? 
                        `(+${form.quantity - originalRecord.quantity} increase)` : 
                        `(${form.quantity - originalRecord.quantity} decrease)`
                      }
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Expiration Date Section */}
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <Label htmlFor="expirationDate" className="flex items-center space-x-2 mb-4">
                <Clock className="h-4 w-4" />
                <span className="font-semibold">Expiration Date *</span>
              </Label>
              
              <div className="relative mb-4">
                <Input
                  id="expirationDate"
                  type="date"
                  min={getTodayDate()}
                  value={form.expirationDate}
                  onChange={(e) => handleInputChange('expirationDate', e.target.value)}
                  className={`text-lg h-12 ${errors.expirationDate ? 'border-red-500' : 'border-green-300'}`}
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>

              {errors.expirationDate && (
                <p className="text-sm text-red-600 mb-2">{errors.expirationDate}</p>
              )}
              
              {/* Status Preview */}
              {statusPreview && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{statusPreview.icon}</span>
                    <Badge variant="outline" className={statusPreview.badgeColor}>
                      {statusPreview.status}: {statusPreview.message}
                    </Badge>
                  </div>
                  
                  {originalRecord.expirationDate.toISOString().split('T')[0] !== form.expirationDate && (
                    <div className="p-3 bg-blue-100 rounded border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium mb-1">
                        Expiration Date Change:
                      </p>
                      <p className="text-sm text-blue-700">
                        From: {originalRecord.expirationDate.toLocaleDateString()}
                      </p>
                      <p className="text-sm text-blue-700">
                        To: {new Date(form.expirationDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        Status will change from "{originalRecord.status.replace('-', ' ')}" to "{statusPreview.status}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Additional Notes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Optional notes (e.g., storage instructions, brand, location, etc.)"
              value={form.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="resize-none"
            />
            {originalRecord.notes !== form.notes && (
              <p className="text-sm text-blue-600 mt-2">
                Notes have been modified
              </p>
            )}
          </CardContent>
        </Card>

        {/* Changes Summary */}
        {hasChanges() && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <span>Pending Changes Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {originalRecord.itemName !== form.itemName && (
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-yellow-700 font-medium">Name:</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 line-through">"{originalRecord.itemName}"</p>
                      <p className="text-sm text-yellow-700 font-medium">"{form.itemName}"</p>
                    </div>
                  </div>
                )}
                
                {originalRecord.quantity !== form.quantity && (
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-yellow-700 font-medium">Quantity:</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 line-through">{originalRecord.quantity}</p>
                      <p className="text-sm text-yellow-700 font-medium">{form.quantity}</p>
                    </div>
                  </div>
                )}
                
                {originalRecord.expirationDate.toISOString().split('T')[0] !== form.expirationDate && (
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-yellow-700 font-medium">Expiration:</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 line-through">{originalRecord.expirationDate.toLocaleDateString()}</p>
                      <p className="text-sm text-yellow-700 font-medium">{new Date(form.expirationDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Error Messages */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}
          
          {errors.delete && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700">{errors.delete}</p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <Button 
            type="submit" 
            className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
            disabled={isSaving || !hasChanges()}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Saving Changes...
              </>
            ) : hasChanges() ? (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Changes
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                No Changes to Save
              </>
            )}
          </Button>

          {/* Delete Section */}
          {!showDeleteConfirm ? (
            <Button 
              type="button"
              variant="destructive"
              className="w-full h-12"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Delete Item
            </Button>
          ) : (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="font-medium text-red-800">Confirm Deletion</p>
                </div>
                <p className="text-sm text-red-700 mb-4">
                  Are you sure you want to permanently delete <strong>"{originalRecord.itemName}"</strong>? 
                  This action cannot be undone and will remove all associated data including:
                </p>
                <ul className="text-xs text-red-600 mb-4 space-y-1">
                  <li>• Item name and description</li>
                  <li>• Quantity and expiration date</li>
                  <li>• Notes and creation date</li>
                  <li>• All tracking history</li>
                </ul>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-12"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Yes, Delete
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-12"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancel Button */}
          <Link href="/" className="block">
            <Button variant="outline" className="w-full h-12">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel & Go Back
            </Button>
          </Link>
        </div>

        {/* Item Metadata */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-sm text-gray-700">
              <History className="h-4 w-4" />
              <span>Item Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="font-medium text-gray-700">Created:</p>
                <p>{originalRecord.dateCreated.toLocaleDateString()}</p>
                <p className="text-xs text-gray-500">
                  {Math.floor((new Date().getTime() - originalRecord.dateCreated.getTime()) / (1000 * 60 * 60 * 24))} days ago
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Barcode:</p>
                <p className="font-mono text-xs">{formatBarcodeForDisplay(originalRecord.barcode)}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Original Quantity:</p>
                <p>{originalRecord.quantity}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Original Expiration:</p>
                <p>{originalRecord.expirationDate.toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

export default function EditItemPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading item editor...</p>
        </div>
      </div>
    }>
      <EditItemForm />
    </Suspense>
  );
}