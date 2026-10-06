import { Alert, Platform, type AlertButton } from 'react-native';

// Alert.alert gjør ingenting i react-native-web, så på web bruker vi nettleserens egne dialoger.
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  const cancelButton = buttons?.find((button) => button.style === 'cancel');
  const actionButton = buttons?.find((button) => button.style !== 'cancel');

  if (cancelButton && actionButton) {
    if (window.confirm(text)) {
      actionButton.onPress?.();
    } else {
      cancelButton.onPress?.();
    }
    return;
  }

  window.alert(text);
  actionButton?.onPress?.();
}
