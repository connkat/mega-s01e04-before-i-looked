import type { DigestRow } from './types.js';

/** Rows in page order: by job, plain string compare. Returns a new array. */
export function sortRows(rows: DigestRow[]): DigestRow[] {
  return [...rows].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
}
