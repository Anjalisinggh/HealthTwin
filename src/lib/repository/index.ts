import type { Answers } from "../onboarding/schema";
import type { HealthProfile, HealthRecord, Reading } from "../types";

/**
 * Data access boundary.
 *
 * The UI talks to a `HealthRepository`. Today that is `LocalRepository`
 * (browser storage, single user). The Prisma/Postgres implementation will
 * expose the same methods over route handlers or server actions, backed by
 * the models in /prisma/schema.prisma.
 */

export interface PersistedState {
  version: 1;
  answers: Answers;
  onboardingComplete: boolean;
  profile: HealthProfile | null;
  records: HealthRecord[];
  readings: Reading[];
  /** Records were seeded with sample data so the vault isn't empty. */
  sampleSeeded: boolean;
  isDemo: boolean;
  /** Medication doses marked as taken: ISO date → medication ids. */
  doseLog?: Record<string, string[]>;
  /** Medical ID details that onboarding doesn't collect. */
  emergency?: EmergencyInfo;
}

export interface EmergencyInfo {
  bloodType?: string;
  contactName?: string;
  contactRelation?: string;
  contactPhone?: string;
  notes?: string;
}

export interface HealthRepository {
  load(): Promise<PersistedState | null>;
  save(state: PersistedState): Promise<void>;
  clear(): Promise<void>;
}

const KEY = "healthtwin:v1";

export class LocalRepository implements HealthRepository {
  async load(): Promise<PersistedState | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedState;
      return parsed.version === 1 ? parsed : null;
    } catch {
      return null;
    }
  }
  async save(state: PersistedState): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable (private mode, quota) – state stays in memory */
    }
  }
  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

export const repository: HealthRepository = new LocalRepository();
