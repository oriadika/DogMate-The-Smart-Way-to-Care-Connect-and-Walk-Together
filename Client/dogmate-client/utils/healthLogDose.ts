/** True when an administered date ISO string (YYYY-MM-DD) is today in local time. */
export function isAdministeredToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const head = iso.split('T')[0];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return head === today;
}
