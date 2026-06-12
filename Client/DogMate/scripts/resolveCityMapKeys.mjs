/**
 * One-off helper: fetch API names + resolve CITY_TO_DISTRICT keys to canonical שם_ישוב.
 * Run: node scripts/resolveCityMapKeys.mjs
 */
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fetchAllRecords() {
  return new Promise((resolve, reject) => {
    const all = [];
    let offset = 0;
    const limit = 3200;
    function step() {
      const u = `https://data.gov.il/api/3/action/datastore_search?resource_id=b7cf8f14-64a2-4b33-8d4b-edb286fdbd37&limit=${limit}&offset=${offset}`;
      https
        .get(u, (r) => {
          let d = '';
          r.on('data', (c) => (d += c));
          r.on('end', () => {
            const j = JSON.parse(d);
            if (!j.success) return reject(new Error(j.error?.message || 'ckan'));
            const recs = j.result.records;
            all.push(...recs);
            const total = j.result.total ?? all.length;
            offset += recs.length;
            if (recs.length === 0 || all.length >= total) resolve(all);
            else step();
          });
        })
        .on('error', reject);
    }
    step();
  });
}

function flex(s) {
  return s.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

const mapPath = path.join(__dirname, '../utils/cityToDistrictMap.ts');
const src = fs.readFileSync(mapPath, 'utf8');
const re = /'([^']+)':\s*'(south_district|jerusalem_district|yosh_district|center_district|gush_dan_district|sharon_district|haifa_district|north_district)'/g;
const entries = [];
let m;
while ((m = re.exec(src))) entries.push({ key: m[1], district: m[2] });

(async () => {
  const recs = await fetchAllRecords();
  const exact = new Set();
  const flexToCanonical = new Map();
  const recordByFlex = new Map();
  for (const r of recs) {
    const name = String(r['שם_ישוב'] ?? '').replace(/\s+/g, ' ').trim();
    if (!name) continue;
    exact.add(name);
    const f = flex(name);
    if (!flexToCanonical.has(f)) flexToCanonical.set(f, name);
    recordByFlex.set(f, r);
  }

  const resolved = new Map();
  const unresolved = [];
  for (const { key, district } of entries) {
    let canon = null;
    if (exact.has(key)) canon = key;
    else {
      const f = flex(key);
      canon = flexToCanonical.get(f) ?? null;
    }
    if (!canon) {
      unresolved.push({ key, district });
      continue;
    }
    const prev = resolved.get(canon);
    if (prev != null && prev !== district) {
      console.error('CONFLICT', canon, prev, district);
    }
    resolved.set(canon, district);
  }

  console.log('Input keys', entries.length);
  console.log('Resolved unique', resolved.size);
  console.log('Unresolved', unresolved.length);
  if (unresolved.length) console.log(JSON.stringify(unresolved.slice(0, 30), null, 2));

  const out = {
    resolved: Object.fromEntries([...resolved.entries()].sort((a, b) => a[0].localeCompare(b[0], 'he'))),
    unresolved,
    apiCount: exact.size,
    records: recs.length,
  };
  fs.writeFileSync(path.join(__dirname, 'cityMapResolved.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote scripts/cityMapResolved.json');
})();
