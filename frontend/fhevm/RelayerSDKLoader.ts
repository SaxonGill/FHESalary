export type FhevmWindowType = Window & {
  relayerSDK: any & {
    __initialized__?: boolean;
    SepoliaConfig: any;
    initSDK: (options?: any) => Promise<boolean>;
    createInstance: (config: any) => Promise<any>;
  };
};

const SDK_CDN_URL = "https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.umd.cjs";

export class RelayerSDKLoader {
  private _trace?: (message?: unknown, ...optionalParams: unknown[]) => void;

  constructor(options: { trace?: (message?: unknown, ...optionalParams: unknown[]) => void }) {
    this._trace = options.trace;
  }

  public isLoaded() {
    if (typeof window === "undefined") {
      throw new Error("RelayerSDKLoader: can only be used in the browser.");
    }
    return isFhevmWindowType(window, this._trace);
  }

  public load(): Promise<void> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("RelayerSDKLoader: can only be used in the browser."));
    }

    if ("relayerSDK" in window) {
      if (!isFhevmRelayerSDKType((window as any).relayerSDK, this._trace)) {
        throw new Error("RelayerSDKLoader: Unable to load FHEVM Relayer SDK");
      }
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${SDK_CDN_URL}"]`);
      if (existingScript) {
        if (!isFhevmWindowType(window, this._trace)) {
          reject(new Error("RelayerSDKLoader: window object does not contain a valid relayerSDK object."));
        }
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = SDK_CDN_URL;
      script.type = "text/javascript";
      script.async = true;

      script.onload = () => {
        if (!isFhevmWindowType(window, this._trace)) {
          reject(new Error(`RelayerSDKLoader: Relayer SDK script has been successfully loaded from ${SDK_CDN_URL}, however, the window.relayerSDK object is invalid.`));
        }
        resolve();
      };

      script.onerror = () => {
        reject(new Error(`RelayerSDKLoader: Failed to load Relayer SDK from ${SDK_CDN_URL}`));
      };

      document.head.appendChild(script);
    });
  }
}

function isFhevmRelayerSDKType(o: unknown, trace?: (message?: unknown, ...optionalParams: unknown[]) => void): o is FhevmWindowType["relayerSDK"] {
  if (typeof o === "undefined") {
    trace?.("RelayerSDKLoader: relayerSDK is undefined");
    return false;
  }
  if (o === null) {
    trace?.("RelayerSDKLoader: relayerSDK is null");
    return false;
  }
  if (typeof o !== "object") {
    trace?.("RelayerSDKLoader: relayerSDK is not an object");
    return false;
  }
  if (!objHasProperty(o, "initSDK", "function", trace)) {
    trace?.("RelayerSDKLoader: relayerSDK.initSDK is invalid");
    return false;
  }
  if (!objHasProperty(o, "createInstance", "function", trace)) {
    trace?.("RelayerSDKLoader: relayerSDK.createInstance is invalid");
    return false;
  }
  if (!objHasProperty(o, "SepoliaConfig", "object", trace)) {
    trace?.("RelayerSDKLoader: relayerSDK.SepoliaConfig is invalid");
    return false;
  }
  if ("__initialized__" in (o as any)) {
    if ((o as any).__initialized__ !== true && (o as any).__initialized__ !== false) {
      trace?.("RelayerSDKLoader: relayerSDK.__initialized__ is invalid");
      return false;
    }
  }
  return true;
}

export function isFhevmWindowType(win: unknown, trace?: (message?: unknown, ...optionalParams: unknown[]) => void): win is FhevmWindowType {
  if (typeof win === "undefined") {
    trace?.("RelayerSDKLoader: window object is undefined");
    return false;
  }
  if (win === null) {
    trace?.("RelayerSDKLoader: window object is null");
    return false;
  }
  if (typeof win !== "object") {
    trace?.("RelayerSDKLoader: window is not an object");
    return false;
  }
  if (!("relayerSDK" in (win as any))) {
    trace?.("RelayerSDKLoader: window does not contain 'relayerSDK' property");
    return false;
  }
  return isFhevmRelayerSDKType((win as any).relayerSDK);
}

function objHasProperty<T extends object, K extends PropertyKey, V extends string>(
  obj: T,
  propertyName: K,
  propertyType: V,
  trace?: (message?: unknown, ...optionalParams: unknown[]) => void
): obj is T & Record<K, V extends "string" ? string : V extends "number" ? number : V extends "object" ? object : V extends "boolean" ? boolean : V extends "function" ? (...args: any[]) => any : unknown> {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  if (!(propertyName in obj)) {
    trace?.(`RelayerSDKLoader: missing ${String(propertyName)}.`);
    return false;
  }
  const value = (obj as Record<K, unknown>)[propertyName];
  if (value === null || value === undefined) {
    trace?.(`RelayerSDKLoader: ${String(propertyName)} is null or undefined.`);
    return false;
  }
  if (typeof value !== propertyType) {
    trace?.(`RelayerSDKLoader: ${String(propertyName)} is not a ${propertyType}.`);
    return false;
  }
  return true;
}


