// Fixed choices for the store: categories, clothing sizes and graduation years.
// The same values are enforced in the database (see the product options
// migration), so change them in both places.

export const PRODUCT_CATEGORIES = [
  "Baskılı Ürünler",
  "Elektronik",
  "Giyim",
  "Hediyelik Eşyalar",
  "Okul Ürünleri",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CLOTHING_CATEGORY: ProductCategory = "Giyim";
export const PRINTED_CATEGORY: ProductCategory = "Baskılı Ürünler";

export const PRODUCT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;
export type ProductSize = (typeof PRODUCT_SIZES)[number];

export const GRADUATION_YEAR_MIN = 1992;
export const GRADUATION_YEAR_MAX = 2027;

/** Newest first, so recent graduates (the likeliest buyers) are at the top. */
export const GRADUATION_YEARS: number[] = Array.from(
  { length: GRADUATION_YEAR_MAX - GRADUATION_YEAR_MIN + 1 },
  (_, i) => GRADUATION_YEAR_MAX - i,
);

/** Clothing is sold per size, and the size carries its own stock. */
export function categoryUsesSizes(category: string | null | undefined): boolean {
  return category === CLOTHING_CATEGORY;
}

/** The buyer picks a graduation year; it never affects stock. */
export function categoryUsesGraduationYear(category: string | null | undefined): boolean {
  return category === CLOTHING_CATEGORY || category === PRINTED_CATEGORY;
}

export function isValidGraduationYear(year: number): boolean {
  return Number.isInteger(year) && year >= GRADUATION_YEAR_MIN && year <= GRADUATION_YEAR_MAX;
}

/** Total stock of a product: the sum of its sizes for clothing, else its own. */
export function totalStock(product: {
  category?: string | null;
  stock_quantity?: number | null;
  product_variants?: { stock_quantity: number }[] | null;
}): number {
  if (categoryUsesSizes(product.category)) {
    return (product.product_variants ?? []).reduce((sum, v) => sum + v.stock_quantity, 0);
  }
  return product.stock_quantity ?? 0;
}
