import { describe, expect, it } from "vitest";
import {
  availableStock,
  describeLineOptions,
  missingOptionMessage,
  stockShortageMessage,
} from "./cartOptions";

const shirt = {
  name: "Tişört",
  category: "Giyim",
  stock_quantity: 0,
  product_variants: [
    { id: "v1", size: "M", stock_quantity: 3 },
    { id: "v2", size: "L", stock_quantity: 0 },
  ],
};
const poster = { name: "Poster", category: "Baskılı Ürünler", stock_quantity: 5 };
const mug = { name: "Kupa", category: "Hediyelik Eşyalar", stock_quantity: 2 };

describe("missingOptionMessage", () => {
  it("requires size and year for clothing", () => {
    expect(missingOptionMessage(shirt, {})).toBe("Lütfen beden seçin");
    expect(missingOptionMessage(shirt, { variantId: "v1" })).toBe("Lütfen mezuniyet yılını seçin");
    expect(missingOptionMessage(shirt, { variantId: "v1", graduationYear: 2010 })).toBeNull();
  });
  it("requires only year for printed products", () => {
    expect(missingOptionMessage(poster, {})).toBe("Lütfen mezuniyet yılını seçin");
    expect(missingOptionMessage(poster, { graduationYear: 1900 })).toBe("Lütfen mezuniyet yılını seçin");
    expect(missingOptionMessage(poster, { graduationYear: 2000 })).toBeNull();
  });
  it("requires nothing for other categories", () => {
    expect(missingOptionMessage(mug, {})).toBeNull();
  });
});

describe("availableStock", () => {
  it("uses variant stock for clothing, total before selection", () => {
    expect(availableStock(shirt)).toBe(3);
    expect(availableStock(shirt, "v1")).toBe(3);
    expect(availableStock(shirt, "v2")).toBe(0);
    expect(availableStock(shirt, "gone")).toBe(0);
  });
  it("uses product stock otherwise", () => {
    expect(availableStock(poster)).toBe(5);
    expect(availableStock(mug, null)).toBe(2);
  });
});

describe("stockShortageMessage", () => {
  it("returns null when stock suffices", () => {
    expect(stockShortageMessage(shirt, "v1", 3)).toBeNull();
  });
  it("names product and size", () => {
    expect(stockShortageMessage(shirt, "v1", 4)).toBe("Tişört (M) için yeterli stok yok (mevcut: 3 adet)");
    expect(stockShortageMessage(shirt, "v2", 1)).toBe("Tişört (L) tükendi");
    expect(stockShortageMessage(mug, null, 3)).toBe("Kupa için yeterli stok yok (mevcut: 2 adet)");
  });
});

describe("describeLineOptions", () => {
  it("joins size and year", () => {
    expect(describeLineOptions({ product_variants: { size: "M" }, graduation_year: 2010 })).toBe(
      "Beden: M · Mezuniyet Yılı: 2010",
    );
    expect(describeLineOptions({ size: "L" })).toBe("Beden: L");
    expect(describeLineOptions({})).toBe("");
  });
});
