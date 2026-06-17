let currentScreenName = 'App';

export function setCurrentScreenName(screenName: string | undefined): void {
  if (screenName && screenName.trim().length > 0) {
    currentScreenName = screenName.trim();
  }
}

export function getCurrentScreenName(): string {
  return currentScreenName;
}
