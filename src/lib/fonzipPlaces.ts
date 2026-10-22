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

// Vehicle-plate codes, which some members type instead of the city ("34").
const PLATE_CODES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
  "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri",
  "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye",
  "Düzce",
];

function provinceFromPlate(value: string): string | null {
  if (!/^\d{1,2}$/.test(value)) return null;
  return PLATE_CODES[Number(value) - 1] ?? null;
}

// Foreign cities with an unambiguous country that members wrote without one.
// Short on purpose: it grows when a Fonzip preview shows another that matters.
const KNOWN_FOREIGN_CITIES: Record<string, { city: string; country: string }> = {
  bruksel: { city: "Brüksel", country: "Belçika" },
  girne: { city: "Girne", country: "Kuzey Kıbrıs (KKTC)" },
  londra: { city: "Londra", country: "İngiltere" },
  london: { city: "Londra", country: "İngiltere" },
  toronto: { city: "Toronto", country: "Kanada" },
  "cape town": { city: "Cape Town", country: "Güney Afrika" },
};

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
    provinceFromPlate(city) ??
    (city && isIstanbulDistrict(city) ? "İstanbul" : null) ??
    // Only fall back to the district when the city says nothing: "London" with
    // district "Chelsea" must not become İstanbul.
    (!city && district && isIstanbulDistrict(district) ? "İstanbul" : null);

  if (province) return { ok: true, city: province, country: TURKEY };

  const foreign = KNOWN_FOREIGN_CITIES[normalizePlace(city)];
  if (foreign && (!country || country === foreign.country)) return { ok: true, ...foreign };

  // Abroad: needs both a known country and a city to be worth writing.
  if (country && country !== TURKEY && city) return { ok: true, city, country };

  return { ok: false, value: city || district };
}
