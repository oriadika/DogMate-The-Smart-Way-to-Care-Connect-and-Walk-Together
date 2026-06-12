export type NestedRouteParams = Record<string, unknown> & {
  screen?: string;
  params?: Record<string, unknown>;
};

export function flattenRouteParams(params?: Record<string, unknown>): Record<string, unknown> {
  if (!params || typeof params !== 'object') return {};

  const { screen: _screen, params: nested, ...rest } = params as NestedRouteParams;
  const merged: Record<string, unknown> = { ...(rest ?? {}) };

  if (nested && typeof nested === 'object') {
    Object.assign(merged, flattenRouteParams(nested as Record<string, unknown>));
  }

  return merged;
}
