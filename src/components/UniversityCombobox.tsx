import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface UniversityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  id?: string;
  "aria-label"?: string;
}

/**
 * Searchable university picker: type to filter `options`, or keep typing and
 * pick "<text>'yi kullan" to save a value that isn't on the list — the
 * fixed list is a starting point, not the only allowed input (member
 * university names are free text underneath).
 */
export function UniversityCombobox({ value, onChange, options, id, ...rest }: UniversityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const trimmedSearch = search.trim();
  const hasExactMatch = options.some(
    (o) => o.localeCompare(trimmedSearch, "tr", { sensitivity: "base" }) === 0
  );

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
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Üniversite seçin veya yazın"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Üniversite ara..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  {option}
                </CommandItem>
              ))}
              {trimmedSearch && !hasExactMatch && (
                <CommandItem
                  value={`__custom__${trimmedSearch}`}
                  onSelect={() => {
                    onChange(trimmedSearch);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  "{trimmedSearch}"yi kullan
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
