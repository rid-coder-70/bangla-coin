import hardhat from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await hardhat.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy Contracts
  const Transfer = await hardhat.ethers.getContractFactory("Transfer");
  const transfer = await Transfer.deploy();
  await transfer.waitForDeployment();
  const transferAddress = await transfer.getAddress();
  console.log("Transfer deployed to:", transferAddress);

  const DAO = await hardhat.ethers.getContractFactory("DAO");
  const dao = await DAO.deploy();
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log("DAO deployed to:", daoAddress);

  const FlagRegistry = await hardhat.ethers.getContractFactory("FlagRegistry");
  const flagRegistry = await FlagRegistry.deploy();
  await flagRegistry.waitForDeployment();
  const flagAddress = await flagRegistry.getAddress();
  console.log("FlagRegistry deployed to:", flagAddress);

  const Freeze = await hardhat.ethers.getContractFactory("Freeze");
  const freeze = await Freeze.deploy();
  await freeze.waitForDeployment();
  const freezeAddress = await freeze.getAddress();
  console.log("Freeze deployed to:", freezeAddress);

  // 2. Seed Demo Wallets (Alice, Bob, Agent)
  const alice = hardhat.ethers.Wallet.createRandom().connect(hardhat.ethers.provider);
  const bob = hardhat.ethers.Wallet.createRandom().connect(hardhat.ethers.provider);
  const agent = hardhat.ethers.Wallet.createRandom().connect(hardhat.ethers.provider);
  const malicious = hardhat.ethers.Wallet.createRandom().connect(hardhat.ethers.provider);

  // Send them some ETH for gas
  await deployer.sendTransaction({ to: alice.address, value: hardhat.ethers.parseEther("1.0") });
  await deployer.sendTransaction({ to: bob.address, value: hardhat.ethers.parseEther("1.0") });
  await deployer.sendTransaction({ to: agent.address, value: hardhat.ethers.parseEther("1.0") });
  await deployer.sendTransaction({ to: malicious.address, value: hardhat.ethers.parseEther("1.0") });

  // 3. Fund Alice and Bob via Transfer.deposit()
  await transfer.deposit(alice.address, 1000);
  await transfer.deposit(bob.address, 500);
  await transfer.deposit(agent.address, 2000);
  console.log("✅ Seeded wallets with BDT");

  // 4. Flag MaliciousUser 3 times
  const flagRegistryAlice = flagRegistry.connect(alice);
  await flagRegistryAlice.flagAccount(malicious.address, "Scam attempt");
  const flagRegistryBob = flagRegistry.connect(bob);
  await flagRegistryBob.flagAccount(malicious.address, "Fake agent");
  const flagRegistryAgent = flagRegistry.connect(agent);
  await flagRegistryAgent.flagAccount(malicious.address, "Phishing");
  console.log("✅ Flagged malicious address 3 times");

  // 5. Create DAO and add pending proposal
  await dao.addMember(alice.address);
  await dao.addMember(bob.address);
  await dao.depositTreasury(300);
  const daoBob = dao.connect(bob);
  await daoBob.propose(agent.address, 100, "Donation to charity");
  console.log("✅ Created DAO and proposal");

  // Save Output
  const deployedAddresses = {
    Transfer: transferAddress,
    DAO: daoAddress,
    FlagRegistry: flagAddress,
    Freeze: freezeAddress,
    Wallets: {
      Alice: { address: alice.address, privateKey: alice.privateKey },
      Bob: { address: bob.address, privateKey: bob.privateKey },
      Agent: { address: agent.address, privateKey: agent.privateKey },
      Malicious: { address: malicious.address, privateKey: malicious.privateKey }
    }
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployedAddresses.json"),
    JSON.stringify(deployedAddresses, null, 2)
  );

  console.log("\nSummary Table:");
  console.table({
    Transfer: transferAddress,
    DAO: daoAddress,
    FlagRegistry: flagAddress,
    Freeze: freezeAddress,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
