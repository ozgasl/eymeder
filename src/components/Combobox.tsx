import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizePlace } from "@/lib/placeNormalize";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  id?: string;
  "aria-label"?: string;
  placeholder: string;
  searchPlaceholder: string;
  // true: typing something not on the list offers to save it as typed (open
  // list, e.g. universities). false: only listed values can be picked.
  allowCustom?: boolean;
  disabled?: boolean;
}

// Matches the way people type Turkish place names: "istanbul" finds
// "İstanbul", "turkiye" finds "Türkiye". cmdk's built-in filter lowercases
// without Turkish folding, so İ/ı/ç/ş/ğ/ö/ü would not match their ASCII forms.
const turkishAwareFilter = (itemValue: string, search: string) =>
  normalizePlace(itemValue).includes(normalizePlace(search)) ? 1 : 0;

/**
 * Searchable single-choice picker built on cmdk. Used for universities
 * (`allowCustom`), countries and Turkish provinces (closed lists).
 */
export function Combobox({
  value,
  onChange,
  options,
  id,
  placeholder,
  searchPlaceholder,
  allowCustom = false,
  disabled,
  ...rest
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const trimmedSearch = search.trim();
  const hasExactMatch = options.some(
    (o) => o.localeCompare(trimmedSearch, "tr", { sensitivity: "base" }) === 0
  );

  const pick = (next: string) => {
    onChange(next);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={rest["aria-label"]}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command filter={turkishAwareFilter}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => pick(option)}>
                  <Check
                    className={cn("mr-2 h-4 w-4", value === option ? "opacity-100" : "opacity-0")}
                    aria-hidden="true"
                  />
                  {option}
                </CommandItem>
              ))}
              {allowCustom && trimmedSearch && !hasExactMatch && (
                <CommandItem value={`__custom__${trimmedSearch}`} onSelect={() => pick(trimmedSearch)}>
                  "{trimmedSearch}" olarak kullan
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
