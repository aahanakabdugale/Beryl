"use client";

import DashboardOverviewScreen from "@/frontend/screens/DashboardOverviewScreen";
import ConsumerWalletScreen from "@/frontend/screens/ConsumerWalletScreen";
import { useViewMode } from "@/components/view-mode-context";

export default function Page() {
  const { isDeveloper } = useViewMode();

  if (!isDeveloper) {
    return <ConsumerWalletScreen />;
  }

  return <DashboardOverviewScreen />;
}
