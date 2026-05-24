import Dexie, { type EntityTable } from 'dexie';

// Types for the database entities
export interface User {
  id: string;
  phone: string;
  name: string;
  password: string; // In production, this should be hashed
  createdAt: Date;
}

export interface WaterReading {
  id: string;
  officerName: string;
  officerPhone: string;
  /** Gauge site, town, landmark, etc. */
  location: string;
  /** River or water body name */
  riverName: string;
  waterLevel: number;
  readingTime: string;
  date: string;
  dateTime: Date;
  gpsLat: number | null;
  gpsLng: number | null;
  photoBase64: string | null;
  remarks: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  syncError?: string;
  createdAt: Date;
  syncedAt?: Date;
}

export interface SyncLog {
  id: string;
  readingId: string;
  status: 'success' | 'failed';
  error?: string;
  timestamp: Date;
}

// Define the database
const db = new Dexie('HydroGaugeSL') as Dexie & {
  users: EntityTable<User, 'id'>;
  readings: EntityTable<WaterReading, 'id'>;
  syncLogs: EntityTable<SyncLog, 'id'>;
};

// Schema
db.version(1).stores({
  users: 'id, phone',
  readings: 'id, officerPhone, location, syncStatus, date, createdAt',
  syncLogs: 'id, readingId, timestamp',
});

db.version(2).stores({
  users: 'id, phone',
  readings: 'id, officerPhone, location, syncStatus, date, createdAt',
  syncLogs: 'id, readingId, timestamp',
}).upgrade(async (tx) => {
  await tx.table('readings').toCollection().modify((r: Record<string, unknown>) => {
    if (r.riverName == null) r.riverName = '';
  });
});

export { db };

// Major rivers & outlets (Sierra Leone); consolidated from public references including
// https://en.wikipedia.org/wiki/List_of_rivers_of_Sierra_Leone and regional hydro listings.
export const RIVER_OTHER_VALUE = '__other__' as const;

/** Separator between river and place in preset labels (must be unique in the string). */
export const RIVER_OPTION_SEPARATOR = ' – ' as const;

export function parseRiverLocationOption(option: string): {
  riverName: string;
  areaLabel: string;
} {
  const sep = RIVER_OPTION_SEPARATOR;
  const i = option.indexOf(sep);
  if (i === -1) {
    return { riverName: option.trim(), areaLabel: '' };
  }
  return {
    riverName: option.slice(0, i).trim(),
    areaLabel: option.slice(i + sep.length).trim(),
  };
}

/** River with a representative town / district along it (Sierra Leone). */
export const RIVER_LOCATION_OPTIONS = [
  'Bagbe River – Bo',
  'Bafi River – Kenema',
  'Bankasoka River – Port Loko',
  'Bumpeh River – Moyamba',
  'Great Scarcies River (Kolenté River) – Kambia',
  'Great Scarcies River (Kolenté River) – Port Loko',
  'Jong River (Taia River) – Moyamba',
  'Jong River (Taia River) – Bonthe',
  'Kagboro River – Moyamba',
  'Kissi River – Kailahun',
  'Kukuna River – Kenema',
  'Little Scarcies River (Kaba River) – Kambia',
  'Mahoi River – Bo',
  'Mano River – Kambia',
  'Moa River – Kailahun',
  'Moa River – Pujehun',
  'Moro River – Pujehun',
  'Pampana River – Tonkolili',
  'Rokel River (Seli River) – Magburaka',
  'Rokel River (Seli River) – Bumbuna',
  'Rokel River (Seli River) – Makeni',
  'Sewa River – Bo',
  'Sewa River – Kenema',
  'Sherbro River – Bonthe',
  'Sierra Leone River (estuary) – Freetown',
  'Teye River – Kenema',
  'Waanje River (Wanje River) – Pujehun',
] as const;
