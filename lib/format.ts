export function formatSuccessRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function formatLatency(ms: number): string {
  if (ms >= 1000) {
    const seconds = ms / 1000;
    return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
  }
  return `${ms}ms`;
}

export function formatRelativeTime(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absSec < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, "day");
}

export function shortRunId(id: string): string {
  if (id.startsWith("run_seed_")) {
    return id.replace("run_seed_", "");
  }
  if (id.startsWith("run_") && id.length > 20) {
    return `…${id.slice(-8)}`;
  }
  return id;
}
