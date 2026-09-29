import { describe, expect, it } from "vitest";
import { getBrandMapsLink } from "./brandLocation";

describe("getBrandMapsLink", () => {
  it("prefers a pasted http(s) maps link", () => {
    expect(getBrandMapsLink({ maps_url: " https://maps.app.goo.gl/abc ", address: "Kadıköy" })).toBe(
      "https://maps.app.goo.gl/abc"
    );
  });

  it("builds a search link from the address", () => {
    expect(getBrandMapsLink({ address: "Bağdat Cad. 1, Kadıköy" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Ba%C4%9Fdat%20Cad.%201%2C%20Kad%C4%B1k%C3%B6y"
    );
  });

  it("ignores non-http(s) links and falls back to the address", () => {
    expect(getBrandMapsLink({ maps_url: "javascript:alert(1)", address: "Kadıköy" })).toContain(
      "google.com/maps/search"
    );
    expect(getBrandMapsLink({ maps_url: "javascript:alert(1)" })).toBeNull();
  });

  it("returns null with no location", () => {
    expect(getBrandMapsLink({ maps_url: "", address: "  " })).toBeNull();
    expect(getBrandMapsLink({})).toBeNull();
  });
});
