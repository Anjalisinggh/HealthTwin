"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AnswerValue, Answers } from "../onboarding/schema";
import { pruneHiddenAnswers } from "../onboarding/engine";
import { answersToProfile, answersToReadings } from "../onboarding/toProfile";
import { DEMO_ANSWERS } from "../mock/demoAnswers";
import { MOCK_READINGS, MOCK_RECORDS } from "../mock/records";
import { repository, type Account, type EmergencyInfo, type PersistedState } from "../repository";
import type { HealthProfile, HealthRecord, Reading } from "../types";
import { buildHealthContext, type HealthContext } from "../context/engine";

interface HealthStore extends PersistedState {
  hydrated: boolean;
  /** The signed-in account, or null when signed out. */
  account: Account | null;
  /** Set when the server couldn't be reached on load. */
  loadError: string | null;
  context: HealthContext | null;
  setAnswer: (id: string, value: AnswerValue) => void;
  completeOnboarding: () => void;
  loadDemo: () => void;
  reset: () => void;
  addRecord: (record: HealthRecord) => void;
  updateRecord: (id: string, patch: Partial<HealthRecord>) => void;
  addReadings: (readings: Reading[]) => void;
  toggleDose: (date: string, medicationId: string) => void;
  setEmergency: (patch: EmergencyInfo) => void;
}

const EMPTY: PersistedState = {
  version: 1,
  answers: {},
  onboardingComplete: false,
  profile: null,
  records: [],
  readings: [],
  sampleSeeded: false,
  isDemo: false,
};

const Ctx = createContext<HealthStore | null>(null);

export function HealthStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    repository
      .load()
      .then((loaded) => {
        if (cancelled) return;
        setAccount(loaded.account);
        if (loaded.state) setState(loaded.state);
        setHydrated(true);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Couldn't load your data");
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Only signed-in users with a successfully loaded twin are saved
    if (!hydrated || !account || loadError) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    void repository.save(state);
  }, [state, hydrated, account, loadError]);

  const setAnswer = useCallback((id: string, value: AnswerValue) => {
    setState((s) => ({ ...s, answers: pruneHiddenAnswers({ ...s.answers, [id]: value }) }));
  }, []);

  const finalize = useCallback((answers: Answers, isDemo: boolean): PersistedState => {
    const profile = answersToProfile(answers);
    const self = answersToReadings(answers);
    return {
      version: 1,
      answers,
      onboardingComplete: true,
      profile,
      records: MOCK_RECORDS,
      readings: [...MOCK_READINGS, ...self],
      sampleSeeded: true,
      isDemo,
    };
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((s) => {
      const next = finalize(s.answers, false);
      // keep any records the user uploaded during a previous session
      const uploaded = s.records.filter((r) => !MOCK_RECORDS.some((m) => m.id === r.id));
      return { ...next, records: [...uploaded, ...next.records], doseLog: s.doseLog, emergency: s.emergency };
    });
  }, [finalize]);

  const loadDemo = useCallback(() => {
    setState({
      ...finalize(DEMO_ANSWERS, true),
      emergency: { bloodType: "B+", contactName: "Priya Sharma", contactRelation: "Spouse", contactPhone: "+91 98450 12345" },
    });
  }, [finalize]);

  const reset = useCallback(() => {
    void repository.clear();
    skipNextSave.current = true;
    setState(EMPTY);
  }, []);

  const addRecord = useCallback((record: HealthRecord) => {
    setState((s) => ({ ...s, records: [record, ...s.records] }));
  }, []);

  const updateRecord = useCallback((id: string, patch: Partial<HealthRecord>) => {
    setState((s) => ({ ...s, records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }, []);

  const addReadings = useCallback((readings: Reading[]) => {
    setState((s) => ({ ...s, readings: [...s.readings, ...readings] }));
  }, []);

  const toggleDose = useCallback((date: string, medicationId: string) => {
    setState((s) => {
      const log = { ...(s.doseLog ?? {}) };
      const day = log[date] ?? [];
      log[date] = day.includes(medicationId) ? day.filter((id) => id !== medicationId) : [...day, medicationId];
      return { ...s, doseLog: log };
    });
  }, []);

  const setEmergency = useCallback((patch: EmergencyInfo) => {
    setState((s) => ({ ...s, emergency: { ...(s.emergency ?? {}), ...patch } }));
  }, []);

  const context = useMemo(
    () => (state.profile ? buildHealthContext(state.profile, state.records, state.readings) : null),
    [state.profile, state.records, state.readings],
  );

  const value = useMemo<HealthStore>(
    () => ({ ...state, hydrated, account, loadError, context, setAnswer, completeOnboarding, loadDemo, reset, addRecord, updateRecord, addReadings, toggleDose, setEmergency }),
    [state, hydrated, account, loadError, context, setAnswer, completeOnboarding, loadDemo, reset, addRecord, updateRecord, addReadings, toggleDose, setEmergency],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHealth(): HealthStore {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHealth must be used within HealthStoreProvider");
  return v;
}

export type { HealthProfile };
