import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export const CONCEPT_NOTICE =
  "JPX連携構想の検討用コンセプトMVPです。JPXによる承認・提供を示すものではありません。";

export function ConceptNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 text-xs leading-relaxed text-muted-foreground",
        className,
      )}
      role="note"
    >
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{CONCEPT_NOTICE}</span>
    </div>
  );
}
