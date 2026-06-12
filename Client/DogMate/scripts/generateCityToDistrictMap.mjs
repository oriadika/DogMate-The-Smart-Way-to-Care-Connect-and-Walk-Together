/**
 * Builds utils/cityToDistrictMap.ts מ־scripts/cityMapResolved.json + מילוי נפה עד ~400.
 * Run: node scripts/generateCityToDistrictMap.mjs
 */
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGET_MIN = 350;
const TARGET_MAX = 400;

/** מפתחות ישנים מהמפה המקורית → שם מדויק ב־API (לפי למ"ס / data.gov.il) */
const LEGACY_KEY_TO_CANON = {
  'קריית גת': 'קרית גת',
  'קריית מלאכי': 'קרית מלאכי',
  'קריית יערים': 'קרית יערים',
  'קריית ארבע': 'קרית ארבע',
  'קריית עקרון': 'קרית עקרון',
  'קריית אונו': 'קרית אונו',
  'קריית אתא': 'קרית אתא',
  'קריית ביאליק': 'קרית ביאליק',
  'קריית מוצקין': 'קרית מוצקין',
  'קריית ים': 'קרית ים',
  'קריית טבעון': 'קרית טבעון',
  'קריית שמונה': 'קרית שמונה',
  'כוכב יאיר צור יגאל': 'כוכב יאיר',
  'פרדס חנה כרכור': 'פרדס חנה-כרכור',
  'גבעת עדה': 'בנימינה-גבעת עדה',
  'בנימינה גבעת עדה': 'בנימינה-גבעת עדה',
  'נצרת עילית': 'נוף הגליל',
  'סחנין': "סח'נין",
  'גוש חלב': "ג'ש )גוש חלב(",
  'נווה אטיב': 'נווה אטי"ב',
  'מעלות': 'מעלות-תרשיחא',
  'ניר דוד': 'ניר דוד )תל עמל(',
  'עין חרוד': 'עין חרוד )איחוד(',
  'עין חרוד מאוחד': 'עין חרוד )מאוחד(',
  'גבעת חיים': 'גבעת חיים )איחוד(',
  'קדימה צורן': 'קדימה-צורן',
  'מודיעין מכבים רעות': 'מודיעין-מכבים-רעות',
  'יהוד מונוסון': 'יהוד-מונוסון',
  'דאלית אל כרמל': 'דאלית אל-כרמל',
};

const NAPA_TO_DISTRICT = {
  'באר שבע': 'south_district',
  'אשקלון': 'south_district',
  'עכו': 'haifa_district',
  'עפולה': 'north_district',
  'השרון': 'sharon_district',
  'חדרה': 'sharon_district',
  'ירושלים': 'jerusalem_district',
  'צפת': 'north_district',
  'כנרת': 'north_district',
  'פתח תקווה': 'gush_dan_district',
  'רמלה': 'center_district',
  'רחובות': 'center_district',
  'גולן': 'north_district',
  'חיפה': 'haifa_district',
  'נצרת': 'north_district',
  'רמת גן': 'gush_dan_district',
  'תל אביב': 'gush_dan_district',
  'חולון': 'gush_dan_district',
};

const EXCLUDE_NAPA_PREFIX = ['ראמאל', 'חברון', 'טול כרם', 'שכם', 'בית לחם'];

function shouldExcludeNapa(np) {
  const n = np.replace(/\s+/g, ' ').trim();
  if (!n) return true;
  if (EXCLUDE_NAPA_PREFIX.some((p) => n.startsWith(p) || n.includes(p))) return true;
  if (n.includes('ירדן') && n.includes('יריחו')) return true;
  return false;
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

function flex(s) {
  return s.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

function kiryatFlex(s) {
  return flex(s).replace(/קריית/g, 'קרית');
}

/** הסרת גרש/גרשיים לצורך התאמה בלבד */
function stripQuotes(s) {
  return s.replace(/[\u05F3\u05F4'`"״]/g, '');
}

function registerFlexKeys(flexToCanonical, name) {
  const variants = [name, stripQuotes(name)];
  for (const v of variants) {
    for (const fk of [flex(v), kiryatFlex(v)]) {
      if (!flexToCanonical.has(fk)) flexToCanonical.set(fk, name);
      const sq = stripQuotes(fk);
      if (!flexToCanonical.has(sq)) flexToCanonical.set(sq, name);
    }
  }
}

function resolveKeyToCanon(key, exact, flexToCanonical) {
  if (exact.has(key)) return key;
  const legacy = LEGACY_KEY_TO_CANON[key];
  if (legacy && exact.has(legacy)) return legacy;
  const f = flex(key);
  return (
    flexToCanonical.get(f) ??
    flexToCanonical.get(kiryatFlex(f)) ??
    flexToCanonical.get(stripQuotes(f)) ??
    flexToCanonical.get(stripQuotes(kiryatFlex(f))) ??
    null
  );
}

function excludeYishuvName(name) {
  if (name.includes('שבט')) return true;
  return false;
}

function likelyMajorSettlement(name) {
  if (name.length > 26) return false;
  const wc = name.split(' ').filter(Boolean).length;
  if (wc > 4) return false;
  return true;
}

function main() {
  const mapPath = path.join(__dirname, '../utils/cityToDistrictMap.ts');
  const seedPath = path.join(__dirname, 'cityMapResolved.json');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  const run = async () => {
    const recs = await fetchAllRecords();
    if (recs.length < 1000) {
      throw new Error(`CKAN: expected ~1272 settlement records, got ${recs.length} — check network`);
    }
    const exact = new Set();
    const flexToCanonical = new Map();

    for (const r of recs) {
      const name = String(r['שם_ישוב'] ?? '').replace(/\s+/g, ' ').trim();
      if (!name) continue;
      exact.add(name);
      registerFlexKeys(flexToCanonical, name);
    }

    const merged = new Map();

    for (const [name, district] of Object.entries(seed.resolved)) {
      if (exact.has(name)) {
        merged.set(name, district);
      } else {
        const c = resolveKeyToCanon(name, exact, flexToCanonical);
        if (c) merged.set(c, district);
        else console.warn('SKIP seed resolved (no API):', name);
      }
    }

    for (const { key, district } of seed.unresolved) {
      const canon = LEGACY_KEY_TO_CANON[key] ?? resolveKeyToCanon(key, exact, flexToCanonical);
      if (!canon || !exact.has(canon)) {
        console.warn('SKIP unresolved:', key);
        continue;
      }
      if (merged.has(canon)) continue;
      merged.set(canon, district);
    }

    console.log('After seed + unresolved:', merged.size);

    const napas = (r) => String(r['שם_נפה'] ?? '').replace(/\s+/g, ' ').trim();

    const sortedRecs = [...recs].sort((a, b) => {
      const na = String(a['שם_ישוב'] ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      const nb = String(b['שם_ישוב'] ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      return na.length - nb.length || na.localeCompare(nb, 'he');
    });

    for (const r of sortedRecs) {
      if (merged.size >= TARGET_MAX) break;
      const name = String(r['שם_ישוב'] ?? '').replace(/\s+/g, ' ').trim();
      if (!name || merged.has(name)) continue;
      if (excludeYishuvName(name)) continue;
      if (!likelyMajorSettlement(name)) continue;
      const np = napas(r);
      if (shouldExcludeNapa(np)) continue;
      const district = NAPA_TO_DISTRICT[np];
      if (!district) continue;
      merged.set(name, district);
    }

    console.log('After fill:', merged.size);

    if (merged.size < TARGET_MIN) {
      console.warn('WARN: below TARGET_MIN', TARGET_MIN);
    }

    const entries = [...merged.entries()].sort((a, b) => a[0].localeCompare(b[0], 'he'));
    const districtOrder = [
      'south_district',
      'jerusalem_district',
      'yosh_district',
      'center_district',
      'gush_dan_district',
      'sharon_district',
      'haifa_district',
      'north_district',
    ];
    const byDistrict = {};
    for (const d of districtOrder) byDistrict[d] = [];
    for (const [name, d] of entries) {
      if (!byDistrict[d]) byDistrict[d] = [];
      byDistrict[d].push(name);
    }

    let out = `/**
 * מיפוי שם יישוב (כפי שמופיע במאגר data.gov.il / למ"ס) → קוד אזור DogMate.
 * מפתחות חייבים להתאים לערך ה־value בבורר הערים (normalizeName).
 * נוצר ב־scripts/generateCityToDistrictMap.mjs (cityMapResolved.json + נפה).
 */

import type { DistrictOption } from '../constants/israelRegions';

/** אחד משמונת ערכי DISTRICT_OPTIONS */
export type DistrictValue = DistrictOption['value'];

/**
 * אובייקט מיפוי עיר → אזור (מפתח = שם יישוב בעברית, ייחודי).
 * כ־${merged.size} יישובים.
 */
export const CITY_TO_DISTRICT: Record<string, DistrictValue> = {
`;

    for (const d of districtOrder) {
      const names = byDistrict[d];
      if (!names?.length) continue;
      out += `  // --- ${d} ---\n`;
      for (const name of names) {
        const esc = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        out += `  '${esc}': '${d}',\n`;
      }
      out += '\n';
    }

    out += `};

/**
 * מחזיר את קוד האזור לפי שם יישוב, או null אם אין במפה.
 */
export function getRegionByCity(cityName: string): DistrictValue | null {
  const key = cityName.replace(/\\s+/g, ' ').trim();
  if (!key) return null;
  const hit = CITY_TO_DISTRICT[key];
  return hit ?? null;
}
`;

    fs.writeFileSync(mapPath, out, 'utf8');
    console.log('Wrote', mapPath, 'entries', merged.size);
  };

  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

main();
