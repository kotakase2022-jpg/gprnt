import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label="TERRAST Sustainability Disclosure Hub ホーム"
    >
      <span
        className="relative grid size-9 grid-cols-3 items-end gap-0.5 rounded-lg bg-primary p-2 shadow-sm"
        aria-hidden="true"
      >
        <span className="h-2 rounded-sm bg-primary-foreground/60" />
        <span className="h-4 rounded-sm bg-primary-foreground/80" />
        <span className="h-5 rounded-sm bg-primary-foreground" />
        <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-background bg-[var(--chart-3)]" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-sm font-bold tracking-[0.12em] text-foreground">
            TERRAST
          </span>
          <span className="mt-1 block text-[10px] font-medium tracking-wide text-muted-foreground">
            DISCLOSURE HUB
          </span>
        </span>
      )}
    </Link>
  );
}
