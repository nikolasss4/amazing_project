#!/usr/bin/env node
/**
 * Hyperliquid Setup Script for Pear Protocol
 * 
 * This script performs the required one-time setup on Hyperliquid:
 * 1. Approves the Pear Protocol builder fee
 * 2. Creates and approves an agent wallet
 * 
 * Prerequisites:
 * - You must have deposited at least $10 USDC to Hyperliquid
 * - Install dependencies: npm install @nktkas/hyperliquid viem
 * 
 * Usage:
 * node setup-hyperliquid.js YOUR_PRIVATE_KEY
 */

const PEAR_BUILDER_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042";
const MAX_FEE_RATE = "1%";

async function main() {
  // Get private key from command line
  let privateKey = process.argv[2];
  
  if (!privateKey) {
    console.error("❌ Error: Private key is required");
    console.log("\nUsage: node setup-hyperliquid.js YOUR_PRIVATE_KEY");
    console.log("\nExample: node setup-hyperliquid.js 0x1234567890abcdef...");
    process.exit(1);
  }

  // Ensure 0x prefix
  if (!privateKey.startsWith("0x")) {
    privateKey = "0x" + privateKey;
  }

  console.log("\n" + "=".repeat(60));
  console.log("🍐 PEAR PROTOCOL - HYPERLIQUID SETUP");
  console.log("=".repeat(60));

  try {
    // Dynamic imports
    const { HyperliquidClient } = await import("@nktkas/hyperliquid");
    const { privateKeyToAccount, generatePrivateKey } = await import("viem/accounts");

    // Create account from private key
    const account = privateKeyToAccount(privateKey);
    console.log("\n📍 Your wallet address:", account.address);

    // Initialize Hyperliquid client
    const client = new HyperliquidClient({ wallet: account });

    // ========================================
    // Step 1: Approve Builder Fee
    // ========================================
    console.log("\n" + "-".repeat(60));
    console.log("STEP 1: Approving Builder Fee");
    console.log("-".repeat(60));
    console.log("Builder Address:", PEAR_BUILDER_ADDRESS);
    console.log("Max Fee Rate:", MAX_FEE_RATE);
    
    try {
      const builderResult = await client.exchange.approveBuilderFee({
        builder: PEAR_BUILDER_ADDRESS,
        maxFeeRate: MAX_FEE_RATE,
      });
      console.log("✅ Builder fee approved!");
      console.log("Result:", JSON.stringify(builderResult, null, 2));
    } catch (builderError) {
      const errorMsg = builderError.message || String(builderError);
      if (errorMsg.includes("already") || errorMsg.includes("exists")) {
        console.log("ℹ️  Builder fee already approved (skipping)");
      } else {
        console.error("⚠️  Builder fee approval issue:", errorMsg);
        console.log("Continuing anyway...");
      }
    }

    // ========================================
    // Step 2: Create and Approve Agent Wallet
    // ========================================
    console.log("\n" + "-".repeat(60));
    console.log("STEP 2: Creating and Approving Agent Wallet");
    console.log("-".repeat(60));

    // Generate new agent wallet
    const agentPrivateKey = generatePrivateKey();
    const agentAccount = privateKeyToAccount(agentPrivateKey);
    
    console.log("Generated Agent Address:", agentAccount.address);
    
    try {
      const agentResult = await client.exchange.approveAgent({
        agentAddress: agentAccount.address,
        agentName: "PearProtocol",
      });
      console.log("✅ Agent wallet approved!");
      console.log("Result:", JSON.stringify(agentResult, null, 2));
    } catch (agentError) {
      const errorMsg = agentError.message || String(agentError);
      if (errorMsg.includes("already") || errorMsg.includes("exists")) {
        console.log("ℹ️  Agent wallet already approved (skipping)");
      } else {
        console.error("❌ Agent wallet approval failed:", errorMsg);
        throw agentError;
      }
    }

    // ========================================
    // Summary
    // ========================================
    console.log("\n" + "=".repeat(60));
    console.log("✅ SETUP COMPLETE!");
    console.log("=".repeat(60));
    console.log("\n📋 Summary:");
    console.log("   User Address:", account.address);
    console.log("   Agent Address:", agentAccount.address);
    console.log("\n🔑 IMPORTANT - Save this Agent Private Key:");
    console.log("   " + agentPrivateKey);
    console.log("\n⚠️  Keep this private key safe! You'll need it for Pear Protocol.");
    console.log("\n" + "=".repeat(60));

    // Output JSON for programmatic use
    const result = {
      success: true,
      userAddress: account.address,
      agentAddress: agentAccount.address,
      agentPrivateKey: agentPrivateKey,
    };
    
    console.log("\n📦 JSON Output (for programmatic use):");
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("\n❌ Setup failed:", error.message || error);
    console.log("\n🔍 Troubleshooting:");
    console.log("   1. Make sure you have deposited at least $10 USDC to Hyperliquid");
    console.log("   2. Go to https://app.hyperliquid.xyz and connect your wallet first");
    console.log("   3. Ensure your private key is correct (64 hex characters)");
    console.log("   4. Check if you have enough ETH for gas fees");
    process.exit(1);
  }
}

main().catch(console.error);
