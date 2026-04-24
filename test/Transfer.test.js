import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("Transfer Contract", function () {
  let Transfer;
  let transfer;
  let owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    Transfer = await ethers.getContractFactory("Transfer");
    transfer = await Transfer.deploy();
    await transfer.waitForDeployment();
  });

  it("Should deposit funds successfully", async function () {
    await transfer.deposit(alice.address, 1000);
    expect(await transfer.balances(alice.address)).to.equal(1000);
  });

  it("Should queue transfer with delay", async function () {
    await transfer.deposit(alice.address, 1000);
    
    // Send 100 BDT with 10 sec delay
    await expect(transfer.connect(alice).sendWithDelay(bob.address, 100, 10))
      .to.emit(transfer, "TransferQueued");
      
    expect(await transfer.balances(alice.address)).to.equal(900);
    expect(await transfer.balances(bob.address)).to.equal(0);
  });

  it("Should confirm transfer after delay", async function () {
    await transfer.deposit(alice.address, 1000);
    await transfer.connect(alice).sendWithDelay(bob.address, 100, 2); // 2 sec delay
    
    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [3]);
    await ethers.provider.send("evm_mine");

    await expect(transfer.confirmTransfer(0))
      .to.emit(transfer, "TransferExecuted");

    expect(await transfer.balances(bob.address)).to.equal(100);
  });

  it("Should cancel transfer within window", async function () {
    await transfer.deposit(alice.address, 1000);
    await transfer.connect(alice).sendWithDelay(bob.address, 100, 10);
    
    await expect(transfer.connect(alice).cancelPending(0))
      .to.emit(transfer, "TransferCancelled");

    // Alice gets refund
    expect(await transfer.balances(alice.address)).to.equal(1000);
  });

  it("Should fail cancel after execution", async function () {
    await transfer.deposit(alice.address, 1000);
    await transfer.connect(alice).sendWithDelay(bob.address, 100, 2);
    
    await ethers.provider.send("evm_increaseTime", [3]);
    await ethers.provider.send("evm_mine");

    await transfer.confirmTransfer(0);

    await expect(transfer.connect(alice).cancelPending(0))
      .to.be.revertedWith("Already settled");
  });

  it("Should clamp delay at 180s", async function () {
    await transfer.deposit(alice.address, 1000);
    await transfer.connect(alice).sendWithDelay(bob.address, 100, 500); // Try 500s
    
    const tx = await transfer.getTx(0);
    const block = await ethers.provider.getBlock("latest");
    expect(tx.unlockTime).to.equal(block.timestamp + 180); // clamped
  });

  it("Should fail send on insufficient balance", async function () {
    await expect(transfer.connect(alice).sendWithDelay(bob.address, 100, 10))
      .to.be.revertedWith("Insufficient balance");
  });
});
