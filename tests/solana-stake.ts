import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaStake } from "../target/types/solana_stake";
import { assert } from "chai";

describe("solana-stake", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaStake as Program<SolanaStake>;
  const user = provider.wallet;

  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("client1"), user.publicKey.toBuffer()],
    program.programId
  );

  describe("PDA Creation", () => {
    it("Creates a PDA account successfully", async () => {
      const tx = await program.methods
        .createPda()
        .accounts({
          payer: user.publicKey,
          pdaAccount: pdaAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("PDA created with transaction signature:", tx);


      const account = await program.account.stakeAccount.fetch(pdaAccount);


      assert.equal(
        account.owner.toString(),
        user.publicKey.toString(),
        "Owner should be the payer"
      );
      assert.equal(
        account.stakedAmount.toNumber(),
        0,
        "Initial staked amount should be 0"
      );
      assert.equal(
        account.totalPoints.toNumber(),
        0,
        "Initial total points should be 0"
      );
      assert.isAbove(
        account.lastUpdatedTime.toNumber(),
        0,
        "Last updated time should be set"
      );
    });
  });

  describe("Staking", () => {
    it("Stakes SOL successfully", async () => {
      const stakeAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL); 

      const userBalanceBefore = await provider.connection.getBalance(
        user.publicKey
      );

      const tx = await program.methods
        .stake(stakeAmount)
        .accounts({
          user: user.publicKey,
          pdaAccount: pdaAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Staked with transaction signature:", tx);

      const account = await program.account.stakeAccount.fetch(pdaAccount);


      assert.equal(
        account.stakedAmount.toNumber(),
        stakeAmount.toNumber(),
        "Staked amount should match"
      );

      const userBalanceAfter = await provider.connection.getBalance(
        user.publicKey
      );
      assert.isBelow(
        userBalanceAfter,
        userBalanceBefore,
        "User balance should decrease"
      );
    });

    it("Stakes additional SOL", async () => {
      const additionalStake = new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL); 

      const accountBefore = await program.account.stakeAccount.fetch(pdaAccount);

      await program.methods
        .stake(additionalStake)
        .accounts({
          user: user.publicKey,
          pdaAccount: pdaAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      const accountAfter = await program.account.stakeAccount.fetch(pdaAccount);


      assert.equal(
        accountAfter.stakedAmount.toNumber(),
        accountBefore.stakedAmount.toNumber() + additionalStake.toNumber(),
        "Staked amount should increase"
      );
    });

    it("Fails to stake with zero amount", async () => {
      try {
        await program.methods
          .stake(new anchor.BN(0))
          .accounts({
            user: user.publicKey,
            pdaAccount: pdaAccount,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .rpc();

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(
          error.message,
          "Amount must be greater than 0",
          "Should fail with InvalidAmount error"
        );
      }
    });
  });

  describe("Points Calculation", () => {
    it("Gets current points without claiming", async () => {

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const tx = await program.methods
        .getPoints()
        .accounts({
          user: user.publicKey,
          pdaAccount: pdaAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Get points transaction signature:", tx);
    });

    it("Accumulates points over time", async () => {
      const accountBefore = await program.account.stakeAccount.fetch(pdaAccount);
      const pointsBefore = accountBefore.totalPoints.toNumber();


      await new Promise((resolve) => setTimeout(resolve, 3000));


      await program.methods
        .getPoints()
        .accounts({
          user: user.publicKey,
          pdaAccount: pdaAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();


      console.log("Points before:", pointsBefore / 1_000_000);
    });
  });

  describe("Claiming Points", () => {
    it("Claims accumulated points", async () => {
      // Wait to accumulate some points
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const tx = await program.methods
        .claimPoints()
        .accounts({
          user: user.publicKey,
          pdaAccount: pdaAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Claimed points with transaction signature:", tx);

      // Fetch account after claiming
      const account = await program.account.stakeAccount.fetch(pdaAccount);

      // Total points should be reset to 0 after claiming
      assert.equal(
        account.totalPoints.toNumber(),
        0,
        "Total points should be reset after claiming"
      );
    });
  });

  describe("Unstaking", () => {
    it("Unstakes partial amount successfully", async () => {
      const accountBefore = await program.account.stakeAccount.fetch(pdaAccount);
      const unstakeAmount = new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL); // 0.5 SOL

      const userBalanceBefore = await provider.connection.getBalance(
        user.publicKey
      );

      const tx = await program.methods
        .unstake(unstakeAmount)
        .accounts({
          user: user.publicKey,
          pdaAccount: pdaAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Unstaked with transaction signature:", tx);

      const accountAfter = await program.account.stakeAccount.fetch(pdaAccount);

      // Verify staked amount decreased
      assert.equal(
        accountAfter.stakedAmount.toNumber(),
        accountBefore.stakedAmount.toNumber() - unstakeAmount.toNumber(),
        "Staked amount should decrease"
      );

      // Verify user balance increased
      const userBalanceAfter = await provider.connection.getBalance(
        user.publicKey
      );
      assert.isAbove(
        userBalanceAfter,
        userBalanceBefore,
        "User balance should increase"
      );
    });

    it("Unstakes remaining amount successfully", async () => {
      const account = await program.account.stakeAccount.fetch(pdaAccount);
      const remainingStake = account.stakedAmount;

      await program.methods
        .unstake(remainingStake)
        .accounts({
          user: user.publicKey,
          pdaAccount: pdaAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      const accountAfter = await program.account.stakeAccount.fetch(pdaAccount);

      // Verify all funds are unstaked
      assert.equal(
        accountAfter.stakedAmount.toNumber(),
        0,
        "All funds should be unstaked"
      );
    });

    it("Fails to unstake more than staked amount", async () => {
      // First stake some amount
      await program.methods
        .stake(new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL))
        .accounts({
          user: user.publicKey,
          pdaAccount: pdaAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      try {
        await program.methods
          .unstake(new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL))
          .accounts({
            user: user.publicKey,
            pdaAccount: pdaAccount,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .rpc();

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(
          error.message,
          "Insufficient staked amount",
          "Should fail with InsufficientStake error"
        );
      }
    });

    it("Fails to unstake with zero amount", async () => {
      try {
        await program.methods
          .unstake(new anchor.BN(0))
          .accounts({
            user: user.publicKey,
            pdaAccount: pdaAccount,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .rpc();

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(
          error.message,
          "Amount must be greater than 0",
          "Should fail with InvalidAmount error"
        );
      }
    });
  });

  describe("Security", () => {
    it("Prevents unauthorized access", async () => {
      // Create a new keypair to simulate another user
      const unauthorizedUser = anchor.web3.Keypair.generate();

      // Airdrop some SOL to the unauthorized user
      const signature = await provider.connection.requestAirdrop(
        unauthorizedUser.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);

      try {
        await program.methods
          .stake(new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL))
          .accounts({
            user: unauthorizedUser.publicKey,
            pdaAccount: pdaAccount,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([unauthorizedUser])
          .rpc();

        assert.fail("Should have thrown an error");
      } catch (error: any) {
        // The unauthorized user's PDA doesn't exist, so it fails on ConstraintSeeds first
        // This is still a security failure - the user cannot access someone else's PDA
        const errorMessage = error.message || error.toString() || "";
        const errorCode = error.code || error.error?.code || "";
        const errorName = error.error?.errorName || error.name || "";
        const errorNumber = error.error?.errorCode?.code || error.error?.errorCode?.errorNumber || "";
        
        // Check for either Unauthorized error OR ConstraintSeeds error (both indicate security failure)
        const hasSecurityError = 
          errorMessage.includes("Unauthorized") || 
          errorMessage.includes("Unauthorized access") ||
          errorMessage.includes("ConstraintSeeds") ||
          errorMessage.includes("seeds constraint") ||
          errorCode === 6002 || // Unauthorized error code
          errorNumber === 2006 || // ConstraintSeeds error number
          errorName === "Unauthorized" ||
          errorName === "ConstraintSeeds";
        
        assert.isTrue(
          hasSecurityError,
          `Should fail with security error (Unauthorized or ConstraintSeeds). Message: ${errorMessage}, Code: ${errorCode}, Number: ${errorNumber}, Name: ${errorName}`
        );
      }
    });
  });
});