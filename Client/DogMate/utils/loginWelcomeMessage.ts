import { Alert } from 'react-native';

const WELCOME_AUTO_DISMISS_MS = 3000;

let showOnNextHomeFocus = false;

export function scheduleLoginWelcomeMessage(): void {
  showOnNextHomeFocus = true;
}

export function consumeLoginWelcomeMessage(): boolean {
  if (!showOnNextHomeFocus) return false;
  showOnNextHomeFocus = false;
  return true;
}

export function showLoginWelcomeMessage(): void {
  Alert.alert(
    'התחברת בהצלחה',
    'ברוך שובך ל-DogMate!',
    [{ text: 'איזה כיף !' }],
    { autoDismissMs: WELCOME_AUTO_DISMISS_MS, cancelable: false }
  );
}
