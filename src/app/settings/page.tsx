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
import {
  Bell,
  Save,
  TestTube,
  Download,
  Upload,
  Info,
} from "lucide-react";

import { settingsService } from "@/lib/db";
import {
  requestNotificationPermission,
  getNotificationPermission,
  getPermissionStatusMessage,
  sendTestNotification,
  isNotificationSupported,
} from "@/lib/notifications";
import type { NotificationSettings } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    daysBeforeExpiration: 7,
    notifyOnExpirationDay: true,
    quantityThreshold: 0, // ✅ 0 = OFF
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    loadSettings();
    setNotificationPermission(getNotificationPermission());
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await settingsService.get();
      setSettings(loaded);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    field: keyof NotificationSettings,
    value: number | boolean
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaveMessage("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      await settingsService.update(settings);
      setSaveMessage("Settings saved successfully");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermission = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  };

  const getPermissionBadgeColor = (permission: NotificationPermission) => {
    switch (permission) {
      case "granted":
        return "bg-green-100 text-green-800 border-green-200";
      case "denied":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Permission</Label>
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

              {isNotificationSupported() &&
                notificationPermission !== "granted" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handlePermission}
                  >
                    Enable Notifications
                  </Button>
                )}

              {notificationPermission === "granted" && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={sendTestNotification}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Send Test Notification
                </Button>
              )}
            </div>

            <Separator />

            <div>
              <Label>Notify before expiration (days)</Label>
              <Input
                type="number"
                min={1}
                value={settings.daysBeforeExpiration}
                onChange={(e) =>
                  handleChange(
                    "daysBeforeExpiration",
                    Number(e.target.value)
                  )
                }
                className="w-24 mt-2"
              />
            </div>

            <div className="flex justify-between items-center">
              <div>
                <Label>Notify on expiration day</Label>
                <p className="text-sm text-gray-500">
                  Receive alerts when items expire today
                </p>
              </div>
              <Switch
                checked={settings.notifyOnExpirationDay}
                onCheckedChange={(v) =>
                  handleChange("notifyOnExpirationDay", v)
                }
              />
            </div>

            <div>
              <Label>Low quantity threshold (0 = off)</Label>
              <Input
                type="number"
                min={0} // ✅ allow OFF
                value={settings.quantityThreshold}
                onChange={(e) =>
                  handleChange(
                    "quantityThreshold",
                    Number(e.target.value)
                  )
                }
                className="w-24 mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/import">
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </Link>
            <Link href="/export">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              App Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>Version: 1.0.0</p>
            <p>Storage: IndexedDB</p>
            <p>Offline Support: Yes</p>
          </CardContent>
        </Card>

        {saveMessage && (
          <div className="text-sm text-center text-green-700">
            {saveMessage}
          </div>
        )}

        <Button
          className="w-full h-12"
          disabled={isSaving}
          onClick={handleSave}
        >
          <Save className="h-5 w-5 mr-2" />
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
