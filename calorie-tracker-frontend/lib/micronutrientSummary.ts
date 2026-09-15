export type MicronutrientMention = {
  label: string;
  count: number;
};

const SPLIT_PATTERN = /\s*(?:,|;|\/|\|)|\band\b\s*/i;
const PREFIX_PATTERN = /^(high in|low in|low|rich in|good source of|contains)\s+/i;
const IGNORED_PATTERN = /^\s*(no notable micronutrient information|none|n\/?a|not available)\s*$/i;
const MAX_MENTIONS = 12;

export function aggregateMicronutrients(summaries: Array<string | null | undefined>): MicronutrientMention[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const summary of summaries) {
    if (!summary || IGNORED_PATTERN.test(summary)) {
      continue;
    }
    for (const part of summary.split(SPLIT_PATTERN)) {
      const label = normalizeMicronutrientLabel(part);
      if (!label || IGNORED_PATTERN.test(label)) {
        continue;
      }
      const key = label.toLowerCase();
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label, count: 1 });
      }
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, MAX_MENTIONS);
}

function normalizeMicronutrientLabel(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }
  const withoutPrefix = trimmed.replace(PREFIX_PATTERN, "").trim();
  if (!withoutPrefix) {
    return "";
  }
  return withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1);
}
