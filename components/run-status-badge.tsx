import { CheckCircle2Icon, CircleDashedIcon, XCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RunStatus } from "@/lib/types";

export function RunStatusBadge({ status }: { status: RunStatus }) {
  if (status === "success") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      >
        <CheckCircle2Icon className="size-3" />
        success
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircleIcon className="size-3" />
        failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <CircleDashedIcon className="size-3" />
      running
    </Badge>
  );
}

export function RunStatusIcon({ status }: { status: RunStatus }) {
  if (status === "success") {
    return <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />;
  }
  if (status === "failed") {
    return <XCircleIcon className="size-4 shrink-0 text-destructive" />;
  }
  return <CircleDashedIcon className="size-4 shrink-0 text-muted-foreground" />;
}
