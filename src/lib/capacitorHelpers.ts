import { Capacitor } from '@capacitor/core';
import { Toast } from '@capacitor/toast';
import { Dialog } from '@capacitor/dialog';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

// Check if running as native app
export const isNative = () => Capacitor.isNativePlatform();

// Toast notifications (replaces browser alerts)
export const showToast = async (message: string, duration: 'short' | 'long' = 'short') => {
  if (isNative()) {
    await Toast.show({ text: message, duration });
  } else {
    // Fallback to console for web
    console.log('Toast:', message);
  }
};

// Native confirmation dialogs
export const showConfirmDialog = async (
  title: string,
  message: string,
  okButtonTitle = 'OK',
  cancelButtonTitle = 'Cancel'
): Promise<boolean> => {
  if (isNative()) {
    const { value } = await Dialog.confirm({
      title,
      message,
      okButtonTitle,
      cancelButtonTitle
    });
    return value;
  } else {
    return window.confirm(`${title}\n\n${message}`);
  }
};

// Alert dialog
export const showAlert = async (title: string, message: string) => {
  if (isNative()) {
    await Dialog.alert({ title, message });
  } else {
    window.alert(`${title}\n\n${message}`);
  }
};

// Haptic feedback
export const hapticImpact = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (isNative()) {
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy
    };
    await Haptics.impact({ style: styleMap[style] });
  }
};

export const hapticNotification = async (type: 'success' | 'warning' | 'error' = 'success') => {
  if (isNative()) {
    const typeMap = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error
    };
    await Haptics.notification({ type: typeMap[type] });
  }
};

export const hapticVibrate = async () => {
  if (isNative()) {
    await Haptics.vibrate();
  }
};

// Local notifications for task reminders
export const scheduleTaskReminder = async (
  taskId: string,
  taskText: string,
  scheduledTime: Date
) => {
  if (isNative()) {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      const request = await LocalNotifications.requestPermissions();
      if (request.display !== 'granted') {
        return false;
      }
    }

    // Generate unique numeric ID from task UUID
    const notificationId = Math.abs(taskId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0)) % 2147483647;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: 'Task Reminder',
          body: taskText,
          schedule: { at: scheduledTime },
          sound: 'beep.wav',
          actionTypeId: 'TASK_REMINDER'
        }
      ]
    });
    return true;
  }
  return false;
};

export const cancelTaskReminder = async (taskId: string) => {
  if (isNative()) {
    const notificationId = Math.abs(taskId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0)) % 2147483647;

    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }]
    });
  }
};

// Preferences (local settings storage)
export const setPreference = async (key: string, value: string) => {
  if (isNative()) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
};

export const getPreference = async (key: string): Promise<string | null> => {
  if (isNative()) {
    const { value } = await Preferences.get({ key });
    return value;
  } else {
    return localStorage.getItem(key);
  }
};

export const removePreference = async (key: string) => {
  if (isNative()) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
};

// Network status
export const getNetworkStatus = async () => {
  if (isNative()) {
    return await Network.getStatus();
  }
  return { connected: navigator.onLine, connectionType: 'unknown' as const };
};

export const addNetworkListener = (callback: (connected: boolean) => void) => {
  if (isNative()) {
    return Network.addListener('networkStatusChange', (status) => {
      callback(status.connected);
    });
  } else {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return {
      remove: () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }
};

// File system for downloads
export const saveFileToDevice = async (
  filename: string,
  data: string,
  directory: 'Documents' | 'Downloads' = 'Downloads'
): Promise<string | null> => {
  if (isNative()) {
    try {
      const result = await Filesystem.writeFile({
        path: filename,
        data,
        directory: directory === 'Documents' ? Directory.Documents : Directory.External,
        recursive: true
      });
      return result.uri;
    } catch (error) {
      console.error('Error saving file:', error);
      return null;
    }
  } else {
    // Web fallback - trigger download
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return filename;
  }
};

export const saveImageToDevice = async (
  filename: string,
  base64Data: string
): Promise<string | null> => {
  if (isNative()) {
    try {
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.External,
        recursive: true
      });
      return result.uri;
    } catch (error) {
      console.error('Error saving image:', error);
      return null;
    }
  } else {
    // Web fallback - trigger download
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64Data}`;
    a.download = filename;
    a.click();
    return filename;
  }
};

// Screen orientation lock
export const lockPortrait = async () => {
  if (isNative()) {
    await ScreenOrientation.lock({ orientation: 'portrait' });
  }
};

// Keyboard management
export const hideKeyboard = async () => {
  if (isNative()) {
    await Keyboard.hide();
  }
};

export const addKeyboardListeners = (
  onShow?: (height: number) => void,
  onHide?: () => void
) => {
  if (isNative()) {
    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      onShow?.(info.keyboardHeight);
    });
    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      onHide?.();
    });
    return {
      remove: async () => {
        await (await showListener).remove();
        await (await hideListener).remove();
      }
    };
  }
  return { remove: () => {} };
};

// App lifecycle
export const addAppStateListener = (callback: (isActive: boolean) => void) => {
  if (isNative()) {
    return App.addListener('appStateChange', ({ isActive }) => {
      callback(isActive);
    });
  }
  return { remove: () => {} };
};

export const exitApp = () => {
  if (isNative()) {
    App.exitApp();
  }
};
