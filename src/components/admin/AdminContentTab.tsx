import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { adminContentService, type AdminContentItem, type AdminContentKind } from "@/services/adminContentService";

interface KindText {
  title: string;
  description: string;
  newLabel: string;
  newHref: string;
  viewHref: (id: string) => string;
  dateHead: string;
  ownerHead: string;
  visibleBadge: string;
  hiddenBadge: string;
  showAction: string;
  hideAction: string;
  empty: string;
  deleteConfirm: (title: string) => string;
}

const TEXT: Record<AdminContentKind, KindText> = {
  events: {
    title: "Etkinlikler",
    description: "Onaylanan etkinlikler üyelere görünür. Onayı kaldırılan etkinlik yalnızca düzenleyicisine ve yöneticilere görünür.",
    newLabel: "Yeni Etkinlik",
    newHref: "/events/create",
    viewHref: (id) => `/events/${id}`,
    dateHead: "Etkinlik tarihi",
    ownerHead: "Düzenleyen",
    visibleBadge: "Yayında",
    hiddenBadge: "Onay bekliyor",
    showAction: "Onayla",
    hideAction: "Yayından kaldır",
    empty: "Henüz etkinlik yok.",
    deleteConfirm: (t) => `"${t}" etkinliği ve katılım kayıtları silinsin mi? Bu işlem geri alınamaz.`,
  },
  jobs: {
    title: "İş İlanları",
    description: "Aktif ilanlar EYB İK sayfasında listelenir. Pasif ilan yalnızca ilan sahibine ve yöneticilere görünür.",
    newLabel: "Yeni İlan",
    newHref: "/jobs/create",
    viewHref: (id) => `/jobs/${id}`,
    dateHead: "Yayın tarihi",
    ownerHead: "İlan sahibi",
    visibleBadge: "Aktif",
    hiddenBadge: "Pasif",
    showAction: "Aktifleştir",
    hideAction: "Pasifleştir",
    empty: "Henüz iş ilanı yok.",
    deleteConfirm: (t) => `"${t}" ilanı ve başvuruları silinsin mi? Bu işlem geri alınamaz.`,
  },
  news: {
    title: "Haberler",
    description: "Yayındaki haberler herkese görünür. Yayından kaldırılan haber taslak olarak saklanır.",
    newLabel: "Yeni Haber",
    newHref: "/news/create",
    viewHref: (id) => `/news/${id}`,
    dateHead: "Oluşturulma",
    ownerHead: "Yazar",
    visibleBadge: "Yayında",
    hiddenBadge: "Taslak",
    showAction: "Yayınla",
    hideAction: "Yayından kaldır",
    empty: "Henüz haber yok.",
    deleteConfirm: (t) => `"${t}" haberi silinsin mi? Bu işlem geri alınamaz.`,
  },
};

const NO_PERMISSION =
  "Kayıt değişmedi: bu işlem için veritabanı yetkisi yok (yalnızca kendi eklediğiniz kayıtları değiştirebilirsiniz).";

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

export function AdminContentTab({ kind }: { kind: AdminContentKind }) {
  const text = TEXT[kind];
  const { toast } = useToast();
  const [items, setItems] = useState<AdminContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminContentService.list(kind);
    if (error) {
      console.error(`admin ${kind} list failed:`, error);
      setLoadError(error.message ?? String(error));
    } else {
      setLoadError(null);
    }
    setItems(data);
    setLoading(false);
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleVisible = async (item: AdminContentItem) => {
    setBusyId(item.id);
    const { affected, error } = await adminContentService.setVisible(kind, item.id, !item.visible);
    setBusyId(null);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      return;
    }
    if (affected === 0) {
      toast({ title: "Değişiklik yapılamadı", description: NO_PERMISSION, variant: "destructive" });
      return;
    }
    toast({ title: `"${item.title}": ${item.visible ? text.hiddenBadge : text.visibleBadge}` });
    load();
  };

  const remove = async (item: AdminContentItem) => {
    if (!confirm(text.deleteConfirm(item.title))) return;
    setBusyId(item.id);
    const { affected, error } = await adminContentService.remove(kind, item.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Silinemedi", description: error.message, variant: "destructive" });
      return;
    }
    if (affected === 0) {
      toast({ title: "Silinemedi", description: NO_PERMISSION, variant: "destructive" });
      return;
    }
    toast({ title: "Silindi" });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>
            {text.title} {!loading && `(${items.length})`}
          </CardTitle>
          <CardDescription>{text.description}</CardDescription>
        </div>
        <Button asChild>
          <Link href={text.newHref} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {text.newLabel}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : loadError ? (
          <p className="py-6 text-sm text-destructive">Liste yüklenemedi: {loadError}</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{text.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlık</TableHead>
                  <TableHead>{text.dateHead}</TableHead>
                  <TableHead>{text.ownerHead}</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[320px]">
                      <div className="font-medium">{item.title}</div>
                      {item.detail && <div className="text-xs text-muted-foreground">{item.detail}</div>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(item.date)}</TableCell>
                    <TableCell className="text-sm">{item.owner ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={item.visible ? "default" : "secondary"}>
                        {item.visible ? text.visibleBadge : text.hiddenBadge}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={text.viewHref(item.id)} aria-label={`${item.title}: görüntüle`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === item.id}
                          onClick={() => toggleVisible(item)}
                          className="gap-1 whitespace-nowrap"
                        >
                          {item.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          {item.visible ? text.hideAction : text.showAction}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busyId === item.id}
                          onClick={() => remove(item)}
                          aria-label={`${item.title}: sil`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
