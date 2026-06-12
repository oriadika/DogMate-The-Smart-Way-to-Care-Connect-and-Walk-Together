/**
 * ולידציה מקומית ל־CITY_TO_DISTRICT: ספירה, כפילויות, ערכי מחוז תקינים.
 * אופציונלי: node scripts/validateCityMap.mjs --online — בודק שכל מפתח קיים ב־CKAN (דורש רשת).
 */
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DISTRICTS = new Set([
  'south_district',
  'jerusalem_district',
  'yosh_district',
  'center_district',
  'gush_dan_district',
  'sharon_district',
  'haifa_district',
  'north_district',
]);

function parseMapFromTs(src) {
  const re =
    /'([^']+)':\s*'(south_district|jerusalem_district|yosh_district|center_district|gush_dan_district|sharon_district|haifa_district|north_district)'/g;
  const entries = [];
  let m;
  while ((m = re.exec(src))) entries.push({ key: m[1], district: m[2] });
  return entries;
}

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

async function main() {
  const mapPath = path.join(__dirname, '../utils/cityToDistrictMap.ts');
  const src = fs.readFileSync(mapPath, 'utf8');
  const entries = parseMapFromTs(src);
  const keys = entries.map((e) => e.key);
  const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
  let badDistrict = 0;
  for (const e of entries) {
    if (!DISTRICTS.has(e.district)) badDistrict++;
  }

  console.log('CITY_TO_DISTRICT entries:', entries.length);
  console.log('Duplicate keys:', [...new Set(dup)].length ? [...new Set(dup)] : 'none');
  console.log('Invalid district values:', badDistrict || 'none');

  if (entries.length < 350 || entries.length > 420) {
    console.warn('WARN: expected roughly 350–400 entries');
  }

  const online = process.argv.includes('--online');
  if (!online) {
    console.log('(Skip CKAN check; run with --online to verify keys against data.gov.il)');
    process.exit(dup.length || badDistrict ? 1 : 0);
  }

  const recs = await fetchAllRecords();
  if (recs.length < 1000) {
    console.error('CKAN fetch incomplete:', recs.length);
    process.exit(1);
  }
  const exact = new Set();
  for (const r of recs) {
    const name = String(r['שם_ישוב'] ?? '').replace(/\s+/g, ' ').trim();
    if (name) exact.add(name);
  }
  const missing = keys.filter((k) => !exact.has(k));
  console.log('Keys not in CKAN שם_ישוב:', missing.length);
  if (missing.length) console.log(missing.slice(0, 40));
  process.exit(missing.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
