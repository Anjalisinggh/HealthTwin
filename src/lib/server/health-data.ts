import "server-only";
import type { Answers } from "../onboarding/schema";
import type { EmergencyInfo, PersistedState } from "../repository";
import type { ExtractedValue, HealthProfile, HealthRecord, Reading } from "../types";
import { db } from "./db";
import { Prisma } from "@/generated/prisma/client";

/** Fields the client may send in a save; any subset. */
export type StatePatch = Partial<Omit<PersistedState, "version">>;

const json = (v: unknown) => v as Prisma.InputJsonValue;

export async function loadState(userId: string): Promise<PersistedState | null> {
  const [state, records, readings] = await Promise.all([
    db.healthState.findUnique({ where: { userId } }),
    db.healthRecord.findMany({ where: { userId }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    db.reading.findMany({ where: { userId }, orderBy: { takenAt: "asc" } }),
  ]);
  if (!state) return null;

  return {
    version: 1,
    answers: state.answers as Answers,
    onboardingComplete: state.onboardingComplete,
    profile: (state.profile as HealthProfile | null) ?? null,
    sampleSeeded: state.sampleSeeded,
    isDemo: state.isDemo,
    doseLog: state.doseLog as Record<string, string[]>,
    emergency: state.emergency as EmergencyInfo,
    records: records.map(
      (r): HealthRecord => ({
        id: r.clientId,
        type: r.type as HealthRecord["type"],
        title: r.title,
        date: r.date,
        provider: r.provider ?? undefined,
        fileName: r.fileName ?? undefined,
        status: r.status as HealthRecord["status"],
        summary: r.summary ?? undefined,
        impression: r.impression ?? undefined,
        values: r.values as unknown as ExtractedValue[],
      }),
    ),
    readings: readings.map(
      (r): Reading => ({
        id: r.clientId,
        metric: r.metric as Reading["metric"],
        value: r.value,
        unit: r.unit,
        takenAt: r.takenAt,
        source: r.source as Reading["source"],
        recordId: r.recordId ?? undefined,
      }),
    ),
  };
}

/**
 * Apply a partial save. Scalar/JSON fields are overwritten; when `records` or
 * `readings` are present they replace the user's whole list (both are small).
 */
export async function saveState(userId: string, patch: StatePatch) {
  const fields: Prisma.HealthStateUncheckedUpdateInput = {};
  if (patch.answers !== undefined) fields.answers = json(patch.answers);
  if (patch.onboardingComplete !== undefined) fields.onboardingComplete = patch.onboardingComplete;
  if (patch.profile !== undefined) fields.profile = patch.profile === null ? Prisma.DbNull : json(patch.profile);
  if (patch.sampleSeeded !== undefined) fields.sampleSeeded = patch.sampleSeeded;
  if (patch.isDemo !== undefined) fields.isDemo = patch.isDemo;
  if (patch.doseLog !== undefined) fields.doseLog = json(patch.doseLog);
  if (patch.emergency !== undefined) fields.emergency = json(patch.emergency);

  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.healthState.upsert({
      where: { userId },
      create: { ...(fields as Prisma.HealthStateUncheckedCreateInput), userId },
      update: fields,
    }),
  ];

  if (patch.records) {
    ops.push(db.healthRecord.deleteMany({ where: { userId } }));
    ops.push(
      db.healthRecord.createMany({
        data: dedupe(patch.records).map((r) => ({
          userId,
          clientId: r.id,
          type: r.type,
          title: r.title,
          date: r.date,
          provider: r.provider ?? null,
          fileName: r.fileName ?? null,
          status: r.status,
          summary: r.summary ?? null,
          impression: r.impression ?? null,
          values: json(r.values ?? []),
        })),
      }),
    );
  }

  if (patch.readings) {
    ops.push(db.reading.deleteMany({ where: { userId } }));
    ops.push(
      db.reading.createMany({
        data: dedupe(patch.readings).map((r) => ({
          userId,
          clientId: r.id,
          metric: r.metric,
          value: r.value,
          unit: r.unit,
          takenAt: r.takenAt,
          source: r.source,
          recordId: r.recordId ?? null,
        })),
      }),
    );
  }

  await db.$transaction(ops);
}

/** Wipe the user's health data but keep the account. */
export async function clearState(userId: string) {
  await db.$transaction([
    db.reading.deleteMany({ where: { userId } }),
    db.healthRecord.deleteMany({ where: { userId } }),
    db.healthState.upsert({
      where: { userId },
      create: { userId },
      update: {
        answers: {},
        onboardingComplete: false,
        profile: Prisma.DbNull,
        sampleSeeded: false,
        isDemo: false,
        doseLog: {},
        emergency: {},
      },
    }),
  ]);
}

/** Keep the first item per id so the per-user unique constraint holds. */
function dedupe<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}
