#!/usr/bin/env python3
"""
Approve Pear Protocol's Agent Wallet on Hyperliquid

This script approves the SPECIFIC agent wallet that Pear Protocol uses
to execute trades on your behalf.

Usage:
python approve_pear_agent.py YOUR_PRIVATE_KEY
"""

import sys
import json

# Pear Protocol's agent wallet address (they hold the private key)
PEAR_AGENT_ADDRESS = "0xEfC01bF7e433374515f659d0412c7b1986e3b0E7"
PEAR_AGENT_NAME = "PearProtocol"


def main():
    if len(sys.argv) < 2:
        print("❌ Error: Private key is required")
        print("\nUsage: python approve_pear_agent.py YOUR_PRIVATE_KEY")
        sys.exit(1)

    private_key = sys.argv[1]
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key

    print("\n" + "=" * 60)
    print("🍐 APPROVE PEAR PROTOCOL'S AGENT WALLET")
    print("=" * 60)
    print(f"\nPear Agent Address: {PEAR_AGENT_ADDRESS}")
    print(f"Agent Name: {PEAR_AGENT_NAME}")

    try:
        from eth_account import Account
        from hyperliquid.exchange import Exchange
        from hyperliquid.utils.constants import MAINNET_API_URL

        # Create account from private key
        account = Account.from_key(private_key)
        print(f"Your wallet address: {account.address}")

        # Initialize Hyperliquid Exchange client
        exchange = Exchange(wallet=account, base_url=MAINNET_API_URL)

        print("\n" + "-" * 60)
        print("Approving Pear's Agent Wallet...")
        print("-" * 60)

        try:
            # Approve the SPECIFIC agent address that Pear Protocol uses
            result = exchange.approve_agent(
                agent_address=PEAR_AGENT_ADDRESS,
                name=PEAR_AGENT_NAME
            )
            print("✅ Pear Agent Wallet approved!")
            print(f"Result: {json.dumps(result, indent=2, default=str)}")
        except Exception as e:
            error_msg = str(e)
            if "already" in error_msg.lower() or "exists" in error_msg.lower():
                print("ℹ️  Pear Agent already approved")
            else:
                print(f"❌ Approval failed: {error_msg}")
                raise

        print("\n" + "=" * 60)
        print("✅ DONE!")
        print("=" * 60)
        print("\nYou can now trade through Pear Protocol!")

    except ImportError as e:
        print(f"\n❌ Missing dependency: {e}")
        print("\nInstall: pip install hyperliquid-python-sdk eth-account")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
