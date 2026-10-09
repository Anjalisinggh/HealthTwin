import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = { title: "Build your HealthTwin" };

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
