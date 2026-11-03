import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type NightCounts = { ok: number; retry: number; fail: number };

// Counts lines by status in runs/<night>.jsonl. Null when the file can't be read.
// Lines that don't parse are skipped; never throws.
export function countNight(runsDir: string, night: string): NightCounts | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const parsed: unknown = JSON.parse(line);
      const status =
        typeof parsed === 'object' && parsed !== null && 'status' in parsed ? parsed.status : undefined;
      if (status === 'ok' || status === 'retry' || status === 'fail') counts[status]++;
    } catch {
      // bad line: skipped
    }
  }
  return counts;
}
