import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type EngineMode = "live" | "demo";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  className?: string;
  engineMode?: EngineMode | null;
};

function EngineModeBadge({ mode }: { mode: EngineMode }) {
  if (mode === "live") {
    return (
      <Badge
        variant="outline"
        className="w-fit shrink-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
      >
        Live AI
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="w-fit shrink-0">
      Demo engine
    </Badge>
  );
}

export function DashboardHeader({
  title,
  description,
  className,
  engineMode = null,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {engineMode ? <EngineModeBadge mode={engineMode} /> : null}
    </header>
  );
}
