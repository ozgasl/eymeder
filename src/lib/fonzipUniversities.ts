import { TURKISH_UNIVERSITIES } from "@/lib/turkishUniversities";
import { normalizePlace } from "@/lib/placeNormalize";

// Turns the free text a Fonzip user typed for "Mezun Olduğum Üniversite" into
// one name from our YÖK list plus, when the text carried one, a department.
// Values it can't place are NOT guessed: the sync reports them so an alias can
// be added here once someone has looked at them.

export interface MappedUniversity {
  university: string;
  department: string | null;
}

export type UniversityMapping =
  | { kind: "mapped"; value: MappedUniversity }
  | { kind: "junk" }
  | { kind: "unmatched" };

// Abbreviations, old names and short forms the list's official names don't
// contain, plus a few foreign schools seen in Fonzip (the profile form accepts
// names that aren't on the list; these are spelled the way the school does).
// Keys are normalizePlace()d text without the word "universitesi"; values are
// either a name from the list or a clean foreign name.
const ALIASES: Record<string, string> = {
  itu: "İstanbul Teknik Üniversitesi",
  odtu: "Orta Doğu Teknik Üniversitesi",
  metu: "Orta Doğu Teknik Üniversitesi",
  ytu: "Yıldız Teknik Üniversitesi",
  gsu: "Galatasaray Üniversitesi",
  boun: "Boğaziçi Üniversitesi",
  bilkent: "İhsan Doğramacı Bilkent Üniversitesi",
  uludag: "Bursa Uludağ Üniversitesi",
  bilgi: "İstanbul Bilgi Üniversitesi",
  iu: "İstanbul Üniversitesi",
  // Old name of Mimar Sinan Güzel Sanatlar Üniversitesi.
  "mimar sinan": "Mimar Sinan Güzel Sanatlar Üniversitesi",
  // Foreign schools. "Amsterdam Üniversitesi" (UvA or VU?) and double entries
  // like "City College / Işık" are deliberately left for a person to decide.
  bocconi: "Bocconi University",
  bond: "Bond University",
  depaul: "DePaul University",
  durham: "Durham University",
  mcgill: "McGill University",
  strayer: "Strayer University",
  "hesser college": "Hesser College",
  "grenoble ecole de commerce": "Grenoble Ecole de Commerce",
  "washington southeastern": "Washington Southeastern University",
};

// Words people write instead of "Üniversitesi".
const UNIVERSITY_WORDS = new Set(["unv", "univ", "uni", "universite", "universitesi", "university"]);
const UNIVERSITY_WORD = "universitesi";

function normalizeWord(word: string): string {
  const w = normalizePlace(word).replace(/[.,;:()]/g, "");
  if (UNIVERSITY_WORDS.has(w)) return UNIVERSITY_WORD;
  // "Üniveristesi", "Üniversıtesi": a typo of the word, not of a name.
  if (/^uni[a-z]{4,9}tesi$/.test(w)) return UNIVERSITY_WORD;
  return w;
}

const tokens = (text: string): string[] =>
  text.split(/\s+/).filter(Boolean).map(normalizeWord).filter(Boolean);

// "marmara universitesi" and the short "marmara" both reach "Marmara
// Üniversitesi". A short form shared by two names is dropped rather than
// resolved to either.
function buildKeys(list: readonly string[]): Map<string, string> {
  const keys = new Map<string, string>();
  const ambiguous = new Set<string>();
  const add = (key: string, name: string) => {
    if (!key || ambiguous.has(key)) return;
    const existing = keys.get(key);
    if (existing && existing !== name) {
      keys.delete(key);
      ambiguous.add(key);
      return;
    }
    keys.set(key, name);
  };
  for (const name of list) {
    const t = tokens(name);
    add(t.join(" "), name);
    if (t[t.length - 1] === UNIVERSITY_WORD) add(t.slice(0, -1).join(" "), name);
  }
  return keys;
}

const KEYS = buildKeys(TURKISH_UNIVERSITIES);
// Aliases join the same prefix lookup (so "Bilkent", "Bilkent Üniversitesi" and
// "Bilkent Üniversitesi İşletme" all work) and win over an automatic key.
for (const [alias, name] of Object.entries(ALIASES)) {
  KEYS.set(alias, name);
  KEYS.set(`${alias} ${UNIVERSITY_WORD}`, name);
}
const MAX_PREFIX_WORDS = 8;

// Placeholders and statuses people typed instead of a university.
const JUNK_WORDS = new Set([
  "ogrenci", "ogrencisi", "ogrencisiyim", "ogrenciyim", "lise", "yok", "mezun", "degilim", "devam", "okumaya",
]);

function isJunk(raw: string): boolean {
  if (!/\p{L}/u.test(raw)) return true; // "-", "—", "."
  const words = tokens(raw);
  return words.length > 0 && words.some((w) => JUNK_WORDS.has(w) || /\d/.test(w)) && !startsWithUniversity(raw);
}

function startsWithUniversity(raw: string): boolean {
  const words = raw.split(/\s+/).filter(Boolean);
  for (let k = Math.min(words.length, MAX_PREFIX_WORDS); k >= 1; k--) {
    if (KEYS.has(words.slice(0, k).map(normalizeWord).join(" "))) return true;
  }
  return false;
}

const trimDepartment = (s: string): string => s.replace(/^[\s\-–—/,.:;()]+|[\s\-–—/,.:;()]+$/g, "").trim();

export function mapFonzipUniversity(raw: string | null | undefined): UniversityMapping {
  const text = (raw ?? "").trim();
  if (!text) return { kind: "unmatched" };
  if (isJunk(text)) return { kind: "junk" };

  // "İstanbul Üniversitesi / İktisat", "Doğuş University - MBA": the part
  // before the first separator is the university, the rest a department.
  const separator = text.search(/\s[-–—]\s|[/(,;]/);
  const head = separator === -1 ? text : text.slice(0, separator);
  const tail = separator === -1 ? "" : text.slice(separator);

  const words = head.split(/\s+/).filter(Boolean);
  for (let k = Math.min(words.length, MAX_PREFIX_WORDS); k >= 1; k--) {
    const name = KEYS.get(words.slice(0, k).map(normalizeWord).join(" "));
    if (!name) continue;
    const department = trimDepartment([...words.slice(k), tail].join(" "));
    return { kind: "mapped", value: { university: name, department: department || null } };
  }
  return { kind: "unmatched" };
}
