import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatTileProps {
  icon: LucideIcon;
  // Tailwind classes for the icon chip, e.g. "bg-blue-100 text-blue-600".
  tone: string;
  value: string;
  label: string;
  // Makes the whole tile a link; omit for a plain, non-clickable tile.
  href?: ComponentProps<typeof Link>["href"];
  "aria-label"?: string;
  // Extra line under the label, e.g. the "Dernek üyelerine özel" lock hint.
  footer?: ReactNode;
}

/**
 * One compact statistic on the home page. Replaces the copy-pasted
 * Card/CardContent blocks so every tile shares the same (small) size.
 */
export function StatTile({ icon: Icon, tone, value, label, href, footer, ...rest }: StatTileProps) {
  const card = (
    <Card
      className={
        "h-full border-0 ring-1 ring-border/50 bg-card" +
        (href ? " cursor-pointer transition-shadow hover:shadow-lg focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2" : "")
      }
    >
      <CardContent className="p-3 sm:p-4 flex items-center gap-3">
        <div className={`p-2 rounded-xl flex-shrink-0 ${tone}`} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground line-clamp-2" title={label}>
            {label}
          </p>
          {footer}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link href={href} aria-label={rest["aria-label"]}>
      {card}
    </Link>
  );
}
