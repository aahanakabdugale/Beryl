"use client";

import React, { createContext, useContext, useState } from "react";

export interface InspectorPayload {
  title?: string;
  data: Record<string, any>;
  timestamp?: string;
}

const DEFAULT_PAYLOAD: InspectorPayload = {
  title: "LAST_POLICY_DECISION",
  timestamp: new Date().toISOString(),
  data: {
    merchant: "Shady Deals Network",
    amount: 1000.0,
    rule: "PROMPT_INJECTION",
    verdict: "BLOCKED",
    latency_ms: 0,
    air_gap: "ENFORCED",
    paypal_order_id: null,
    idempotency_token: "IDEMP-89f41b2c",
  },
};

interface InspectorContextType {
  inspectorPayload: InspectorPayload;
  setInspectorPayload: (payload: InspectorPayload) => void;
  inspectData: (title: string, data: Record<string, any>) => void;
  isInspectorVisible: boolean;
  setIsInspectorVisible: (visible: boolean) => void;
  toggleInspector: () => void;
}

const InspectorContext = createContext<InspectorContextType>({
  inspectorPayload: DEFAULT_PAYLOAD,
  setInspectorPayload: () => {},
  inspectData: () => {},
  isInspectorVisible: true,
  setIsInspectorVisible: () => {},
  toggleInspector: () => {},
});

export function InspectorProvider({ children }: { children: React.ReactNode }) {
  const [inspectorPayload, setInspectorPayload] = useState<InspectorPayload>(DEFAULT_PAYLOAD);
  const [isInspectorVisible, setIsInspectorVisible] = useState(true);

  const inspectData = (title: string, data: Record<string, any>) => {
    setInspectorPayload({
      title,
      timestamp: new Date().toISOString(),
      data,
    });
  };

  const toggleInspector = () => setIsInspectorVisible((prev) => !prev);

  return (
    <InspectorContext.Provider
      value={{
        inspectorPayload,
        setInspectorPayload,
        inspectData,
        isInspectorVisible,
        setIsInspectorVisible,
        toggleInspector,
      }}
    >
      {children}
    </InspectorContext.Provider>
  );
}

export function useInspector() {
  return useContext(InspectorContext);
}
