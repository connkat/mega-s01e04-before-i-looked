import type { DigestNight, DigestRow } from '../digest/types.js';

const dash = '—';

function byJob(a: DigestRow, b: DigestRow) {
  return a.job < b.job ? -1 : a.job > b.job ? 1 : 0;
}

export function DigestPage({ digest }: { digest: DigestNight }) {
  const rows = [...digest.rows].sort(byJob);
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const manyRetries = r.retries >= 3;
              const failed = r.lastStatus === 'fail';
              return (
                <tr class={manyRetries || failed ? 'warn' : undefined}>
                  <td>{r.job}</td>
                  <td>{r.owner ?? dash}</td>
                  <td>{r.runs}</td>
                  <td class={manyRetries ? 'warn' : undefined}>{r.retries}</td>
                  <td class={failed ? 'warn' : undefined}>{r.lastStatus}</td>
                  <td>{r.lastError ?? dash}</td>
                  <td>{r.first}</td>
                  <td>{r.last}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 ? <p class="mute">{digest.badLines} line(s) did not parse</p> : null}
    </>
  );
}

export function NoDigest({ night }: { night: string }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class="mute">no run log for that night</p>
    </>
  );
}
