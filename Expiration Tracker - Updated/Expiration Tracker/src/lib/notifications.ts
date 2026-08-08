"use client";

import type { ExpirationRecord, NotificationSettings } from '@/types';

// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

// Get current notification permission
export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
};

// Show immediate notification
export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (getNotificationPermission() !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  try {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
  } catch (error) {
    console.error('Error showing notification:', error);
  }
};

// Check for items that need notifications
export const checkExpirationNotifications = (
  records: ExpirationRecord[],
  settings: NotificationSettings
): void => {
  if (getNotificationPermission() !== 'granted') {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  records.forEach(record => {
    const expirationDate = new Date(record.expirationDate);
    expirationDate.setHours(0, 0, 0, 0);
    
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check for expiration day notification
    if (settings.notifyOnExpirationDay && daysUntilExpiration === 0) {
      showNotification(
        `${record.itemName} expires today!`,
        {
          body: `${record.itemName} (Qty: ${record.quantity}) expires today. Check your inventory.`,
          tag: `expiry-today-${record.id}`,
          requireInteraction: true
        }
      );
    }

    // Check for advance notification
    if (daysUntilExpiration === settings.daysBeforeExpiration && daysUntilExpiration > 0) {
      showNotification(
        `${record.itemName} expires in ${settings.daysBeforeExpiration} days`,
        {
          body: `${record.itemName} (Qty: ${record.quantity}) will expire on ${record.expirationDate.toLocaleDateString()}`,
          tag: `expiry-warning-${record.id}`
        }
      );
    }

    // Check for low quantity notification
    if (record.quantity <= settings.quantityThreshold) {
      showNotification(
        `Low quantity: ${record.itemName}`,
        {
          body: `Only ${record.quantity} ${record.itemName} remaining. Consider restocking.`,
          tag: `low-quantity-${record.id}`
        }
      );
    }
  });
};

// Schedule daily notification check
export const scheduleDailyNotificationCheck = (
  getRecords: () => Promise<ExpirationRecord[]>,
  getSettings: () => Promise<NotificationSettings>
): void => {
  // Check immediately
  checkNotificationsNow(getRecords, getSettings);

  // Schedule daily checks at 9 AM
  const scheduleNextCheck = () => {
    const now = new Date();
    const tomorrow9AM = new Date();
    tomorrow9AM.setDate(now.getDate() + 1);
    tomorrow9AM.setHours(9, 0, 0, 0);
    
    const timeUntilNext = tomorrow9AM.getTime() - now.getTime();
    
    setTimeout(() => {
      checkNotificationsNow(getRecords, getSettings);
      scheduleNextCheck(); // Schedule the next day
    }, timeUntilNext);
  };

  scheduleNextCheck();
};

// Check notifications immediately
const checkNotificationsNow = async (
  getRecords: () => Promise<ExpirationRecord[]>,
  getSettings: () => Promise<NotificationSettings>
): Promise<void> => {
  try {
    const [records, settings] = await Promise.all([
      getRecords(),
      getSettings()
    ]);
    
    checkExpirationNotifications(records, settings);
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
};

// Notification permission status component helper
export const getPermissionStatusMessage = (permission: NotificationPermission): string => {
  switch (permission) {
    case 'granted':
      return 'Notifications are enabled';
    case 'denied':
      return 'Notifications are blocked. Please enable them in your browser settings.';
    case 'default':
      return 'Click to enable notifications';
    default:
      return 'Notifications not supported';
  }
};

// Test notification
export const sendTestNotification = (): void => {
  if (getNotificationPermission() === 'granted') {
    showNotification(
      'Test Notification',
      {
        body: 'Expiration Tracker notifications are working correctly!',
        tag: 'test-notification'
      }
    );
  }
};

// Clear all notifications with specific tag
export const clearNotifications = (tag: string): void => {
  // Note: There's no standard way to clear notifications programmatically
  // This is a placeholder for future implementation if the API becomes available
  console.log(`Clearing notifications with tag: ${tag}`);
};

// Get notification summary for dashboard
export const getNotificationSummary = (
  records: ExpirationRecord[],
  settings: NotificationSettings
): {
  expiredCount: number;
  expiringTodayCount: number;
  expiringThisWeekCount: number;
  lowQuantityCount: number;
} => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const oneWeekFromNow = new Date(today);
  oneWeekFromNow.setDate(today.getDate() + 7);

  let expiredCount = 0;
  let expiringTodayCount = 0;
  let expiringThisWeekCount = 0;
  let lowQuantityCount = 0;

  records.forEach(record => {
    const expirationDate = new Date(record.expirationDate);
    expirationDate.setHours(0, 0, 0, 0);

    // Count expired items
    if (expirationDate < today) {
      expiredCount++;
    }
    // Count items expiring today
    else if (expirationDate.getTime() === today.getTime()) {
      expiringTodayCount++;
    }
    // Count items expiring this week
    else if (expirationDate <= oneWeekFromNow) {
      expiringThisWeekCount++;
    }

    // Count low quantity items
    if (record.quantity <= settings.quantityThreshold) {
      lowQuantityCount++;
    }
  });

  return {
    expiredCount,
    expiringTodayCount,
    expiringThisWeekCount,
    lowQuantityCount
  };
};