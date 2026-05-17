import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  className?: string;
};

export function DashboardHeader({
  title,
  description,
  className,
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
      <Badge variant="secondary" className="w-fit shrink-0">
        Demo Mode
      </Badge>
    </header>
  );
}
