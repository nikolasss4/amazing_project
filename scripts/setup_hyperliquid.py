#!/usr/bin/env python3
"""
Hyperliquid Setup Script for Pear Protocol

This script performs the required one-time setup on Hyperliquid:
1. Approves the Pear Protocol builder fee
2. Creates and approves an agent wallet

Prerequisites:
- You must have deposited at least $10 USDC to Hyperliquid
- pip install hyperliquid-python-sdk eth-account

Usage:
python setup_hyperliquid.py YOUR_PRIVATE_KEY
"""

import sys
import json
import secrets

PEAR_BUILDER_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042"
MAX_FEE_RATE = "1%"


def main():
    if len(sys.argv) < 2:
        print("❌ Error: Private key is required")
        print("\nUsage: python setup_hyperliquid.py YOUR_PRIVATE_KEY")
        print("\nExample: python setup_hyperliquid.py 0x1234567890abcdef...")
        sys.exit(1)

    private_key = sys.argv[1]
    
    # Ensure 0x prefix
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key

    print("\n" + "=" * 60)
    print("🍐 PEAR PROTOCOL - HYPERLIQUID SETUP")
    print("=" * 60)

    try:
        from eth_account import Account
        from hyperliquid.exchange import Exchange
        from hyperliquid.utils.constants import MAINNET_API_URL

        # Create account from private key
        account = Account.from_key(private_key)
        print(f"\n📍 Your wallet address: {account.address}")

        # Initialize Hyperliquid Exchange client
        exchange = Exchange(wallet=account, base_url=MAINNET_API_URL)

        # ========================================
        # Step 1: Approve Builder Fee
        # ========================================
        print("\n" + "-" * 60)
        print("STEP 1: Approving Builder Fee")
        print("-" * 60)
        print(f"Builder Address: {PEAR_BUILDER_ADDRESS}")
        print(f"Max Fee Rate: {MAX_FEE_RATE}")

        try:
            builder_result = exchange.approve_builder_fee(
                builder=PEAR_BUILDER_ADDRESS,
                max_fee_rate=MAX_FEE_RATE
            )
            print("✅ Builder fee approved!")
            print(f"Result: {json.dumps(builder_result, indent=2)}")
        except Exception as e:
            error_msg = str(e)
            if "already" in error_msg.lower() or "exists" in error_msg.lower():
                print("ℹ️  Builder fee already approved (skipping)")
            else:
                print(f"⚠️  Builder fee approval issue: {error_msg}")
                print("Continuing anyway...")

        # ========================================
        # Step 2: Create and Approve Agent Wallet
        # ========================================
        print("\n" + "-" * 60)
        print("STEP 2: Creating and Approving Agent Wallet")
        print("-" * 60)

        # Generate new agent wallet
        agent_private_key = "0x" + secrets.token_hex(32)
        agent_account = Account.from_key(agent_private_key)

        print(f"Generated Agent Address: {agent_account.address}")

        try:
            # The approve_agent method returns (response, agent_key) tuple
            agent_result = exchange.approve_agent(name="PearProtocol")
            
            if isinstance(agent_result, tuple):
                response, returned_key = agent_result
                print("✅ Agent wallet approved!")
                print(f"Response: {response}")
                if returned_key:
                    agent_private_key = returned_key
                    agent_account = Account.from_key(
                        returned_key if returned_key.startswith("0x") else f"0x{returned_key}"
                    )
            else:
                print("✅ Agent wallet approved!")
                print(f"Result: {agent_result}")
                
        except Exception as e:
            error_msg = str(e)
            if "already" in error_msg.lower() or "exists" in error_msg.lower():
                print("ℹ️  Agent wallet already approved")
            else:
                print(f"❌ Agent wallet approval failed: {error_msg}")
                raise

        # ========================================
        # Summary
        # ========================================
        print("\n" + "=" * 60)
        print("✅ SETUP COMPLETE!")
        print("=" * 60)
        print("\n📋 Summary:")
        print(f"   User Address: {account.address}")
        print(f"   Agent Address: {agent_account.address}")
        print("\n🔑 IMPORTANT - Save this Agent Private Key:")
        print(f"   {agent_private_key}")
        print("\n⚠️  Keep this private key safe! You'll need it for Pear Protocol.")
        print("\n" + "=" * 60)

        # Output JSON for programmatic use
        result = {
            "success": True,
            "userAddress": account.address,
            "agentAddress": agent_account.address,
            "agentPrivateKey": agent_private_key,
        }

        print("\n📦 JSON Output (for programmatic use):")
        print(json.dumps(result, indent=2))

    except ImportError as e:
        print(f"\n❌ Missing dependency: {e}")
        print("\nInstall required packages:")
        print("   pip install hyperliquid-python-sdk eth-account")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        print("\n🔍 Troubleshooting:")
        print("   1. Make sure you have deposited at least $10 USDC to Hyperliquid")
        print("   2. Go to https://app.hyperliquid.xyz and connect your wallet first")
        print("   3. Ensure your private key is correct (64 hex characters)")
        print("   4. Check if you have enough ETH for gas fees")
        sys.exit(1)


if __name__ == "__main__":
    main()
