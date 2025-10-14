import { Eip1193Provider, JsonRpcProvider } from "ethers";
import type { FhevmInstance, FhevmInstanceConfig, FhevmInitSDKOptions, FhevmLoadSDKType, FhevmInitSDKType } from "../fhevmTypes";
import { RelayerSDKLoader, isFhevmWindowType } from "../RelayerSDKLoader";
import { publicKeyStorageGet, publicKeyStorageSet } from "../PublicKeyStorage";

type ErrorOptionsCompat = { cause?: unknown } | undefined;
export class FhevmReactError extends Error { constructor(public code: string, message?: string, options?: ErrorOptionsCompat) { super(message); if (options && (options as any).cause) (this as any).cause = (options as any).cause; this.name = "FhevmReactError"; } }
function throwFhevmError(code: string, message?: string, cause?: unknown): never { throw new FhevmReactError(code, message, cause ? { cause } : undefined); }

const isFhevmInitialized = (): boolean => {
  if (!isFhevmWindowType(window, console.log)) return false;
  return (window as any).relayerSDK.__initialized__ === true;
};

const fhevmLoadSDK: FhevmLoadSDKType = async () => { const loader = new RelayerSDKLoader({ trace: console.log }); await loader.load(); return; };
const fhevmInitSDK: FhevmInitSDKType = async (options?: FhevmInitSDKOptions) => {
  if (!isFhevmWindowType(window, console.log)) throw new Error("window.relayerSDK is not available");
  const result = await (window as any).relayerSDK.initSDK(options);
  (window as any).relayerSDK.__initialized__ = result;
  if (!result) throw new Error("window.relayerSDK.initSDK failed.");
  return true;
};

async function getChainId(providerOrUrl: Eip1193Provider | string): Promise<number> {
  if (typeof providerOrUrl === "string") { const provider = new JsonRpcProvider(providerOrUrl); const id = Number((await provider.getNetwork()).chainId); provider.destroy(); return id; }
  const chainId = await providerOrUrl.request({ method: "eth_chainId" });
  return Number.parseInt(chainId as string, 16);
}

async function getWeb3Client(rpcUrl: string) { const rpc = new JsonRpcProvider(rpcUrl); try { return await rpc.send("web3_clientVersion", []); } finally { rpc.destroy(); } }
async function getFHEVMRelayerMetadata(rpcUrl: string) { const rpc = new JsonRpcProvider(rpcUrl); try { return await rpc.send("fhevm_relayer_metadata", []); } finally { rpc.destroy(); } }

type ResolveResult = { isMock: boolean; chainId: number; rpcUrl?: string };
async function resolve(providerOrUrl: Eip1193Provider | string, mockChains?: Record<number, string>): Promise<ResolveResult> {
  const chainId = await getChainId(providerOrUrl);
  let rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : undefined;
  const _mock = { 31337: "http://localhost:8545", ...(mockChains ?? {}) } as Record<number, string>;
  if (Object.prototype.hasOwnProperty.call(_mock, chainId)) { if (!rpcUrl) rpcUrl = _mock[chainId]; return { isMock: true, chainId, rpcUrl }; }
  return { isMock: false, chainId, rpcUrl };
}

export const createFhevmInstance = async (parameters: {
  provider: Eip1193Provider | string;
  mockChains?: Record<number, string>;
  signal: AbortSignal;
  onStatusChange?: (status: "sdk-loading" | "sdk-loaded" | "sdk-initializing" | "sdk-initialized" | "creating") => void;
}): Promise<FhevmInstance> => {
  const { provider: providerOrUrl, mockChains, signal, onStatusChange } = parameters;
  const notify = (s: "sdk-loading" | "sdk-loaded" | "sdk-initializing" | "sdk-initialized" | "creating") => onStatusChange && onStatusChange(s);
  const throwIfAborted = () => { if (signal.aborted) throw new Error("FHEVM operation was cancelled"); };

  const { isMock, rpcUrl, chainId } = await resolve(providerOrUrl, mockChains);
  if (isMock && rpcUrl) {
    const version = await getWeb3Client(rpcUrl);
    if (typeof version === "string" && version.toLowerCase().includes("hardhat")) {
      try {
        const metadata = await getFHEVMRelayerMetadata(rpcUrl);
        if (metadata && typeof metadata === "object") {
          notify("creating");
          const fhevmMock = await import("./mock/fhevmMock");
          const instance = await fhevmMock.fhevmMockCreateInstance({ rpcUrl, chainId, metadata });
          throwIfAborted();
          return instance as unknown as FhevmInstance;
        }
      } catch {}
    }
  }

  throwIfAborted();
  if (!isFhevmWindowType(window, console.log)) { notify("sdk-loading"); await fhevmLoadSDK(); throwIfAborted(); notify("sdk-loaded"); }
  if (!isFhevmInitialized()) { notify("sdk-initializing"); await fhevmInitSDK(); throwIfAborted(); notify("sdk-initialized"); }
  const relayerSDK = (window as any).relayerSDK;
  const aclAddress = relayerSDK.SepoliaConfig.aclContractAddress;
  const pub = await publicKeyStorageGet(aclAddress);
  const config: FhevmInstanceConfig = { ...relayerSDK.SepoliaConfig, network: providerOrUrl, publicKey: pub.publicKey, publicParams: pub.publicParams };
  notify("creating");
  const instance = await relayerSDK.createInstance(config);
  await publicKeyStorageSet(aclAddress, instance.getPublicKey(), instance.getPublicParams(2048));
  throwIfAborted();
  return instance;
};


