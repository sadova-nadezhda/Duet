import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * В react-native-web Alert.alert ничего не показывает.
 * Подменяем его на браузерные alert/confirm, чтобы ошибки и подтверждения работали в веб-версии.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
    const hasCancel = (buttons ?? []).some((b) => b.style === 'cancel');

    if (actions.length === 0) {
      window.alert(text);
      return;
    }
    if (actions.length === 1) {
      if (!hasCancel) {
        window.alert(text);
        actions[0].onPress?.();
      } else if (window.confirm(text)) {
        actions[0].onPress?.();
      }
      return;
    }
    // Несколько действий: спрашиваем по очереди
    for (const b of actions) {
      if (window.confirm(`${text}\n\n${b.text}?`)) {
        b.onPress?.();
        return;
      }
    }
  };
}
