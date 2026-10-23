import { STATUS_LABEL } from "../../lib/format";
import type { UnitStatus } from "../../lib/types";

const dot: Record<UnitStatus, string> = {
  available: "bg-available",
  reserved: "bg-reserved",
  sold: "bg-sold",
};

export function StatusBadge({ status, className = "" }: { status: UnitStatus; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-stone-300 ${className}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
