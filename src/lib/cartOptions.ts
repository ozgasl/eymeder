// Pure helpers for the buyer side of the store: which options a product
// needs, and how much stock a cart/order line can draw on.

import {
  categoryUsesGraduationYear,
  categoryUsesSizes,
  isValidGraduationYear,
  totalStock,
} from "./productOptions";

export interface StockVariant {
  id: string;
  size: string;
  stock_quantity: number;
}

export interface StockProduct {
  name?: string | null;
  category?: string | null;
  stock_quantity?: number | null;
  product_variants?: StockVariant[] | null;
}

export interface LineOptions {
  variantId?: string | null;
  graduationYear?: number | null;
}

/** Turkish message naming the first missing required option, or null. */
export function missingOptionMessage(
  product: StockProduct,
  options: LineOptions,
): string | null {
  if (categoryUsesSizes(product.category) && !options.variantId) {
    return "Lütfen beden seçin";
  }
  if (categoryUsesGraduationYear(product.category)) {
    if (options.graduationYear == null || !isValidGraduationYear(options.graduationYear)) {
      return "Lütfen mezuniyet yılını seçin";
    }
  }
  return null;
}

export function findVariant(
  product: StockProduct,
  variantId: string | null | undefined,
): StockVariant | null {
  if (!variantId) return null;
  return (product.product_variants ?? []).find((v) => v.id === variantId) ?? null;
}

/**
 * Stock available for a line. For clothing with a chosen size it is the
 * size's stock (0 if the size no longer exists); before a size is chosen it is
 * the product total. Other categories use the product's own stock.
 */
export function availableStock(product: StockProduct, variantId?: string | null): number {
  if (categoryUsesSizes(product.category)) {
    if (!variantId) return totalStock(product);
    return findVariant(product, variantId)?.stock_quantity ?? 0;
  }
  return product.stock_quantity ?? 0;
}

/** Turkish message when `quantity` exceeds stock, otherwise null. */
export function stockShortageMessage(
  product: StockProduct,
  variantId: string | null | undefined,
  quantity: number,
): string | null {
  const stock = availableStock(product, variantId);
  if (quantity <= stock) return null;
  const variant = findVariant(product, variantId);
  const label = `${product.name ?? "Ürün"}${variant ? ` (${variant.size})` : ""}`;
  return stock <= 0
    ? `${label} tükendi`
    : `${label} için yeterli stok yok (mevcut: ${stock} adet)`;
}

/** Short description of a line's options, e.g. "Beden: M · Mezuniyet Yılı: 2010". */
export function describeLineOptions(line: {
  product_variants?: { size: string } | null;
  size?: string | null;
  graduation_year?: number | null;
}): string {
  const parts: string[] = [];
  const size = line.product_variants?.size ?? line.size;
  if (size) parts.push(`Beden: ${size}`);
  if (line.graduation_year) parts.push(`Mezuniyet Yılı: ${line.graduation_year}`);
  return parts.join(" · ");
}
