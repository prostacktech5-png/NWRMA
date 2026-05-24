import { format } from 'date-fns';

/** Save/sync/UI: 12-hour clock, lowercase am/pm (e.g. `10:20 pm`). */
export function formatReadingTime12h(d: Date): string {
  return format(d, 'h:mm a').toLowerCase();
}

function parts24ToDisplay(h24: number, mi: number, sec = 0): string {
  const anchor = new Date(2000, 0, 1, h24, mi, sec);
  return formatReadingTime12h(anchor);
}

/**
 * Normalize stored reading time for display and outbound payloads.
 */
export function displayReadingTimeOnly(stored: string): string {
  const t = stored.trim();

  const twelve = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i;
  const tm = t.match(twelve);
  if (tm) {
    return `${parseInt(tm[1], 10)}:${tm[2]} ${tm[3].toLowerCase()}`;
  }

  const legacyFull = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/;
  let m = t.match(legacyFull);
  if (m) {
    const hh = parseInt(m[4], 10);
    const mm = parseInt(m[5], 10);
    const ss = m[6] != null ? parseInt(m[6], 10) : 0;
    return parts24ToDisplay(hh, mm, ss);
  }

  const time24 = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
  m = t.match(time24);
  if (m) {
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const ss = m[3] != null ? parseInt(m[3], 10) : 0;
    return parts24ToDisplay(hh, mm, ss);
  }

  return t;
}
