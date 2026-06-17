let appInitializing = false;

export function setAppInitializing(active: boolean): void {
  appInitializing = active;
}

export function isAppInitializing(): boolean {
  return appInitializing;
}
