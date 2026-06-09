import {
  scheduleLoginWelcomeMessage,
  consumeLoginWelcomeMessage,
  showLoginWelcomeMessage,
} from './loginWelcomeMessage';

describe('loginWelcomeMessage', () => {
  it('schedules welcome once for home screen', () => {
    expect(consumeLoginWelcomeMessage()).toBe(false);
    scheduleLoginWelcomeMessage();
    expect(consumeLoginWelcomeMessage()).toBe(true);
    expect(consumeLoginWelcomeMessage()).toBe(false);
  });

  it('shows welcome alert with custom button and auto dismiss', () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    showLoginWelcomeMessage();
    expect(alertSpy).toHaveBeenCalledWith(
      'התחברת בהצלחה',
      'ברוך שובך ל-DogMate!',
      [{ text: 'איזה כיף !' }],
      { autoDismissMs: 3000, cancelable: false }
    );
    alertSpy.mockRestore();
  });
});
