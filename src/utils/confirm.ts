import { Alert, Platform } from 'react-native';

/**
 * Alert.alert() with multiple buttons (Cancel / Confirm) doesn't reliably
 * show anything on React Native Web — no popup, no error, the tap just does
 * nothing. Browsers don't have a native equivalent of that multi-button
 * native alert, so on web this falls back to window.confirm() instead,
 * which is a real synchronous browser dialog. Native platforms keep using
 * the normal Alert.alert with proper Cancel/Confirm styling.
 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  destructive = true
): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
