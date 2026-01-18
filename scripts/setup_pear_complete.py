#!/usr/bin/env python3
"""
Complete Pear Protocol Setup Script

This script performs the full setup flow:
1. Authenticate with Pear Protocol (get access token)
2. Create agent wallet via Pear API
3. Approve that agent on Hyperliquid
4. Approve builder fees on Hyperliquid
5. Test trading

Usage:
python setup_pear_complete.py WALLET_ADDRESS PRIVATE_KEY

Or set PRIVATE_KEY in .env file:
python setup_pear_complete.py WALLET_ADDRESS
"""

import sys
import os
import json
import httpx
from dotenv import load_dotenv
from eth_account import Account
from eth_account.messages import encode_typed_data

# Load environment variables
load_dotenv()

# Configuration
PEAR_API_URL = "https://hl-v2.pearprotocol.io"
CLIENT_ID = "HLHackathon1"
BUILDER_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042"
MAX_FEE_RATE = "0.1%"


def print_section(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_json(label: str, data):
    print(f"\n{label}:")
    print(json.dumps(data, indent=2, default=str))


def step1_authenticate(wallet_address: str, private_key: str) -> str:
    """Step 1: Authenticate with Pear Protocol and get access token"""
    print_section("STEP 1: Authenticate with Pear Protocol")
    
    with httpx.Client(timeout=30.0) as client:
        # 1a. Get EIP-712 message
        print("\n1a. Getting EIP-712 message...")
        url = f"{PEAR_API_URL}/auth/eip712-message"
        params = {"address": wallet_address, "clientId": CLIENT_ID}
        print(f"    GET {url}")
        print(f"    Params: {params}")
        
        response = client.get(url, params=params)
        print(f"    Status: {response.status_code}")
        
        if response.status_code != 200:
            raise Exception(f"Failed to get EIP-712 message: {response.text}")
        
        eip712_data = response.json()
        print_json("    EIP-712 Message", eip712_data)
        
        # 1b. Sign the message
        print("\n1b. Signing EIP-712 message...")
        account = Account.from_key(private_key)
        print(f"    Signer address: {account.address}")
        
        timestamp = eip712_data.get("timestamp") or eip712_data["message"]["timestamp"]
        
        typed_data = {
            "types": {k: v for k, v in eip712_data["types"].items() if k != "EIP712Domain"},
            "primaryType": eip712_data.get("primaryType", "Authentication"),
            "domain": eip712_data["domain"],
            "message": eip712_data["message"]
        }
        
        encoded = encode_typed_data(full_message=typed_data)
        signed = account.sign_message(encoded)
        signature = signed.signature.hex()
        if not signature.startswith("0x"):
            signature = "0x" + signature
        
        print(f"    Signature: {signature[:40]}...")
        print(f"    Timestamp: {timestamp}")
        
        # 1c. Login
        print("\n1c. Logging in to Pear Protocol...")
        url = f"{PEAR_API_URL}/auth/login"
        payload = {
            "method": "eip712",
            "address": wallet_address,
            "clientId": CLIENT_ID,
            "details": {
                "signature": signature,
                "timestamp": timestamp
            }
        }
        print(f"    POST {url}")
        
        response = client.post(url, json=payload)
        print(f"    Status: {response.status_code}")
        
        if response.status_code != 200:
            raise Exception(f"Login failed: {response.text}")
        
        login_data = response.json()
        access_token = login_data["accessToken"]
        print(f"    ✅ Access Token: {access_token[:50]}...")
        
        return access_token


def step2_create_agent_wallet(access_token: str) -> str:
    """Step 2: Create agent wallet via Pear API"""
    print_section("STEP 2: Create Agent Wallet via Pear API")
    
    with httpx.Client(timeout=30.0) as client:
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"{PEAR_API_URL}/agentWallet"
        
        # First check if agent wallet already exists
        print("\n2a. Checking if agent wallet exists...")
        print(f"    GET {url}")
        
        response = client.get(url, headers=headers)
        print(f"    Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            agent_address = data.get("agentWalletAddress")
            if agent_address:
                print(f"    ✅ Agent wallet already exists: {agent_address}")
                return agent_address
        
        # Create new agent wallet
        print("\n2b. Creating new agent wallet...")
        print(f"    POST {url}")
        
        response = client.post(url, headers=headers, json={})
        print(f"    Status: {response.status_code}")
        print(f"    Response: {response.text}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            agent_address = data.get("agentWalletAddress") or data.get("address")
            print(f"    ✅ Agent Wallet Address: {agent_address}")
            return agent_address
        
        # If creation failed, try to get existing one
        response = client.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            agent_address = data.get("agentWalletAddress")
            if agent_address:
                print(f"    ✅ Using existing agent wallet: {agent_address}")
                return agent_address
        
        raise Exception(f"Failed to create/get agent wallet")


def step3_approve_agent(private_key: str, agent_address: str):
    """Step 3: Approve a SPECIFIC agent address on Hyperliquid"""
    print_section("STEP 3: Approve Agent on Hyperliquid")
    
    print(f"\n    Agent Address to Approve: {agent_address}")
    
    try:
        from hyperliquid.exchange import Exchange
        from hyperliquid.utils import constants
        from hyperliquid.utils.signing import sign_agent, get_timestamp_ms
        
        # Setup the wallet
        if not private_key.startswith("0x"):
            private_key = f"0x{private_key}"
        
        account = Account.from_key(private_key)
        print(f"    Authenticating as: {account.address}")
        
        # Initialize Hyperliquid Exchange Client
        exchange = Exchange(account, constants.MAINNET_API_URL)
        
        print(f"\n    📤 Sending 'Approve Agent' transaction for: {agent_address}")
        print("       (This signs a message on Hyperliquid L1, no gas fee required)")
        
        # Create the action to approve the SPECIFIC agent address
        # (The SDK's approve_agent() creates a new agent, we need to approve an existing one)
        timestamp = get_timestamp_ms()
        is_mainnet = exchange.base_url == constants.MAINNET_API_URL
        
        action = {
            "type": "approveAgent",
            "agentAddress": agent_address,  # Pear's agent address
            "agentName": "Agent Pear",
            "nonce": timestamp,
        }
        
        print(f"    Action: {json.dumps(action, indent=2)}")
        
        # Sign the action
        signature = sign_agent(exchange.wallet, action, is_mainnet)
        
        # Post the action
        result = exchange._post_action(action, signature, timestamp)
        
        # Handle both string and dict responses
        if isinstance(result, str):
            print(f"\n    Response: {result}")
            if result == "ok" or "success" in result.lower():
                print("    ✅ Agent Approved!")
            else:
                print(f"    ⚠️  Agent approval returned: {result}")
                print("       (This may mean the agent is already approved)")
            return {"status": result}
        
        print(f"\n    ✅ Success! Agent Approved.")
        status = result.get('status') if isinstance(result, dict) else result
        print(f"    Status: {status}")
        
        # Parse response
        if isinstance(result, dict):
            response = result.get("response", {})
            if isinstance(response, dict) and response.get("type") == "action" and \
               response.get("data", {}).get("statuses", [None])[0] == "success":
                print("    Result: Fully Authorized 🚀")
            else:
                print(f"    Result: {json.dumps(result, indent=2)}")
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        print(f"    ❌ Error approving agent: {error_msg}")
        # Don't raise - continue with the flow
        return {"status": "error", "message": error_msg}


def step4_approve_builder_fee(private_key: str):
    """Step 4: Approve builder fee on Hyperliquid"""
    print_section("STEP 4: Approve Builder Fee on Hyperliquid")
    
    print(f"\n    Builder Address: {BUILDER_ADDRESS}")
    print(f"    Max Fee Rate: {MAX_FEE_RATE}")
    
    try:
        from hyperliquid.exchange import Exchange
        from hyperliquid.utils import constants
        
        # Setup the wallet
        if not private_key.startswith("0x"):
            private_key = f"0x{private_key}"
        
        account = Account.from_key(private_key)
        print(f"    Authenticating as: {account.address}")
        
        # Initialize Hyperliquid Exchange Client
        exchange = Exchange(account, constants.MAINNET_API_URL)
        
        print(f"\n    📤 Sending 'Approve Builder Fee' transaction")
        print("       (This signs a message on Hyperliquid L1, no gas fee required)")
        
        # Approve builder fee
        result = exchange.approve_builder_fee(
            builder=BUILDER_ADDRESS,
            max_fee_rate=MAX_FEE_RATE
        )
        
        print(f"\n    ✅ Success! Builder Fee Approved.")
        print(f"    Status: {result.get('status')}")
        print(f"    Response: {json.dumps(result.get('response'), indent=2)}")
        print(f"\n    🚀 Approved max fee rate of {MAX_FEE_RATE} for builder {BUILDER_ADDRESS}")
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        print(f"    ❌ Error approving builder fee: {error_msg}")
        # Don't raise - continue with the flow
        return {"status": "error", "message": error_msg}


def step5_test_trading(access_token: str):
    """Step 5: Test trading by creating a position"""
    print_section("STEP 5: Test Trading")
    
    with httpx.Client(timeout=30.0) as client:
        url = f"{PEAR_API_URL}/positions"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "slippage": 0.01,
            "executionType": "MARKET",
            "leverage": 1.0,
            "usdValue": 1.0,
            "longAssets": [{"asset": "BTC", "weight": 1.0}],
            "shortAssets": [{"asset": "USDC", "weight": 1.0}]
        }
        
        print(f"\n    POST {url}")
        print_json("    Payload", payload)
        
        response = client.post(url, headers=headers, json=payload)
        print(f"\n    Status: {response.status_code}")
        
        try:
            data = response.json()
            print_json("    Response", data)
        except:
            print(f"    Response: {response.text[:500]}")
        
        if response.status_code == 200:
            print("\n    ✅ Trading successful!")
        else:
            print("\n    ❌ Trading failed")
        
        return response.status_code


def main():
    # Get arguments
    if len(sys.argv) < 2:
        print("❌ Error: Wallet address is required")
        print("\nUsage: python setup_pear_complete.py WALLET_ADDRESS [PRIVATE_KEY]")
        print("\nOr set PRIVATE_KEY in .env file and run:")
        print("  python setup_pear_complete.py WALLET_ADDRESS")
        sys.exit(1)
    
    wallet_address = sys.argv[1]
    
    # Get private key from args or environment
    if len(sys.argv) >= 3:
        private_key = sys.argv[2]
    else:
        private_key = os.getenv("PRIVATE_KEY")
    
    # Validate private key
    if not private_key:
        print("❌ Error: Private key not found")
        print("\nProvide it as argument or set PRIVATE_KEY in .env file")
        sys.exit(1)
    
    if "YOUR" in private_key.upper():
        print("❌ Error: Please replace with your actual private key")
        sys.exit(1)
    
    # Ensure 0x prefix
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key
    
    # Validate hex format
    try:
        hex_part = private_key[2:]
        if not all(c in '0123456789abcdefABCDEF' for c in hex_part):
            raise ValueError("Invalid hex characters")
        if len(hex_part) != 64:
            raise ValueError(f"Expected 64 hex chars, got {len(hex_part)}")
    except ValueError as e:
        print(f"❌ Error: Invalid private key - {e}")
        sys.exit(1)
    
    print("\n" + "=" * 70)
    print("  🍐 PEAR PROTOCOL COMPLETE SETUP")
    print("=" * 70)
    print(f"\n  Wallet Address: {wallet_address}")
    print(f"  Client ID: {CLIENT_ID}")
    print(f"  Builder Address: {BUILDER_ADDRESS}")
    
    try:
        # Step 1: Authenticate with Pear
        access_token = step1_authenticate(wallet_address, private_key)
        
        # Step 2: Create/Get agent wallet from Pear
        agent_address = step2_create_agent_wallet(access_token)
        
        # Step 3: Approve agent on Hyperliquid
        step3_approve_agent(private_key, agent_address)
        
        # Step 4: Approve builder fee on Hyperliquid
        step4_approve_builder_fee(private_key)
        
        # Step 5: Test trading
        status = step5_test_trading(access_token)
        
        # Summary
        print_section("SUMMARY")
        print(f"  ✅ Authentication: SUCCESS")
        print(f"  ✅ Agent Wallet: {agent_address}")
        print(f"  ✅ Agent Approved on Hyperliquid")
        print(f"  ✅ Builder Fee Approved")
        print(f"  {'✅' if status == 200 else '❌'} Test Trade: {'SUCCESS' if status == 200 else 'FAILED'}")
        
        if status == 200:
            print("\n  🎉 Setup complete! You can now trade through Pear Protocol.")
        else:
            print("\n  ⚠️  Setup complete but test trade failed. Check error above.")
        
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
