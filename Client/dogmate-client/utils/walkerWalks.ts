export type ScheduledWalk = {
  id: string;
  dogName: string;
  ownerName: string;
  dogImageUrl?: string;
  /** ISO 8601 */
  startDateTime: string;
  durationMinutes: number;
};

export function splitWalksByNow(walks: ScheduledWalk[], now = new Date()) {
  const t = now.getTime();
  const upcoming = walks.filter((w) => new Date(w.startDateTime).getTime() > t);
  const history = walks.filter((w) => new Date(w.startDateTime).getTime() <= t);

  const sortAsc = (a: ScheduledWalk, b: ScheduledWalk) =>
    new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
  const sortDesc = (a: ScheduledWalk, b: ScheduledWalk) =>
    new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime();

  return {
    upcoming: [...upcoming].sort(sortAsc),
    history: [...history].sort(sortDesc),
  };
}

export function storageKeyForWalker(userId: string): string {
  return `walker_scheduled_walks_${userId}`;
}
