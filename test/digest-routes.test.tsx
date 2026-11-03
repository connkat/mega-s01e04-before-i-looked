import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const NORMAL = '2026-01-01';
const EMPTY = '2026-01-02';
const BAD = '2026-01-03';
const MISSING = '2026-01-09';

const line = (o: Record<string, unknown>) => JSON.stringify(o);

let tmp: string;
let app: ReturnType<typeof createApp>;

type ApiRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: string;
  lastError: string | null;
  first: string;
  last: string;
};
type ApiBody = { night: string; rows: ApiRow[]; badLines: number };

// Job names from the page's table rows, in order (first cell of each body row).
function pageJobs(html: string): string[] {
  const jobs: string[] = [];
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const td = /<td[^>]*>([\s\S]*?)<\/td>/.exec(tr[1] ?? '');
    if (td) jobs.push((td[1] ?? '').replace(/<[^>]*>/g, '').trim());
  }
  return jobs;
}

beforeAll(() => {
  process.env.LANE_MARKER = 'TEST-MARKER';
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-digest-'));
  // Two jobs, written out of order; zeta has no owner.
  fs.writeFileSync(
    path.join(tmp, `${NORMAL}.jsonl`),
    [
      line({ at: '2026-01-01T01:00:00+01:00', job: 'zeta', status: 'ok', owner: null }),
      line({ at: '2026-01-01T01:05:00+01:00', job: 'alpha', status: 'retry', owner: 'kat', error: 'timeout' }),
      line({ at: '2026-01-01T01:10:00+01:00', job: 'alpha', status: 'ok', owner: 'kat' }),
    ].join('\n') + '\n',
  );
  fs.writeFileSync(path.join(tmp, `${EMPTY}.jsonl`), '');
  fs.writeFileSync(
    path.join(tmp, `${BAD}.jsonl`),
    [
      line({ at: '2026-01-03T02:00:00+01:00', job: 'beta', status: 'ok', owner: 'kat' }),
      '{"at":"2026-01-03T02:05:00+01:00","job":"gam',
      line({ at: '2026-01-03T02:10:00+01:00', job: 'alpha', status: 'fail', owner: 'kat', error: 'boom' }),
    ].join('\n') + '\n',
  );
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: tmp,
  });
});

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('renders the night in the layout with rows sorted by job', async () => {
    const res = await app.request(`/digest/${NORMAL}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(pageJobs(html)).toEqual(['alpha', 'zeta']);
    expect(html).toContain('—');
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app.request(`/digest/${MISSING}`);
    expect(res.status).toBe(404);
  });

  it('says nothing ran for an empty file', async () => {
    const res = await app.request(`/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('reports lines that did not parse and marks fail rows', async () => {
    const res = await app.request(`/digest/${BAD}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 line(s) did not parse');
    expect(html).toContain('class="warn"');
    expect(pageJobs(html)).toEqual(['alpha', 'beta']);
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the rows as JSON, sorted by job', async () => {
    const res = await app.request(`/api/digest/${NORMAL}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ApiBody;
    expect(body.night).toBe(NORMAL);
    expect(body.badLines).toBe(0);
    expect(body.rows).toEqual([
      {
        job: 'alpha',
        owner: 'kat',
        runs: 2,
        retries: 1,
        lastStatus: 'ok',
        lastError: 'timeout',
        first: '2026-01-01T01:05:00+01:00',
        last: '2026-01-01T01:10:00+01:00',
      },
      {
        job: 'zeta',
        owner: null,
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        first: '2026-01-01T01:00:00+01:00',
        last: '2026-01-01T01:00:00+01:00',
      },
    ]);
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app.request(`/api/digest/${MISSING}`);
    expect(res.status).toBe(404);
  });

  it('returns no rows for an empty file', async () => {
    const res = await app.request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ApiBody;
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts lines that did not parse', async () => {
    const res = await app.request(`/api/digest/${BAD}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ApiBody;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha', 'beta']);
  });
});

describe('page and JSON agree', () => {
  it.each([NORMAL, BAD])('lists the same jobs in the same order for %s', async (night) => {
    const html = await (await app.request(`/digest/${night}`)).text();
    const body = (await (await app.request(`/api/digest/${night}`)).json()) as ApiBody;
    expect(body.rows.map((r) => r.job)).toEqual(pageJobs(html));
  });
});
