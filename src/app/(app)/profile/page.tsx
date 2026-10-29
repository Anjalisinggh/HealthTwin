"use client";

import Link from "next/link";
import { Activity, AlertCircle, ChevronRight, Dna, Eye, HeartPulse, Info, LogOut, Moon, RefreshCw, Scissors, ShieldCheck } from "lucide-react";
import { ScreenHeader, Screen, Section, List, Row } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Data";
import { Disclaimer } from "@/components/ui/SafetyNote";
import { useHealth } from "@/lib/store/HealthStore";
import { profileCompleteness } from "@/lib/onboarding/toProfile";
import { describeLifestyle } from "@/lib/context/engine";
import { logout } from "@/lib/server/auth-actions";
import { repository } from "@/lib/repository";

export default function ProfilePage() {
  const { profile, context, emergency, account } = useHealth();
  if (!profile || !context) return null;
  const p = profile;
  const completeness = profileCompleteness(p);
  const facts = [p.user.age !== null && `${p.user.age} yrs`, p.user.sex && cap(p.user.sex.replace("_", " ")), p.user.heightCm && `${p.user.heightCm} cm`, p.user.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <Screen>
      <ScreenHeader title="Profile" back={{ href: "/today", label: "Today" }} />

      <div className="flex items-center gap-4 px-5 pt-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface font-display text-[30px] shadow-sm">
          {p.user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="font-display text-[28px] leading-tight">{p.user.name}</div>
          <div className="text-[13px] text-ink-3">{facts}</div>
        </div>
      </div>

      {completeness < 100 && (
        <div className="mx-5 mt-5 card p-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium">Profile {completeness}% complete</span>
            <Link href="/onboarding" className="font-medium text-brand-700">
              Complete
            </Link>
          </div>
          <Progress value={completeness / 100} className="mt-2.5" />
        </div>
      )}

      {/* Medical ID */}
      <Section>
        <Link href="/profile/emergency" className="flex items-center gap-4 rounded-[22px] border border-urgent/15 bg-urgent-bg p-4 transition-transform active:scale-[0.99]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-urgent text-white">
            <HeartPulse className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-medium">Medical ID</span>
            <span className="block text-[12.5px] text-ink-2">
              {emergency?.bloodType ? `Blood type ${emergency.bloodType} · ` : ""}
              {p.allergies.length} allerg{p.allergies.length === 1 ? "y" : "ies"} · {emergency?.contactName ? `ICE: ${emergency.contactName}` : "Add emergency contact"}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-ink-3" />
        </Link>
      </Section>

      <Section title="Health history">
        <List>
          <div className="px-4 py-3.5">
            <div className="eyebrow">Conditions</div>
            {p.conditions.length ? (
              <ul className="mt-2 space-y-2">
                {p.conditions.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3">
                    <span className="text-[15px] font-medium">{c.name}</span>
                    <span className="shrink-0 text-right text-[12px] text-ink-3">
                      {[c.diagnosed, c.managedWith && c.managedWith !== "unknown" ? c.managedWith : null].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-[14px] text-ink-3">None reported</p>
            )}
          </div>
          <div className="px-4 py-3.5">
            <div className="eyebrow flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" /> Allergies
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.allergies.length ? (
                p.allergies.map((a) => (
                  <Badge key={a.id} tone="urgent">
                    {a.substance}
                    {a.reaction ? ` · ${a.reaction}` : ""}
                  </Badge>
                ))
              ) : (
                <span className="text-[14px] text-ink-3">None reported</span>
              )}
            </div>
          </div>
          <Row
            icon={<Scissors className="h-[18px] w-[18px]" />}
            title="Surgeries"
            detail={p.surgeries.length ? p.surgeries.map((s) => `${s.name}${s.year ? ` (${s.year})` : ""}`).join(", ") : "None reported"}
          />
          <Row
            icon={<Dna className="h-[18px] w-[18px]" />}
            title="Family history"
            detail={p.familyHistory.length ? p.familyHistory.map((f) => `${f.condition} (${f.relations.join(", ")})`).join(" · ") : "None reported"}
          />
        </List>
      </Section>

      <Section title="Lifestyle">
        <div className="grid grid-cols-3 gap-2.5">
          <Mini icon={Moon} label="Sleep" value={p.lifestyle.sleepHours !== null ? `${p.lifestyle.sleepHours} h` : "—"} />
          <Mini icon={Activity} label="Activity" value={p.lifestyle.activity ? cap(p.lifestyle.activity) : "—"} />
          <Mini icon={HeartPulse} label="Stress" value={p.lifestyle.stress !== null ? `${p.lifestyle.stress}/5` : "—"} />
        </div>
        <p className="mt-3 px-1 text-[13px] leading-relaxed text-ink-3">{cap(describeLifestyle(p).join(" · ")) || "Not reported."}</p>
      </Section>

      <Section title="Settings">
        <List>
          <Row icon={<ShieldCheck className="h-[18px] w-[18px]" />} title="Privacy & data" detail="What’s stored, what the AI sees, export" href="/profile/settings" />
          <Row icon={<RefreshCw className="h-[18px] w-[18px]" />} title="Update my health profile" detail="Redo the guided questions" href="/onboarding" />
          <Row icon={<Eye className="h-[18px] w-[18px]" />} title="What HealthTwin can see" href="/profile/settings#context" />
          <Row icon={<Info className="h-[18px] w-[18px]" />} title="About & safety" detail="How HealthTwin should and shouldn’t be used" href="/profile/settings#safety" />
          <Row
            icon={<LogOut className="h-[18px] w-[18px]" />}
            title="Log out"
            detail={account?.email}
            onClick={async () => {
              // Save anything still queued before the session ends, then start clean
              await repository.flush();
              await logout();
              // Full load (not router.push) so this account's data is dropped from memory
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign("/login");
            }}
          />
        </List>
      </Section>

      <Disclaimer className="px-5 pb-6 pt-8" />
    </Screen>
  );
}

function Mini({ icon: Icon, label, value }: { icon: typeof Moon; label: string; value: string }) {
  return (
    <div className="card px-3 py-3.5 text-center">
      <Icon className="mx-auto h-4 w-4 text-brand-600" />
      <div className="mt-1.5 text-[15px] font-medium">{value}</div>
      <div className="text-[11px] text-ink-3">{label}</div>
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
