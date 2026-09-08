import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { brandCodeService, EMPTY_STATS, type BrandCodeStats } from "@/services/brandCodeService";
import { describeCodeWindow, makeUniqueDiscountCode, normalizeDiscountCode } from "@/lib/discountCode";
import { BadgePercent, CheckCircle2, Edit, Eye, EyeOff, Loader2, Plus, Save, Sparkles, Ticket, Trash2, X } from "lucide-react";

interface BrandCodesManagerProps {
  brands: Array<{ id: string; name: string; discount_info?: string | null }>;
}

interface CodeFormState {
  brand_id: string;
  code: string;
  /** True while the code in the form is one we generated, not one the company gave us. */
  generated: boolean;
  label: string;
  discount_info: string;
  is_single_use: boolean;
  valid_from: string;
  valid_until: string;
  max_redemptions: string;
}

const EMPTY_FORM: CodeFormState = {
  brand_id: "",
  code: "",
  generated: false,
  label: "",
  discount_info: "",
  is_single_use: false,
  valid_from: "",
  valid_until: "",
  max_redemptions: "",
};

// <Input type="date"> speaks YYYY-MM-DD; the columns are timestamptz. An end
// date means "usable through that whole day", hence the 23:59:59.
function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromDateInput(value: string, endOfDay = false): string | null {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function friendlyCodeError(error: { code?: string; message?: string } | null): string {
  if (error?.code === "23505") return "Bu indirim kodu başka bir markada kullanılıyor. Farklı bir kod girin.";
  return error?.message || "İşlem başarısız oldu.";
}

/**
 * Admin tooling for brand discount codes: create/edit codes (typed in by hand
 * when the company supplies one, generated from the discount rate when it
 * doesn't), see how each is doing, and mark a code used at the till.
 */
export function BrandCodesManager({ brands }: BrandCodesManagerProps) {
  const { toast } = useToast();
  const [codes, setCodes] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, BrandCodeStats>>({});
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState<CodeFormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Redemption form
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemQr, setRedeemQr] = useState("");
  const [redeemNote, setRedeemNote] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [lastRedemption, setLastRedemption] = useState<{ brandName: string; memberName: string; discountInfo: string } | null>(null);

  const brandNames = useMemo(
    () => Object.fromEntries(brands.map((brand) => [brand.id, brand.name])),
    [brands],
  );

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    const [{ data, error }, { data: statsData }] = await Promise.all([
      brandCodeService.getCodes(),
      brandCodeService.getStats(),
    ]);

    if (error) {
      toast({ title: "Hata", description: friendlyCodeError(error), variant: "destructive" });
    }
    setCodes(data ?? []);
    setStats(statsData ?? {});
    setLoading(false);
  };

  const handleGenerate = (target: "new" | "edit") => {
    const source = target === "new" ? newCode : editing;
    const brand = brands.find((item) => item.id === source?.brand_id);
    if (!brand) {
      toast({ title: "Önce marka seçin", variant: "destructive" });
      return;
    }

    // The generator only needs to avoid codes that already exist; the unique
    // index is the real guard if two admins generate at the same moment.
    const taken = codes.filter((code) => code.id !== editing?.id).map((code) => code.code as string);
    const discountInfo = source.discount_info || brand.discount_info || "";
    const generated = makeUniqueDiscountCode(brand.name, discountInfo, taken);

    if (target === "new") setNewCode({ ...newCode, code: generated, generated: true });
    else setEditing({ ...editing, code: generated, source: "generated" });
  };

  const handleCreate = async () => {
    if (!newCode.brand_id) {
      toast({ title: "Hata", description: "Marka seçin.", variant: "destructive" });
      return;
    }
    const code = normalizeDiscountCode(newCode.code);
    if (!code) {
      toast({ title: "Hata", description: "Kod girin ya da 'Kod Üret'e basın.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await brandCodeService.createCode({
      brand_id: newCode.brand_id,
      code,
      label: newCode.label || null,
      discount_info: newCode.discount_info || null,
      source: newCode.generated ? "generated" : "brand",
      is_single_use: newCode.is_single_use,
      valid_from: fromDateInput(newCode.valid_from),
      valid_until: fromDateInput(newCode.valid_until, true),
      max_redemptions: newCode.max_redemptions ? Number(newCode.max_redemptions) : null,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Hata", description: friendlyCodeError(error), variant: "destructive" });
      return;
    }
    toast({ title: "İndirim kodu eklendi", description: code });
    setNewCode(EMPTY_FORM);
    loadCodes();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    const code = normalizeDiscountCode(editing.code);
    if (!code) {
      toast({ title: "Hata", description: "Kod boş olamaz.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await brandCodeService.updateCode(editing.id, {
      code,
      source: editing.source,
      label: editing.label || null,
      discount_info: editing.discount_info || null,
      is_single_use: editing.is_single_use,
      valid_from: fromDateInput(toDateInput(editing.valid_from)),
      valid_until: fromDateInput(toDateInput(editing.valid_until), true),
      max_redemptions: editing.max_redemptions ? Number(editing.max_redemptions) : null,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Hata", description: friendlyCodeError(error), variant: "destructive" });
      return;
    }
    toast({ title: "İndirim kodu güncellendi" });
    setEditing(null);
    loadCodes();
  };

  const handleToggle = async (code: any) => {
    const { error } = await brandCodeService.updateCode(code.id, { is_active: !code.is_active });
    if (error) {
      toast({ title: "Hata", description: friendlyCodeError(error), variant: "destructive" });
      return;
    }
    toast({ title: code.is_active ? "Kod pasif edildi" : "Kod aktif edildi" });
    loadCodes();
  };

  const handleDelete = async (code: any) => {
    const usage = stats[code.id] ?? EMPTY_STATS;
    const warning = usage.redeemedCount > 0
      ? `\n\nDikkat: bu kodun ${usage.redeemedCount} kullanım kaydı var, silinince o kayıtlar da silinir.`
      : "";
    if (!confirm(`"${code.code}" kodunu silmek istediğinizden emin misiniz?${warning}`)) return;

    const { error } = await brandCodeService.deleteCode(code.id);
    if (error) {
      toast({ title: "Hata", description: friendlyCodeError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Kod silindi" });
    loadCodes();
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      toast({ title: "Hata", description: "İndirim kodu girin.", variant: "destructive" });
      return;
    }

    setRedeeming(true);
    try {
      const result = await brandCodeService.redeemCode({
        code: redeemCode,
        memberQrCode: redeemQr || undefined,
        note: redeemNote || undefined,
      });
      setLastRedemption(result);
      toast({
        title: "Kod kullanıldı olarak işaretlendi",
        description: `${result.brandName} — ${result.memberName}`,
      });
      setRedeemCode("");
      setRedeemQr("");
      setRedeemNote("");
      loadCodes();
    } catch (error: any) {
      setLastRedemption(null);
      toast({ title: "Kullanılamadı", description: error.message, variant: "destructive" });
    } finally {
      setRedeeming(false);
    }
  };

  const codesByBrand = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const code of codes) {
      (grouped[code.brand_id] ??= []).push(code);
    }
    return grouped;
  }, [codes]);

  return (
    <div className="space-y-6">
      {/* Create */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" /> Yeni İndirim Kodu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marka *</Label>
              <Select value={newCode.brand_id} onValueChange={(val) => setNewCode({ ...newCode, brand_id: val })}>
                <SelectTrigger><SelectValue placeholder="Marka seçin" /></SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>İndirim Kodu *</Label>
              <div className="flex gap-2">
                <Input
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value, generated: false })}
                  placeholder="Firma verdiyse yazın"
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={() => handleGenerate("new")} title="İndirim oranından kod üret">
                  <Sparkles className="h-4 w-4 mr-1" /> Kod Üret
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Firma kod vermediyse indirim oranından üretilir (örn. %10 için EYB10).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kampanya Adı</Label>
              <Input
                value={newCode.label}
                onChange={(e) => setNewCode({ ...newCode, label: e.target.value })}
                placeholder="Örn: Yaz kampanyası"
              />
            </div>
            <div className="space-y-2">
              <Label>İndirim Bilgisi (bu koda özel)</Label>
              <Input
                value={newCode.discount_info}
                onChange={(e) => setNewCode({ ...newCode, discount_info: e.target.value })}
                placeholder="Boş bırakılırsa markanın indirimi kullanılır"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Başlangıç</Label>
              <Input type="date" value={newCode.valid_from} onChange={(e) => setNewCode({ ...newCode, valid_from: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Son Kullanma</Label>
              <Input type="date" value={newCode.valid_until} onChange={(e) => setNewCode({ ...newCode, valid_until: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Kullanım Kontenjanı</Label>
              <Input
                type="number"
                min={1}
                value={newCode.max_redemptions}
                onChange={(e) => setNewCode({ ...newCode, max_redemptions: e.target.value })}
                placeholder="Sınırsız"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Switch
              checked={newCode.is_single_use}
              onCheckedChange={(checked) => setNewCode({ ...newCode, is_single_use: checked })}
            />
            <div>
              <p className="text-sm font-medium">Her üyeye özel, tek kullanımlık kod</p>
              <p className="text-xs text-muted-foreground">
                Açıkken her üye kendi kodunu üretir (EYB10-7F3K2A gibi) ve bu kod bir kez kullanılabilir.
                Kapalıyken tüm üyeler aynı kodu kullanır.
              </p>
            </div>
          </div>

          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Kodu Ekle
          </Button>
        </CardContent>
      </Card>

      {/* Redeem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Kodu Kullanıldı Olarak İşaretle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            İndirim markanın kasasında verildiği için kullanım sayacı ancak burada işaretlenerek ilerler.
            Üyeye özel kodlarda sadece kod yeterli; tüm üyelerin aynı kodu kullandığı kampanyalarda
            üyenin QR kodu da gerekir.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>İndirim Kodu *</Label>
              <Input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value)} placeholder="EYB10-7F3K2A" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Üye QR Kodu</Label>
              <Input value={redeemQr} onChange={(e) => setRedeemQr(e.target.value)} placeholder="EYMDER-XXXXXXXX" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Input value={redeemNote} onChange={(e) => setRedeemNote(e.target.value)} placeholder="Opsiyonel" />
            </div>
          </div>
          <Button onClick={handleRedeem} disabled={redeeming} className="w-full">
            {redeeming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Kullanıldı Olarak İşaretle
          </Button>

          {lastRedemption && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              <strong>{lastRedemption.memberName}</strong> için <strong>{lastRedemption.brandName}</strong> indirimi
              kaydedildi{lastRedemption.discountInfo ? ` (${lastRedemption.discountInfo})` : ""}.
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgePercent className="h-5 w-5" /> İndirim Kodları ({codes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : codes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Henüz indirim kodu eklenmedi.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(codesByBrand).map(([brandId, brandCodes]) => (
                <div key={brandId} className="space-y-3">
                  <h3 className="font-semibold">{brandNames[brandId] || "Silinmiş marka"}</h3>
                  {brandCodes.map((code) => {
                    const usage = stats[code.id] ?? EMPTY_STATS;
                    const window = describeCodeWindow(code);

                    if (editing?.id === code.id) {
                      return (
                        <div key={code.id} className="rounded-lg border p-4 space-y-3">
                          <div className="flex gap-2">
                            <Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value, source: "brand" })} className="font-mono" />
                            <Button type="button" variant="outline" onClick={() => handleGenerate("edit")}>
                              <Sparkles className="h-4 w-4 mr-1" /> Kod Üret
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input value={editing.label || ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Kampanya adı" />
                            <Input value={editing.discount_info || ""} onChange={(e) => setEditing({ ...editing, discount_info: e.target.value })} placeholder="İndirim bilgisi" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Başlangıç</Label>
                              <Input type="date" value={toDateInput(editing.valid_from)} onChange={(e) => setEditing({ ...editing, valid_from: fromDateInput(e.target.value) })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Son Kullanma</Label>
                              <Input type="date" value={toDateInput(editing.valid_until)} onChange={(e) => setEditing({ ...editing, valid_until: fromDateInput(e.target.value, true) })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Kontenjan</Label>
                              <Input type="number" min={1} value={editing.max_redemptions ?? ""} onChange={(e) => setEditing({ ...editing, max_redemptions: e.target.value })} placeholder="Sınırsız" />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch checked={editing.is_single_use} onCheckedChange={(checked) => setEditing({ ...editing, is_single_use: checked })} />
                            <span className="text-sm">Her üyeye özel, tek kullanımlık kod</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdate} disabled={saving}><Save className="h-4 w-4 mr-2" /> Kaydet</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-2" /> İptal</Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={code.id} className="rounded-lg border p-4 flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="font-mono font-semibold text-primary">{code.code}</code>
                            <Badge variant={code.is_single_use ? "default" : "outline"}>
                              {code.is_single_use ? "Üyeye özel / tek kullanım" : "Paylaşılan kod"}
                            </Badge>
                            {!code.is_active && <Badge variant="secondary">Pasif</Badge>}
                            {code.label && <span className="text-sm text-muted-foreground">{code.label}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            {code.discount_info && <p>{code.discount_info}</p>}
                            {window && <p>{window}</p>}
                            <p>
                              Görüntüleyen: <strong>{usage.viewedCount}</strong>
                              {code.is_single_use && <> · Kod alan: <strong>{usage.issuedCount}</strong></>}
                              {" "}· Kullanan: <strong>{usage.redeemedCount}</strong>
                              {code.max_redemptions ? ` / ${code.max_redemptions}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleToggle(code)} title={code.is_active ? "Pasif et" : "Aktif et"}>
                            {code.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing({ ...code, max_redemptions: code.max_redemptions ?? "" })}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(code)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
