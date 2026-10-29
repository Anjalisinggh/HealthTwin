import type { Answers } from "../onboarding/schema";
import type { HealthProfile, HealthRecord, Reading } from "../types";

/**
 * Data access boundary.
 *
 * The UI talks to a `HealthRepository`. `ApiRepository` keeps the signed-in
 * user's twin in Postgres through /api/state; the server side lives in
 * src/lib/server.
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

export interface Account {
  name: string;
  email: string;
}

export interface LoadResult {
  /** null when nobody is signed in. */
  account: Account | null;
  state: PersistedState | null;
}

export interface HealthRepository {
  load(): Promise<LoadResult>;
  save(state: PersistedState): Promise<void>;
  clear(): Promise<void>;
}

type Patch = Partial<Omit<PersistedState, "version">>;
const KEYS = ["answers", "onboardingComplete", "profile", "records", "readings", "sampleSeeded", "isDemo", "doseLog", "emergency"] as const;

/** Browser storage from before accounts existed; uploaded once, then removed. */
const LEGACY_KEY = "healthtwin:v1";
const SAVE_DELAY_MS = 600;

export class ApiRepository implements HealthRepository {
  /** What the server holds, so saves only send the fields that changed. */
  private saved: PersistedState | null = null;
  private pending: Patch = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushing: Promise<void> = Promise.resolve();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", () => void this.flush(true));
    }
  }

  async load(): Promise<LoadResult> {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (res.status === 401) return { account: null, state: null };
    if (!res.ok) throw new Error(`Couldn't load your data (HTTP ${res.status})`);
    const body = (await res.json()) as { user: Account; state: PersistedState | null };
    let state = body.state;

    // First sign-in on a device that used the app before accounts: bring that data along.
    const legacy = readLegacy();
    if (legacy && (!state || !state.onboardingComplete)) {
      state = legacy;
      this.saved = null;
      await this.send(fullPatch(legacy));
    }
    if (legacy) clearLegacy();

    this.saved = state;
    return { account: body.user, state };
  }

  async save(state: PersistedState): Promise<void> {
    const prev = this.saved;
    for (const k of KEYS) {
      if (!prev || prev[k] !== state[k]) (this.pending as Record<string, unknown>)[k] = state[k];
    }
    this.saved = state;
    if (!Object.keys(this.pending).length) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), SAVE_DELAY_MS);
  }

  async clear(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.pending = {};
    this.saved = null;
    await this.flushing;
    await fetch("/api/state", { method: "DELETE" });
  }

  /** Send queued changes now. `keepalive` lets it finish while the page unloads. */
  flush(keepalive = false): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const patch = this.pending;
    if (!Object.keys(patch).length) return this.flushing;
    this.pending = {};
    this.flushing = this.flushing.then(() => this.send(patch, keepalive)).catch(() => {
      // Put the changes back so the next save retries them
      this.pending = { ...patch, ...this.pending };
    });
    return this.flushing;
  }

  private async send(patch: Patch, keepalive = false) {
    const res = await fetch("/api/state", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
      keepalive,
    });
    if (!res.ok) throw new Error(`Save failed (HTTP ${res.status})`);
  }
}

function fullPatch(s: PersistedState): Patch {
  return Object.fromEntries(KEYS.map((k) => [k, s[k]])) as Patch;
}

function readLegacy(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    const parsed = raw ? (JSON.parse(raw) as PersistedState) : null;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function clearLegacy() {
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export const repository = new ApiRepository();
