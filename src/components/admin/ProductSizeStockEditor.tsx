import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_SIZES } from "@/lib/productOptions";

/** Per-size stock as typed in the form: a size is on sale only when it has an entry. */
export type SizeStockMap = Record<string, string>;

interface ProductSizeStockEditorProps {
  value: SizeStockMap;
  onChange: (next: SizeStockMap) => void;
  disabled?: boolean;
}

/** Checkbox + stock field per clothing size. Only checked sizes are saved. */
export function ProductSizeStockEditor({ value, onChange, disabled }: ProductSizeStockEditorProps) {
  const toggle = (size: string, checked: boolean) => {
    const next = { ...value };
    if (checked) next[size] = next[size] ?? "0";
    else delete next[size];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label>Bedenler ve Stok *</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PRODUCT_SIZES.map((size) => {
          const checked = size in value;
          return (
            <div key={size} className="flex items-center gap-3 rounded-md border p-2">
              <Checkbox
                id={`product_size_${size}`}
                checked={checked}
                disabled={disabled}
                onCheckedChange={(state) => toggle(size, state === true)}
              />
              <Label htmlFor={`product_size_${size}`} className="w-10 font-medium">
                {size}
              </Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={checked ? value[size] : ""}
                disabled={disabled || !checked}
                onChange={(e) => onChange({ ...value, [size]: e.target.value })}
                placeholder="Stok"
                aria-label={`${size} bedeni stok adedi`}
                className="h-8"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
