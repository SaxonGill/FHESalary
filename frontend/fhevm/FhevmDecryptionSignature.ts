import { ethers } from "ethers";
import { EIP712Type, FhevmInstance, FhevmDecryptionSignatureType } from "./fhevmTypes";
import { GenericStringStorage } from "./GenericStringStorage";

function _timestampNow(): number { return Math.floor(Date.now() / 1000); }

class FhevmDecryptionSignatureStorageKey {
  #contractAddresses: `0x${string}`[];
  #userAddress: `0x${string}`;
  #publicKey: string | undefined;
  #key: string;
  constructor(instance: FhevmInstance, contractAddresses: string[], userAddress: string, publicKey?: string) {
    if (!ethers.isAddress(userAddress)) throw new TypeError(`Invalid address ${userAddress}`);
    const sortedContractAddresses = (contractAddresses as `0x${string}`[]).sort();
    const emptyEIP712 = instance.createEIP712(publicKey ?? ethers.ZeroAddress, sortedContractAddresses, 0, 0);
    const hash = ethers.TypedDataEncoder.hash(emptyEIP712.domain, { UserDecryptRequestVerification: (emptyEIP712 as any).types.UserDecryptRequestVerification }, emptyEIP712.message);
    this.#contractAddresses = sortedContractAddresses; this.#userAddress = userAddress as `0x${string}`; this.#key = `${userAddress}:${hash}`;
  }
  get contractAddresses() { return this.#contractAddresses; }
  get userAddress() { return this.#userAddress; }
  get publicKey() { return this.#publicKey; }
  get key() { return this.#key; }
}

export class FhevmDecryptionSignature {
  #publicKey: string; #privateKey: string; #signature: string; #startTimestamp: number; #durationDays: number; #userAddress: `0x${string}`; #contractAddresses: `0x${string}`[]; #eip712: EIP712Type;
  private constructor(parameters: FhevmDecryptionSignatureType) { this.#publicKey = parameters.publicKey; this.#privateKey = parameters.privateKey; this.#signature = parameters.signature; this.#startTimestamp = parameters.startTimestamp; this.#durationDays = parameters.durationDays; this.#userAddress = parameters.userAddress; this.#contractAddresses = parameters.contractAddresses; this.#eip712 = parameters.eip712; }
  public get privateKey() { return this.#privateKey; }
  public get publicKey() { return this.#publicKey; }
  public get signature() { return this.#signature; }
  public get contractAddresses() { return this.#contractAddresses; }
  public get startTimestamp() { return this.#startTimestamp; }
  public get durationDays() { return this.#durationDays; }
  public get userAddress() { return this.#userAddress; }
  static checkIs(s: unknown): s is FhevmDecryptionSignatureType { return !!s; }
  toJSON() { return { publicKey: this.#publicKey, privateKey: this.#privateKey, signature: this.#signature, startTimestamp: this.#startTimestamp, durationDays: this.#durationDays, userAddress: this.#userAddress, contractAddresses: this.#contractAddresses, eip712: this.#eip712 }; }
  static fromJSON(json: unknown) { const data = typeof json === "string" ? JSON.parse(json) : json; return new FhevmDecryptionSignature(data as any); }
  equals(s: FhevmDecryptionSignatureType) { return s.signature === this.#signature; }
  isValid(): boolean { return _timestampNow() < this.#startTimestamp + this.#durationDays * 24 * 60 * 60; }
  async saveToGenericStringStorage(storage: GenericStringStorage, instance: FhevmInstance, withPublicKey: boolean) {
    const value = JSON.stringify(this);
    const storageKey = new FhevmDecryptionSignatureStorageKey(instance, this.#contractAddresses, this.#userAddress, withPublicKey ? this.#publicKey : undefined);
    await storage.setItem(storageKey.key, value);
  }
  static async loadFromGenericStringStorage(storage: GenericStringStorage, instance: FhevmInstance, contractAddresses: string[], userAddress: string, publicKey?: string) {
    const storageKey = new FhevmDecryptionSignatureStorageKey(instance, contractAddresses, userAddress, publicKey);
    const result = await storage.getItem(storageKey.key); if (!result) return null; try { const kps = FhevmDecryptionSignature.fromJSON(result); if (!kps.isValid()) return null; return kps; } catch { return null; }
  }
  static async new(instance: FhevmInstance, contractAddresses: string[], publicKey: string, privateKey: string, signer: ethers.Signer) {
    const userAddress = (await signer.getAddress()) as `0x${string}`;
    const startTimestamp = _timestampNow(); const durationDays = 365; const eip712 = instance.createEIP712(publicKey, contractAddresses as `0x${string}`[], startTimestamp, durationDays);
    const signature = await (signer as any).signTypedData(eip712.domain, { UserDecryptRequestVerification: (eip712 as any).types.UserDecryptRequestVerification }, eip712.message);
    return new FhevmDecryptionSignature({ publicKey, privateKey, contractAddresses: contractAddresses as `0x${string}`[], startTimestamp, durationDays, signature, eip712: eip712 as EIP712Type, userAddress });
  }
  static async loadOrSign(instance: FhevmInstance, contractAddresses: string[], signer: ethers.Signer, storage: GenericStringStorage, keyPair?: { publicKey: string; privateKey: string }) {
    const userAddress = (await signer.getAddress()) as `0x${string}`;
    const cached = await FhevmDecryptionSignature.loadFromGenericStringStorage(storage, instance, contractAddresses, userAddress, keyPair?.publicKey);
    if (cached) return cached;
    const { publicKey, privateKey } = keyPair ?? instance.generateKeypair();
    const sig = await FhevmDecryptionSignature.new(instance, contractAddresses, publicKey, privateKey, signer);
    await sig.saveToGenericStringStorage(storage, instance, Boolean(keyPair?.publicKey));
    return sig;
  }
}

// type moved to './fhevmTypes'


