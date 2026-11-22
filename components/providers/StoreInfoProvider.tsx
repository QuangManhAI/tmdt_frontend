"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_STORE_INFO, type StoreInfo } from "@/lib/store-info";

const StoreInfoContext = createContext<StoreInfo>(DEFAULT_STORE_INFO);

export function StoreInfoProvider({ value, children }: { value: StoreInfo; children: ReactNode }) {
  return <StoreInfoContext.Provider value={value}>{children}</StoreInfoContext.Provider>;
}

export const useStoreInfo = () => useContext(StoreInfoContext);
