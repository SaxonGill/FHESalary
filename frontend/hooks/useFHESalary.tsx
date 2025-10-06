"use client";

import { ethers } from "ethers";
import { useCallback, useMemo, useRef, useState, RefObject, useEffect } from "react";
import type { FhevmInstance } from "../fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "../fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "../fhevm/GenericStringStorage";
import { FHESalaryABI } from "../abi/FHESalaryABI";
import { FHESalaryAddresses } from "../abi/FHESalaryAddresses";

type FormState = {
  employeeId: number;
  wallet: string;
  interval: number;
  salary: number;
  payAmount: number;
  depositAmount: number;
};

type EmployeeItem = {
  id: number;
  wallet: string;
  payIntervalDays: number;
};

export function useFHESalary(parameters: {
  instance: FhevmInstance | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<(signer: ethers.JsonRpcSigner | undefined) => boolean>;
}) {
  const { instance, chainId, ethersSigner, ethersReadonlyProvider, sameChain, sameSigner } = parameters;
  const storageRef = useRef(new GenericStringStorage());
  const [message, setMessage] = useState<string>("");
  const [decryptedSalary, setDecryptedSalary] = useState<string | number | bigint | undefined>(undefined);
  const [form, setForm] = useState<FormState>({ employeeId: 0, wallet: "", interval: 30, salary: 0, payAmount: 0, depositAmount: 0 });
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [contractBalance, setContractBalance] = useState<string>("-");

  const contract = useMemo(() => {
    if (!chainId) return { abi: FHESalaryABI.abi } as const;
    const entry = FHESalaryAddresses[chainId.toString() as keyof typeof FHESalaryAddresses];
    const address = entry?.address as `0x${string}` | undefined;
    return { abi: FHESalaryABI.abi, address } as const;
  }, [chainId]);

  const canWrite = useMemo(() => !!(contract.address && ethersSigner), [contract.address, ethersSigner]);
  const canEncrypt = useMemo(() => !!(contract.address && ethersSigner && instance), [contract.address, ethersSigner, instance]);

  const refreshEmployees = useCallback(async () => {
    try {
      if (!(contract.address && ethersReadonlyProvider)) return;
      const c = new ethers.Contract(contract.address as string, contract.abi, ethersReadonlyProvider);
      // Merge EmployeeAdded and EmployeeUpdated chronologically
      const fromBlock = 0;
      const toBlock: number | string = "latest";
      const added = (await c.queryFilter((c as any).filters?.EmployeeAdded?.(), fromBlock, toBlock)) as any[];
      const updated = (await c.queryFilter((c as any).filters?.EmployeeUpdated?.(), fromBlock, toBlock)) as any[];
      const merged = [...(added ?? []), ...(updated ?? [])].sort((a, b) => (a.blockNumber - b.blockNumber) || (a.index - b.index) || (a.logIndex - b.logIndex));
      const idToEmployee = new Map<number, EmployeeItem>();
      for (const ev of merged) {
        const args = ev.args as any;
        if (!args) continue;
        const id = Number(args.employeeId ?? args[0]);
        const wallet = String(args.wallet ?? args[1]);
        const payIntervalDays = Number(args.payIntervalDays ?? args[2]);
        idToEmployee.set(id, { id, wallet, payIntervalDays });
      }
      const list = Array.from(idToEmployee.values()).sort((a, b) => a.id - b.id);
      setEmployees(list);
    } catch (e) {
      setMessage(`Failed to load employees: ${String(e)}`);
    }
  }, [contract.address, ethersReadonlyProvider]);

  const refreshContractBalance = useCallback(async () => {
    try {
      if (!contract.address) return;
      const provider: any = (ethersReadonlyProvider as any) ?? (ethersSigner as any)?.provider;
      if (!provider || typeof provider.getBalance !== "function") return;
      const wei: bigint = await provider.getBalance(contract.address as string);
      const scale = 1_000_000_000_000_000_000n; // 1e18
      const intPart = wei / scale;
      const fracPart = wei % scale;
      const display = `${intPart}.${fracPart.toString().padStart(18, "0")}`;
      setContractBalance(display);
    } catch (e) {
      setContractBalance("-");
      setMessage(`Failed to load balance: ${String(e)}`);
    }
  }, [contract.address, ethersReadonlyProvider, ethersSigner]);

  useEffect(() => {
    refreshContractBalance();
  }, [refreshContractBalance]);

  const setEmployee = useCallback(async () => {
    if (!canWrite) return;
    try {
      const c = new ethers.Contract(contract.address as string, contract.abi, ethersSigner);
      const tx = await c.setEmployee(form.employeeId, form.wallet, form.interval);
      setMessage(`Transaction submitted: ${tx.hash}`);
      await tx.wait();
      setMessage(`Employee successfully updated!`);
    } catch (e) {
      setMessage(`Failed to set employee: ${String(e)}`);
    }
  }, [canWrite, contract, ethersSigner, form.employeeId, form.wallet, form.interval]);

  const setEncryptedSalary = useCallback(async () => {
    if (!canEncrypt || !instance) return;
    try {
      const input = instance.createEncryptedInput(contract.address as `0x${string}`, (await ethersSigner!.getAddress()) as `0x${string}`);
      // store salary in micro-ETH (1e-6 ETH) to preserve 6 decimal places within euint32 range
      const scaled = Math.round(form.salary * 1_000_000);
      if (scaled < 0 || scaled > 0xFFFFFFFF) {
        setMessage("Salary amount out of valid range");
        return;
      }
      input.add32(scaled);
      const enc = await input.encrypt();

      const c = new ethers.Contract(contract.address as string, contract.abi, ethersSigner);
      const tx = await c.setEncryptedSalary(form.employeeId, enc.handles[0], enc.inputProof);
      setMessage(`Transaction submitted: ${tx.hash}`);
      await tx.wait();
      setMessage(`Encrypted salary successfully saved!`);
    } catch (e) {
      setMessage(`Failed to set encrypted salary: ${String(e)}`);
    }
  }, [canEncrypt, instance, contract, ethersSigner, form.employeeId, form.salary]);

  const decryptSalary = useCallback(async () => {
    if (!(contract.address && instance && ethersSigner && ethersReadonlyProvider && Number.isFinite(form.employeeId))) return;
    try {
      const c = new ethers.Contract(contract.address as string, contract.abi, ethersReadonlyProvider);
      const handle: string = await c.getEncryptedMonthlySalary(form.employeeId);
      if (!handle || handle === ethers.ZeroHash) {
        setMessage("No salary has been set for this employee");
        return;
      }

      const sig = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [contract.address as `0x${string}`],
        ethersSigner,
        storageRef.current
      );
      if (!sig) {
        setMessage("Unable to generate decryption signature");
        return;
      }
      const res = await instance.userDecrypt(
        [{ handle, contractAddress: contract.address as `0x${string}` }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );
      const value = res[handle] as unknown;
      if (value === false || value === undefined || value === null) {
        setMessage("Decryption failed");
        return;
      }
      // interpret decrypted integer as micro-ETH and format with 6 decimals
      let raw: bigint;
      if (typeof value === "bigint") raw = value;
      else if (typeof value === "number") raw = BigInt(Math.trunc(value));
      else raw = BigInt(String(value));
      const scale = 1_000_000n;
      const intPart = raw / scale;
      const fracPart = raw % scale;
      const display = `${intPart}.${fracPart.toString().padStart(6, "0")}`;
      setDecryptedSalary(display);
      setMessage("Salary successfully decrypted!");
    } catch (e) {
      setMessage(`Failed to decrypt salary: ${String(e)}`);
    }
  }, [contract.address, instance, ethersReadonlyProvider, ethersSigner, form.employeeId]);

  const payNow = useCallback(async () => {
    if (!canWrite) return;
    try {
      const c = new ethers.Contract(contract.address as string, contract.abi, ethersSigner);
      const tx = await c.payNow(form.employeeId, ethers.parseEther(String(form.payAmount)));
      setMessage(`Transaction submitted: ${tx.hash}`);
      await tx.wait();
      setMessage(`Payment successfully sent!`);
    } catch (e) {
      setMessage(`Failed to process payment: ${String(e)}`);
    }
  }, [canWrite, contract, ethersSigner, form.employeeId, form.payAmount]);

  const payIfDue = useCallback(async () => {
    if (!canWrite) return;
    try {
      const c = new ethers.Contract(contract.address as string, contract.abi, ethersSigner);
      const tx = await c.payIfDue(form.employeeId, ethers.parseEther(String(form.payAmount)));
      setMessage(`Transaction submitted: ${tx.hash}`);
      await tx.wait();
      setMessage(`Scheduled payment successfully processed!`);
    } catch (e) {
      setMessage(`Failed to process scheduled payment: ${String(e)}`);
    }
  }, [canWrite, contract, ethersSigner, form.employeeId, form.payAmount]);

  const depositFunds = useCallback(async () => {
    if (!canWrite) return;
    try {
      const c = new ethers.Contract(contract.address as string, contract.abi, ethersSigner);
      const value = ethers.parseEther(String(form.depositAmount));
      const tx = await c.deposit({ value });
      setMessage(`Transaction submitted: ${tx.hash}`);
      await tx.wait();
      setMessage(`Funds successfully deposited!`);
      await refreshContractBalance();
    } catch (e) {
      setMessage(`Failed to deposit funds: ${String(e)}`);
    }
  }, [canWrite, contract, ethersSigner, form.depositAmount, refreshContractBalance]);

  const canDecrypt = useMemo(
    () => Boolean(contract.address && instance && ethersSigner && ethersReadonlyProvider && Number.isFinite(form.employeeId)),
    [contract.address, instance, ethersSigner, ethersReadonlyProvider, form.employeeId]
  );

  return {
    contractAddress: contract.address,
    canWrite,
    canEncrypt,
    canDecrypt,
    setEmployee,
    setEncryptedSalary,
    decryptSalary,
    payNow,
    payIfDue,
    depositFunds,
    contractBalance,
    refreshContractBalance,
    decryptedSalary,
    employees,
    refreshEmployees,
    form,
    setForm,
    message,
  } as const;
}


