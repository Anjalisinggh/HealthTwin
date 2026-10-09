"use client";

import { useState } from "react";
import { HeartPulse, Pencil, Phone } from "lucide-react";
import { ScreenHeader, Screen, Section } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import { Field, Sheet, fieldCls } from "@/components/ui/Sheet";
import { useHealth } from "@/lib/store/HealthStore";
import type { EmergencyInfo } from "@/lib/repository";

const BLOOD_TYPES = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−", "Unknown"];

export default function EmergencyPage() {
  const { profile, emergency, setEmergency } = useHealth();
  const [editing, setEditing] = useState(false);
  if (!profile) return null;
  const e = emergency ?? {};
  const p = profile;

  return (
    <Screen>
      <ScreenHeader
        title="Medical ID"
        back={{ href: "/profile", label: "Profile" }}
        action={
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-medium text-brand-700 hover:bg-surface-3">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        }
        subtitle="What a first responder or doctor needs to know, in one place."
      />

      <Section className="mt-6">
        <div className="overflow-hidden rounded-[28px] border border-line bg-surface shadow-lg">
          <div className="flex items-center justify-between bg-urgent px-5 py-3.5 text-white">
            <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em]">
              <HeartPulse className="h-4 w-4" /> Medical ID
            </span>
            <span className="text-[12px] opacity-80">HealthTwin</span>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-display text-[30px] leading-none">{p.user.name}</div>
                <div className="mt-1.5 text-[13px] text-ink-3">
                  {[p.user.age !== null && `${p.user.age} years`, p.user.sex && p.user.sex.replace("_", " "), p.user.weightKg && `${p.user.weightKg} kg`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Blood</div>
                <div className="font-display text-[34px] leading-none text-urgent">{e.bloodType ?? "—"}</div>
              </div>
            </div>

            <dl className="mt-5 divide-y divide-line border-t border-line">
              <Item k="Allergies" v={p.allergies.map((a) => `${a.substance}${a.reaction ? ` (${a.reaction})` : ""}`).join(", ") || "None known"} strong />
              <Item k="Conditions" v={p.conditions.map((c) => c.name).join(", ") || "None reported"} />
              <Item k="Medications" v={p.medications.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}`).join(", ") || "None"} />
              {p.surgeries.length > 0 && <Item k="Surgeries" v={p.surgeries.map((s) => `${s.name}${s.year ? ` ${s.year}` : ""}`).join(", ")} />}
              {e.notes && <Item k="Notes" v={e.notes} />}
            </dl>
          </div>
        </div>
      </Section>

      <Section title="Emergency contact">
        {e.contactName ? (
          <div className="card flex items-center gap-3.5 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-soft font-display text-[20px] text-gold-3">{e.contactName.slice(0, 1)}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium">{e.contactName}</div>
              <div className="text-[12.5px] text-ink-3">
                {e.contactRelation ? `${e.contactRelation} · ` : ""}
                {e.contactPhone}
              </div>
            </div>
            {e.contactPhone && (
              <a href={`tel:${e.contactPhone.replace(/\s/g, "")}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-on-brand" aria-label={`Call ${e.contactName}`}>
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="card w-full p-5 text-left text-[14px] text-ink-2 card-hover">
            <span className="font-medium text-brand-700">Add an emergency contact</span>
            <span className="mt-0.5 block text-[12.5px] text-ink-3">Someone responders can call on your behalf.</span>
          </button>
        )}
      </Section>

      <Section>
        <div className="rounded-[22px] border border-urgent/15 bg-urgent-bg p-4">
          <div className="text-[14px] font-medium text-urgent">In an emergency, call for help first</div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">Call your local emergency number (112 in India). Show this screen to responders once help is on the way.</p>
        </div>
        <p className="mt-3 px-1 text-[12px] text-ink-3">Allergies, conditions and medication come from your health profile. Update them there.</p>
      </Section>

      <div className="h-8" />

      {editing && <EditSheet initial={e} onSave={(patch) => { setEmergency(patch); setEditing(false); }} onClose={() => setEditing(false)} />}
    </Screen>
  );
}

function Item({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="py-3">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{k}</dt>
      <dd className={strong ? "mt-0.5 text-[15px] font-medium text-urgent" : "mt-0.5 text-[14.5px] text-ink"}>{v}</dd>
    </div>
  );
}

function EditSheet({ initial, onSave, onClose }: { initial: EmergencyInfo; onSave: (e: EmergencyInfo) => void; onClose: () => void }) {
  const [f, setF] = useState<EmergencyInfo>(initial);
  const set = (k: keyof EmergencyInfo) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: ev.target.value }));
  return (
    <Sheet title="Edit Medical ID" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Blood type">
          <select value={f.bloodType ?? ""} onChange={set("bloodType")} className={fieldCls}>
            <option value="">Not set</option>
            {BLOOD_TYPES.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
        <Field label="Emergency contact name">
          <input value={f.contactName ?? ""} onChange={set("contactName")} className={fieldCls} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Relationship">
            <input value={f.contactRelation ?? ""} onChange={set("contactRelation")} className={fieldCls} autoComplete="off" />
          </Field>
          <Field label="Phone">
            <input value={f.contactPhone ?? ""} onChange={set("contactPhone")} inputMode="tel" className={fieldCls} autoComplete="off" />
          </Field>
        </div>
        <Field label="Notes for responders">
          <textarea value={f.notes ?? ""} onChange={set("notes")} rows={3} className={`${fieldCls} h-auto resize-none py-3`} placeholder="e.g. Wears contact lenses" />
        </Field>
      </div>
      <Button className="mt-6 w-full" size="lg" onClick={() => onSave(f)}>
        Save
      </Button>
    </Sheet>
  );
}
