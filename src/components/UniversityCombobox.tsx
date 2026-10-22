import { Combobox } from "@/components/Combobox";

interface UniversityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  id?: string;
  "aria-label"?: string;
}

/**
 * Searchable university picker: type to filter `options`, or keep typing and
 * pick "<text>" olarak kullan to save a value that isn't on the list — the
 * fixed list is a starting point, not the only allowed input (member
 * university names are free text underneath).
 */
export function UniversityCombobox(props: UniversityComboboxProps) {
  return (
    <Combobox
      {...props}
      allowCustom
      placeholder="Üniversite seçin veya yazın"
      searchPlaceholder="Üniversite ara..."
    />
  );
}
