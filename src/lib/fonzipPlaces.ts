import { TURKEY, canonicalCountry } from "@/lib/countries";
import { canonicalTurkishCity } from "@/lib/turkishCities";
import { normalizePlace } from "@/lib/placeNormalize";

// Turns what a Fonzip user typed for city / district / country into our
// canonical country + city, or says it can't. Fonzip's own `country_text` is
// nearly always empty, so the country mostly comes from recognizing the city.

// Istanbul's districts: Fonzip members often type one where the city goes
// ("Kadıköy") or leave the city empty and only fill the district, and most of
// the association lives in Istanbul. "Eyüp" is the short form of Eyüpsultan.
const ISTANBUL_DISTRICTS = [
  "Adalar", "Arnavutköy", "Ataşehir", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir",
  "Bayrampaşa", "Beşiktaş", "Beykoz", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy",
  "Esenler", "Esenyurt", "Eyüpsultan", "Eyüp", "Fatih", "Gaziosmanpaşa", "Güngören", "Kadıköy",
  "Kağıthane", "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer", "Silivri",
  "Sultanbeyli", "Sultangazi", "Şile", "Şişli", "Tuzla", "Ümraniye", "Üsküdar", "Zeytinburnu",
];
const ISTANBUL_DISTRICT_KEYS: ReadonlySet<string> = new Set(ISTANBUL_DISTRICTS.map(normalizePlace));

const isIstanbulDistrict = (value: string): boolean => ISTANBUL_DISTRICT_KEYS.has(normalizePlace(value));

export type MappedPlace =
  | { ok: true; city: string; country: string }
  // `value` is what couldn't be placed (empty when Fonzip had nothing at all).
  | { ok: false; value: string };

export function mapFonzipPlace(
  cityText: string | null | undefined,
  districtText: string | null | undefined,
  countryText: string | null | undefined
): MappedPlace {
  let city = (cityText ?? "").trim();
  const district = (districtText ?? "").trim();
  const country = canonicalCountry(countryText);

  // "Turkiye" typed into the city box is a country, not a city.
  if (city && !canonicalTurkishCity(city) && canonicalCountry(city)) city = "";

  const province =
    canonicalTurkishCity(city) ??
    (city && isIstanbulDistrict(city) ? "İstanbul" : null) ??
    // Only fall back to the district when the city says nothing: "London" with
    // district "Chelsea" must not become İstanbul.
    (!city && district && isIstanbulDistrict(district) ? "İstanbul" : null);

  if (province) return { ok: true, city: province, country: TURKEY };

  // Abroad: needs both a known country and a city to be worth writing.
  if (country && country !== TURKEY && city) return { ok: true, city, country };

  return { ok: false, value: city || district };
}
