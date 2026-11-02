import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { productService } from "@/services/productService";
import { acceptAttribute, PRODUCT_IMAGE_UPLOAD, validateUpload } from "@/lib/fileUpload";
import { Camera, ImageOff, Loader2, Upload, X } from "lucide-react";

interface ProductImageFieldProps {
  /** The stored image URL — an uploaded file's public URL or an external address. */
  value: string;
  onChange: (url: string) => void;
  /** Used to name the stored file, so the bucket stays browsable. */
  productName: string;
  disabled?: boolean;
}

/**
 * Picks a product photo: choose a file, take a photo with the device camera, or
 * paste an address. Whatever the route, the result is a URL in
 * `products.image_url`, so products that already have an address are unchanged.
 *
 * Like LogoUploadField, replacing or clearing the field does not delete the old
 * file: the product row still points at it until the form is saved.
 */
export function ProductImageField({ value, onChange, productName, disabled }: ProductImageFieldProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const shown = preview || value;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    // Let the same file be picked again after a failure.
    input.value = "";
    if (!file) return;

    const validation = validateUpload(file, PRODUCT_IMAGE_UPLOAD);
    if (!validation.ok) {
      toast({ title: "Dosya kabul edilmedi", description: validation.message, variant: "destructive" });
      return;
    }

    // Show the picked file straight away; the upload can take a moment.
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    const { url, error } = await productService.uploadImage(file, productName || "urun");

    setUploading(false);
    URL.revokeObjectURL(localPreview);
    setPreview(null);

    if (error || !url) {
      toast({
        title: "Görsel yüklenemedi",
        description: error?.message || "Bilinmeyen bir hata oluştu.",
        variant: "destructive",
      });
      return;
    }

    onChange(url);
    toast({ title: "Görsel yüklendi" });
  };

  return (
    <div className="space-y-2">
      <Label>Ürün Görseli</Label>

      <div className="flex items-start gap-3">
        <div className="h-24 w-24 shrink-0 rounded-md border bg-muted/40 flex items-center justify-center overflow-hidden">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="Ürün görseli önizleme" className="h-full w-full object-cover" />
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
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Dosya Seç
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" /> Fotoğraf Çek
            </Button>

            {value && !uploading && (
              <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange("")}>
                <X className="h-4 w-4 mr-2" /> Kaldır
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptAttribute(PRODUCT_IMAGE_UPLOAD)}
            className="hidden"
            onChange={handleFile}
          />
          {/* On phones and tablets this opens the rear camera; on desktops it falls back to a file picker. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />

          <p className="text-xs text-muted-foreground">
            {PRODUCT_IMAGE_UPLOAD.formatLabel} · en fazla {PRODUCT_IMAGE_UPLOAD.maxBytes / (1024 * 1024)} MB
          </p>

          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="ya da görsel adresini yapıştırın"
            disabled={disabled || uploading}
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}
