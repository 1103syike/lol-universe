import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const entries = db.entries as Array<{ id: string; value: unknown }>;
const base = 'http://127.0.0.1:3000/entries';

let ok = 0;
let fail = 0;

for (const entry of entries) {
  if (!entry.id.startsWith('eus.universe.')) {
    continue;
  }

  const url = `${base}/${encodeURIComponent(entry.id)}`;
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!response.ok) {
      fail += 1;
      console.log(`fail ${entry.id} ${response.status}`);
      continue;
    }
    ok += 1;
  } catch (error) {
    fail += 1;
    console.log(`fail ${entry.id} ${String(error)}`);
  }
}

console.log(JSON.stringify({ ok, fail }, null, 2));
