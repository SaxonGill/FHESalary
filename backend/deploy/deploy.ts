import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;

  const token = hre.network.name === "sepolia" ? "0x0000000000000000000000000000000000000000" : "0x0000000000000000000000000000000000000000";

  const deployed = await deploy("FHESalary", {
    from: deployer,
    args: [token],
    log: true,
  });

  log(`FHESalary deployed at ${deployed.address}`);
};

export default func;
func.id = "deploy_fhesalary";
func.tags = ["FHESalary"];


