"use client";

import ApprovalsScreen from "@/frontend/screens/ApprovalsScreen";
import ConsumerApprovalsScreen from "@/frontend/screens/ConsumerApprovalsScreen";
import { useViewMode } from "@/components/view-mode-context";

export default function ApprovalsPage() {
  const { isDeveloper } = useViewMode();

  if (!isDeveloper) {
    return <ConsumerApprovalsScreen />;
  }

  return <ApprovalsScreen />;
}
