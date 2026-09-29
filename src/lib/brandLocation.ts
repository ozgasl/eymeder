// Returns the URL to open for a brand's location: the pasted Google Maps
// link when it is a real http(s) URL, otherwise a keyless Maps search built
// from the address. Only http(s) is accepted so a pasted `javascript:` value
// can never end up in an href.
export function getBrandMapsLink(brand: { maps_url?: string | null; address?: string | null }): string | null {
  const mapsUrl = brand.maps_url?.trim();
  if (mapsUrl && /^https?:\/\//i.test(mapsUrl)) return mapsUrl;

  const address = brand.address?.trim();
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}
