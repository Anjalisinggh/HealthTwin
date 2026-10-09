"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { ScreenHeader, Screen, Section, List, Row } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import { useHealth } from "@/lib/store/HealthStore";
import { renderContextForPrompt } from "@/lib/context/engine";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, records, readings, answers, reset, context } = useHealth();
  const [confirm, setConfirm] = useState(false);
  const [showContext, setShowContext] = useState(false);
  if (!profile) return null;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ profile, records, readings, answers }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `healthtwin-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Screen>
      <ScreenHeader title="Privacy & data" back={{ href: "/profile", label: "Profile" }} subtitle="Your health data belongs to you. Here’s exactly what HealthTwin holds." />

      <Section title="What’s stored">
        <List>
          <Row title="Health profile" detail="Your answers build your history, lifestyle and family context." />
          <Row title="Records" detail="Uploaded reports are read to extract values for your timeline and trends." />
          <Row title="Readings" detail="Values you log, or that come from reports, power your trends." />
          <Row title="Where it lives" detail="On this device only. Only the context needed to answer a chat message is sent, and it isn’t retained." />
        </List>
      </Section>

      <Section id="context" title="What the AI sees">
        <div className="card p-4">
          <p className="text-[13.5px] leading-relaxed text-ink-2">The exact health context HealthTwin reads before it answers you.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setShowContext((v) => !v)}>
            {showContext ? "Hide context" : "Show context"}
          </Button>
          {showContext && context && (
            <pre className="scrollbar-thin mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-surface-2 p-4 font-mono text-[11px] leading-relaxed text-ink-2">
              {renderContextForPrompt(context)}
            </pre>
          )}
        </div>
      </Section>

      <Section title="Manage">
        <List>
          <Row icon={<Download className="h-[18px] w-[18px]" />} title="Export everything" detail="Download as JSON" onClick={exportJson} chevron />
          <Row icon={<RefreshCw className="h-[18px] w-[18px]" />} title="Redo onboarding" href="/onboarding" />
        </List>
      </Section>

      <Section id="safety" title="About & safety">
        <div className="card space-y-2.5 p-4 text-[13.5px] leading-relaxed text-ink-2">
          <p>HealthTwin organises your health information and explains it in plain language. It does not diagnose conditions or prescribe treatment.</p>
          <p>Always follow your doctor’s advice. Never start, stop or change medication based on something HealthTwin says.</p>
          <p className="font-medium text-ink">If you think you may be having an emergency, call your local emergency number (112 in India) straight away.</p>
        </div>
      </Section>

      <Section>
        <div className="rounded-[22px] border border-urgent/15 bg-urgent-bg p-4">
          <div className="text-[15px] font-medium text-urgent">Delete my HealthTwin</div>
          <p className="mt-1 text-[13px] text-ink-2">Removes your profile, answers, records and readings from this device. This can’t be undone.</p>
          <div className="mt-3 flex gap-2">
            {!confirm ? (
              <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
                <Trash2 className="h-4 w-4" /> Delete everything
              </Button>
            ) : (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    reset();
                    router.replace("/");
                  }}
                >
                  Yes, delete it
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </Section>
      <div className="h-8" />
    </Screen>
  );
}
