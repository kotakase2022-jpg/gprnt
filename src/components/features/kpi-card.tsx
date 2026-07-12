import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  progress,
  tone = "primary",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  progress?: number;
  tone?: "primary" | "warning" | "success";
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-tight">
              {value}
            </p>
          </div>
          <span
            className={cn(
              "grid size-9 place-items-center rounded-lg",
              tone === "primary" && "bg-primary/10 text-primary",
              tone === "warning" && "bg-amber-100 text-amber-700",
              tone === "success" && "bg-emerald-100 text-emerald-700",
            )}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
        </div>
        {typeof progress === "number" && (
          <Progress value={progress} className="mt-4 h-1.5" />
        )}
        <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
          {detail}
        </p>
      </CardContent>
    </Card>
  );
}
