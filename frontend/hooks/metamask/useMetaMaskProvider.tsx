"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type MetaMaskContextType = {
  provider: any;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  error: Error | undefined;
  connect: () => void;
};

const MetaMaskContext = createContext<MetaMaskContextType | undefined>(undefined);

export function MetaMaskProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<any>(undefined);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [accounts, setAccounts] = useState<string[] | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const p = (globalThis as any).ethereum;
    if (!p) return;
    setProvider(p);
    p.request({ method: "eth_chainId" }).then((id: string) => setChainId(Number.parseInt(id, 16)));
    p.request({ method: "eth_accounts" }).then((accs: string[]) => { setAccounts(accs); setIsConnected(accs.length > 0); });
    const onAccountsChanged = (accs: string[]) => { setAccounts(accs); setIsConnected(accs.length > 0); };
    const onChainChanged = (id: string) => setChainId(Number.parseInt(id, 16));
    p.on("accountsChanged", onAccountsChanged);
    p.on("chainChanged", onChainChanged);
    return () => { if (!p.removeListener) return; p.removeListener("accountsChanged", onAccountsChanged); p.removeListener("chainChanged", onChainChanged); };
  }, []);

  const connect = () => {
    if (!provider) return;
    provider.request({ method: "eth_requestAccounts" }).then((accs: string[]) => { setAccounts(accs); setIsConnected(accs.length > 0); }).catch((e: any) => setError(e));
  };

  const value = useMemo<MetaMaskContextType>(() => ({ provider, chainId, accounts, isConnected, error, connect }), [provider, chainId, accounts, isConnected, error]);
  return <MetaMaskContext.Provider value={value}>{children}</MetaMaskContext.Provider>;
}

export function useMetaMask() {
  const ctx = useContext(MetaMaskContext);
  if (!ctx) throw new Error("useMetaMask must be used within MetaMaskProvider");
  return ctx;
}


