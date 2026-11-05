"use client";

import React, { useEffect } from "react";
import DashboardOverviewScreen from "@/frontend/screens/DashboardOverviewScreen";
import ConsumerWalletScreen from "@/frontend/screens/ConsumerWalletScreen";
import { useViewMode } from "@/components/view-mode-context";
import { toast } from "sonner";

export default function Page() {
  const { isDeveloper } = useViewMode();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("dev_gate=required")) {
      toast.error("Access Denied: Developer authorization required for engine lab tools.");
    }
  }, []);

  if (!isDeveloper) {
    return <ConsumerWalletScreen />;
  }

  return <DashboardOverviewScreen />;
}
