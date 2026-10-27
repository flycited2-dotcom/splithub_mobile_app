// The server sends SQLite CURRENT_TIMESTAMP values ("2026-10-25 22:57:00", UTC).
// Hermes only parses ISO strings, so normalize before building a Date.
export function parseServerDate(value?: string | null): Date | null {
  if (!value) return null;
  const sqlite = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/.exec(value.trim());
  const date = new Date(sqlite ? `${sqlite[1]}T${sqlite[2]}Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatServerDate(value?: string | null) {
  const date = parseServerDate(value);
  return date ? date.toLocaleDateString('ru-RU') : '';
}
