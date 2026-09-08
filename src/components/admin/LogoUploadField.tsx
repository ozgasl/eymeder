import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { brandService } from "@/services/brandService";
import {
  LOGO_ACCEPT_ATTRIBUTE,
  LOGO_FORMAT_LABEL,
  MAX_LOGO_BYTES,
  validateLogoFile,
} from "@/lib/imageUpload";
import { ImageOff, Loader2, Upload, X } from "lucide-react";

interface LogoUploadFieldProps {
  /** The stored logo URL — an uploaded file's public URL or an external address. */
  value: string;
  onChange: (url: string) => void;
  /** Used to name the stored file, so the bucket stays browsable. */
  brandName: string;
  disabled?: boolean;
}

/**
 * Picks a logo for a brand: upload a file, or paste an address for a logo that
 * lives on the brand's own site. Either way the result is a URL in
 * `brands.logo_url`, so nothing about how logos are stored or displayed
 * changes for brands that already have one.
 *
 * Replacing or clearing the field does NOT delete the previous file here: the
 * brand row still points at it until the form is saved, and a cancelled edit
 * would leave a brand showing a broken image. admin.tsx cleans up after a
 * successful save instead.
 */
export function LogoUploadField({ value, onChange, brandName, disabled }: LogoUploadFieldProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const shown = preview || value;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Let the same file be picked again after a failure.
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    const validation = validateLogoFile(file);
    if (!validation.ok) {
      toast({ title: "Dosya kabul edilmedi", description: validation.message, variant: "destructive" });
      return;
    }

    // Show the picked file straight away; the upload can take a moment.
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    const { url, error } = await brandService.uploadLogo(file, brandName || "marka");

    setUploading(false);
    URL.revokeObjectURL(localPreview);
    setPreview(null);

    if (error || !url) {
      toast({
        title: "Logo yüklenemedi",
        description: error?.message || "Bilinmeyen bir hata oluştu.",
        variant: "destructive",
      });
      return;
    }

    onChange(url);
    toast({ title: "Logo yüklendi" });
  };

  return (
    <div className="space-y-2">
      <Label>Logo</Label>

      <div className="flex items-start gap-3">
        <div className="h-20 w-20 shrink-0 rounded-md border bg-muted/40 flex items-center justify-center overflow-hidden">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="Logo önizleme" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageOff className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {value ? "Logoyu Değiştir" : "Dosya Yükle"}
            </Button>

            {value && !uploading && (
              <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange("")}>
                <X className="h-4 w-4 mr-2" /> Kaldır
              </Button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={LOGO_ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={handleFile}
          />

          <p className="text-xs text-muted-foreground">
            {LOGO_FORMAT_LABEL} · en fazla {MAX_LOGO_BYTES / (1024 * 1024)} MB
          </p>

          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="ya da logo adresini yapıştırın"
            disabled={disabled || uploading}
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}
