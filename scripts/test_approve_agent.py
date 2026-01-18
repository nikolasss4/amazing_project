#!/usr/bin/env python3
"""
Test script - follows the exact pattern from user's working scripts
"""

import sys
import os
import json
from dotenv import load_dotenv
from eth_account import Account
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants

# 1. CONFIGURATION
load_dotenv()

MAIN_WALLET_PRIVATE_KEY = os.getenv("PRIVATE_KEY")
AGENT_TO_APPROVE = "0xEfC01bF7e433374515f659d0412c7b1986e3b0E7"  # Pear's agent

def main():
    # Get private key from args or env
    if len(sys.argv) > 1:
        private_key = sys.argv[1]
    else:
        private_key = MAIN_WALLET_PRIVATE_KEY
    
    if not private_key:
        print("❌ Error: Please provide private key as argument or set PRIVATE_KEY in .env")
        return
    
    if not private_key.startswith("0x"):
        private_key = f"0x{private_key}"

    try:
        print("🔐 Setting up Main Wallet connection...")
        
        account = Account.from_key(private_key)
        print(f"Authenticating as: {account.address}")

        # Initialize Hyperliquid Exchange Client
        exchange = Exchange(account, constants.MAINNET_API_URL)

        print(f"📤 Sending 'Approve Agent' transaction for: {AGENT_TO_APPROVE}")
        print("   (This signs a message on Hyperliquid L1, no gas fee required)")

        # The Action: Approve Agent - EXACTLY as user showed
        result = exchange.approve_agent(
            agent_address=AGENT_TO_APPROVE,
            agent_name="Agent Pear"
        )

        # Success
        print("\n✅ Success! Agent Approved.")
        print("-" * 48)
        print(f"Result: {result}")
        print("-" * 48)

    except TypeError as e:
        print(f"\n⚠️  TypeError: {e}")
        print("\nThe SDK may not support agent_address parameter.")
        print("Checking SDK version and available parameters...")
        
        import inspect
        sig = inspect.signature(Exchange.approve_agent)
        print(f"approve_agent signature: {sig}")
        
    except Exception as e:
        print(f"\n❌ Error approving agent: {e}")

if __name__ == "__main__":
    main()
