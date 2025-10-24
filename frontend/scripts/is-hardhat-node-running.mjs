import { JsonRpcProvider } from "ethers";

const url = process.env.HARDHAT_URL || "http://localhost:8545";

async function main() {
  const provider = new JsonRpcProvider(url);
  try {
    const chainId = (await provider.getNetwork()).chainId;
    console.log(`Hardhat node reachable at ${url} chainId=${chainId}`);
  } catch (e) {
    console.error(`Hardhat node is not reachable at ${url}. Start it first.`);
    process.exit(1);
  } finally {
    provider.destroy();
  }
}

main();


