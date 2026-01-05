"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Bell, Save, TestTube, Download, Upload, Info } from "lucide-react";
import { settingsService } from "@/lib/db";
import { 
  requestNotificationPermission, 
  getNotificationPermission, 
  getPermissionStatusMessage,
  sendTestNotification,
  isNotificationSupported
} from "@/lib/notifications";
import type { NotificationSettings } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    daysBeforeExpiration: 7,
    notifyOnExpirationDay: true,
    quantityThreshold: 2
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [saveMessage, setSaveMessage] = useState<string>('');

  useEffect(() => {
    loadSettings();
    setNotificationPermission(getNotificationPermission());
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await settingsService.get();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (field: keyof NotificationSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaveMessage(''); // Clear save message when user makes changes
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      await settingsService.update(settings);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestNotificationPermission = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    
    if (permission === 'granted') {
      setSaveMessage('Notifications enabled successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleTestNotification = () => {
    sendTestNotification();
    setSaveMessage('Test notification sent!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const getPermissionBadgeColor = (permission: NotificationPermission) => {
    switch (permission) {
      case 'granted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'denied':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
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
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notification Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Permission Status */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Notification Permission</Label>
                <Badge 
                  variant="outline" 
                  className={getPermissionBadgeColor(notificationPermission)}
                >
                  {notificationPermission}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {getPermissionStatusMessage(notificationPermission)}
              </p>
              
              {!isNotificationSupported() && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <p className="text-sm text-yellow-800">
                    Notifications are not supported in this browser.
                  </p>
                </div>
              )}
              
              {isNotificationSupported() && notificationPermission !== 'granted' && (
                <Button 
                  onClick={handleRequestNotificationPermission}
                  variant="outline"
                  className="w-full"
                >
                  Enable Notifications
                </Button>
              )}
              
              {notificationPermission === 'granted' && (
                <Button 
                  onClick={handleTestNotification}
                  variant="outline"
                  className="w-full"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Send Test Notification
                </Button>
              )}
            </div>

            <Separator />

            {/* Days Before Expiration */}
            <div>
              <Label htmlFor="daysBeforeExpiration">
                Notify X days before expiration
              </Label>
              <div className="flex items-center space-x-3 mt-2">
                <Input
                  id="daysBeforeExpiration"
                  type="number"
                  min="1"
                  max="365"
                  value={settings.daysBeforeExpiration}
                  onChange={(e) => handleSettingChange('daysBeforeExpiration', parseInt(e.target.value) || 1)}
                  className="w-20 text-center"
                />
                <span className="text-sm text-gray-600">days</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Get notified {settings.daysBeforeExpiration} days before items expire
              </p>
            </div>

            {/* Expiration Day Notification */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifyOnExpirationDay">
                  Notify on expiration day
                </Label>
                <p className="text-sm text-gray-500">
                  Get notified when items expire today
                </p>
              </div>
              <Switch
                id="notifyOnExpirationDay"
                checked={settings.notifyOnExpirationDay}
                onCheckedChange={(checked) => handleSettingChange('notifyOnExpirationDay', checked)}
              />
            </div>

            {/* Quantity Threshold */}
            <div>
              <Label htmlFor="quantityThreshold">
                Low quantity threshold
              </Label>
              <div className="flex items-center space-x-3 mt-2">
                <span className="text-sm text-gray-600">Notify when quantity ≤</span>
                <Input
                  id="quantityThreshold"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.quantityThreshold}
                  onChange={(e) => handleSettingChange('quantityThreshold', parseInt(e.target.value) || 1)}
                  className="w-20 text-center"
                />
                <span className="text-sm text-gray-600">items</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Get notified when item quantity is {settings.quantityThreshold} or less
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Link href="/import" className="block">
                <Button variant="outline" className="w-full h-12">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </Button>
              </Link>
              <Link href="/export" className="block">
                <Button variant="outline" className="w-full h-12">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-600">
              Import product data from Excel/CSV files or export your expiration records
            </p>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>App Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Version</p>
                <p className="font-medium">1.0.0</p>
              </div>
              <div>
                <p className="text-gray-600">Storage</p>
                <p className="font-medium">IndexedDB</p>
              </div>
              <div>
                <p className="text-gray-600">Platform</p>
                <p className="font-medium">Web App</p>
              </div>
              <div>
                <p className="text-gray-600">Offline</p>
                <p className="font-medium">Supported</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-gray-600">
                Expiration Tracker helps you manage product expiration dates with barcode scanning, 
                notifications, and Excel import/export capabilities. All data is stored locally 
                on your device for privacy and offline access.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="space-y-3">
          {saveMessage && (
            <div className={`p-3 rounded border ${
              saveMessage.includes('Failed') 
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <p className="text-sm">{saveMessage}</p>
            </div>
          )}
          
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 text-lg"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}