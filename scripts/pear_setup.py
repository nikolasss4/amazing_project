#!/usr/bin/env python3
"""
Pear Protocol Setup - Follows documentation exactly

Usage:
    python pear_setup.py <WALLET_ADDRESS> <PRIVATE_KEY>
    
Or with .env file containing PRIVATE_KEY:
    python pear_setup.py <WALLET_ADDRESS>
"""

import sys
import os
import json
import requests
from dotenv import load_dotenv
from eth_account import Account
from eth_account.messages import encode_typed_data
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants

load_dotenv()

# Configuration from documentation
API_BASE_URL = "https://hl-v2.pearprotocol.io"
CLIENT_ID = "HLHackathon1"
BUILDER_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042"
MAX_FEE_RATE = "0.1%"


def step1_get_eip712_message(address: str) -> dict:
    """Step 1: Get EIP-712 message - exactly as documented"""
    url = f"{API_BASE_URL}/auth/eip712-message?address={address}&clientId={CLIENT_ID}"
    print(f"GET {url}")
    
    response = requests.get(url)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        raise Exception(f"Failed: {response.text}")
    
    return response.json()


def step2_sign_message(eip712_message: dict, private_key: str) -> str:
    """Step 2: Sign the message - exactly as documented"""
    account = Account.from_key(private_key)
    
    # Remove EIP712Domain from types - as documented
    types = {k: v for k, v in eip712_message["types"].items() if k != "EIP712Domain"}
    
    typed_data = {
        "types": types,
        "primaryType": eip712_message["primaryType"],
        "domain": eip712_message["domain"],
        "message": eip712_message["message"],
    }
    
    encoded = encode_typed_data(full_message=typed_data)
    signed = account.sign_message(encoded)
    signature = signed.signature.hex()
    
    if not signature.startswith("0x"):
        signature = "0x" + signature
    
    return signature


def step3_authenticate(address: str, signature: str, timestamp: int) -> dict:
    """Step 3: Authenticate with signature - exactly as documented"""
    url = f"{API_BASE_URL}/auth/login"
    
    payload = {
        "method": "eip712",
        "address": address,
        "clientId": CLIENT_ID,
        "details": {
            "signature": signature,
            "timestamp": timestamp,
        },
    }
    
    print(f"POST {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        raise Exception(f"Failed: {response.text}")
    
    return response.json()


def step4_get_agent_wallet(access_token: str) -> str:
    """Get agent wallet from Pear - as documented"""
    url = f"{API_BASE_URL}/agentWallet"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Try GET first
    print(f"GET {url}")
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        return data.get("agentWalletAddress")
    
    # If not found, POST to create
    print(f"POST {url}")
    response = requests.post(url, headers=headers, json={})
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code in [200, 201]:
        data = response.json()
        return data.get("agentWalletAddress") or data.get("address")
    
    # Try GET again
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        return data.get("agentWalletAddress")
    
    raise Exception(f"Failed to get agent wallet: {response.text}")


def check_agent_approved(wallet_address: str, agent_address: str) -> bool:
    """Check if agent is already approved on Hyperliquid"""
    print(f"\nDEBUG [check_agent_approved]: Checking Hyperliquid for approved agents...")
    print(f"DEBUG [check_agent_approved]: Wallet address: {wallet_address}")
    print(f"DEBUG [check_agent_approved]: Agent address to find: {agent_address}")
    
    url = "https://api.hyperliquid.xyz/info"
    payload = {"type": "extraAgents", "user": wallet_address}
    
    print(f"DEBUG [check_agent_approved]: POST {url}")
    print(f"DEBUG [check_agent_approved]: Payload: {payload}")
    
    response = requests.post(url, json=payload)
    print(f"DEBUG [check_agent_approved]: Response status: {response.status_code}")
    print(f"DEBUG [check_agent_approved]: Response text: {response.text[:500]}")
    
    if response.status_code == 200:
        agents = response.json()
        print(f"DEBUG [check_agent_approved]: Found {len(agents)} approved agents:")
        for i, agent in enumerate(agents):
            agent_addr = agent.get("address", "")
            agent_name = agent.get("name", "")
            print(f"DEBUG [check_agent_approved]:   [{i}] {agent_name}: {agent_addr}")
            if agent_addr.lower() == agent_address.lower():
                print(f"DEBUG [check_agent_approved]: ✅ MATCH FOUND!")
                return True
        print(f"DEBUG [check_agent_approved]: No match found for {agent_address}")
    return False


def step5_approve_agent(private_key: str, agent_address: str, wallet_address: str):
    """Approve a SPECIFIC agent address on Hyperliquid using low-level API"""
    print("\n" + "-" * 60)
    print("DEBUG: Starting agent approval process")
    print("-" * 60)
    
    # First check if already approved
    print(f"\nDEBUG: Checking if agent {agent_address} is already approved...")
    already_approved = check_agent_approved(wallet_address, agent_address)
    print(f"DEBUG: Already approved check result: {already_approved}")
    
    if already_approved:
        print("✅ Agent already approved - skipping")
        return {"status": "already_approved"}
    
    print("\nDEBUG: Agent not yet approved, proceeding with approval...")
    
    if not private_key.startswith("0x"):
        private_key = f"0x{private_key}"
    
    print(f"DEBUG: Private key length: {len(private_key)} chars")
    
    account = Account.from_key(private_key)
    print(f"DEBUG: Account created from private key")
    print(f"DEBUG: Account address: {account.address}")
    
    # Import signing utilities
    print("\nDEBUG: Importing signing utilities...")
    from hyperliquid.utils.signing import sign_agent, get_timestamp_ms
    print("DEBUG: Imports successful")
    
    print(f"\nDEBUG: Creating Exchange client...")
    print(f"DEBUG: Base URL: {constants.MAINNET_API_URL}")
    exchange = Exchange(account, constants.MAINNET_API_URL)
    print(f"DEBUG: Exchange client created")
    print(f"DEBUG: Exchange wallet address: {exchange.wallet.address}")
    print(f"DEBUG: Exchange base_url: {exchange.base_url}")
    
    print(f"\nDEBUG: Preparing approval action...")
    print(f"DEBUG: Agent address to approve: {agent_address}")
    
    # Get timestamp
    timestamp = get_timestamp_ms()
    print(f"DEBUG: Timestamp: {timestamp}")
    
    is_mainnet = exchange.base_url == constants.MAINNET_API_URL
    print(f"DEBUG: Is mainnet: {is_mainnet}")
    
    # Create action
    action = {
        "type": "approveAgent",
        "agentAddress": agent_address,
        "agentName": "Agent Pear",
        "nonce": timestamp,
    }
    
    print(f"\nDEBUG: Action payload:")
    print(json.dumps(action, indent=2))
    
    # Sign the action
    print(f"\nDEBUG: Signing action with sign_agent()...")
    try:
        signature = sign_agent(exchange.wallet, action, is_mainnet)
        print(f"DEBUG: Signature created successfully")
        print(f"DEBUG: Signature type: {type(signature)}")
        print(f"DEBUG: Signature: {signature}")
    except Exception as e:
        print(f"DEBUG: ERROR signing action: {e}")
        print(f"DEBUG: Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise
    
    # Post the action
    print(f"\nDEBUG: Posting action with _post_action()...")
    try:
        result = exchange._post_action(action, signature, timestamp)
        print(f"DEBUG: _post_action returned successfully")
        print(f"DEBUG: Result type: {type(result)}")
        print(f"DEBUG: Result value: {result}")
        if isinstance(result, dict):
            print(f"DEBUG: Result keys: {result.keys()}")
            for key, value in result.items():
                print(f"DEBUG:   {key}: {value}")
    except Exception as e:
        print(f"DEBUG: ERROR posting action: {e}")
        print(f"DEBUG: Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise
    
    print("\n" + "-" * 60)
    print("DEBUG: Agent approval process complete")
    print("-" * 60)
    
    # Check results
    if isinstance(result, dict):
        status = result.get("status")
        response = result.get("response")
        print(f"\nDEBUG: Status: {status}")
        print(f"DEBUG: Response: {response}")
        
        if response == "Extra agent already used.":
            print("✅ Agent was already approved (extra agent already used)")
            return {"status": "already_approved"}
        elif status == "ok":
            print("✅ Agent approved successfully!")
            return result
        else:
            print(f"⚠️ Unexpected result: {result}")
            return result
    
    if isinstance(result, str):
        print(f"\nDEBUG: Result is string: {result}")
        if "already" in result.lower():
            print("✅ Agent was already approved")
            return {"status": "already_approved"}
    
    return result


def check_builder_approved(wallet_address: str, builder_address: str) -> bool:
    """Check if builder fee is already approved on Hyperliquid"""
    print(f"\nDEBUG [check_builder_approved]: Checking Hyperliquid for approved builders...")
    print(f"DEBUG [check_builder_approved]: Wallet address: {wallet_address}")
    print(f"DEBUG [check_builder_approved]: Builder address to find: {builder_address}")
    
    url = "https://api.hyperliquid.xyz/info"
    payload = {"type": "maxBuilderFee", "user": wallet_address, "builder": builder_address}
    
    print(f"DEBUG [check_builder_approved]: POST {url}")
    print(f"DEBUG [check_builder_approved]: Payload: {payload}")
    
    response = requests.post(url, json=payload)
    print(f"DEBUG [check_builder_approved]: Response status: {response.status_code}")
    print(f"DEBUG [check_builder_approved]: Response text: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"DEBUG [check_builder_approved]: Response JSON: {data}")
        # If we get a fee rate back, builder is approved
        if data and data != "0":
            print(f"DEBUG [check_builder_approved]: ✅ Builder already approved with max fee: {data}")
            return True
    
    print(f"DEBUG [check_builder_approved]: Builder not yet approved")
    return False


def step6_approve_builder_fee(private_key: str, wallet_address: str):
    """Approve builder fee - exactly as user's script"""
    print("\n" + "-" * 60)
    print("DEBUG: Starting builder fee approval process")
    print("-" * 60)
    
    # First check if already approved
    print(f"\nDEBUG: Checking if builder {BUILDER_ADDRESS} is already approved...")
    already_approved = check_builder_approved(wallet_address, BUILDER_ADDRESS)
    print(f"DEBUG: Already approved check result: {already_approved}")
    
    if already_approved:
        print("✅ Builder fee already approved - skipping")
        return {"status": "already_approved"}
    
    print("\nDEBUG: Builder not yet approved, proceeding with approval...")
    
    if not private_key.startswith("0x"):
        private_key = f"0x{private_key}"
    
    print(f"DEBUG: Private key length: {len(private_key)} chars")
    
    account = Account.from_key(private_key)
    print(f"DEBUG: Account created from private key")
    print(f"DEBUG: Account address: {account.address}")
    
    print(f"\nDEBUG: Creating Exchange client...")
    print(f"DEBUG: Base URL: {constants.MAINNET_API_URL}")
    exchange = Exchange(account, constants.MAINNET_API_URL)
    print(f"DEBUG: Exchange client created")
    print(f"DEBUG: Exchange wallet address: {exchange.wallet.address}")
    print(f"DEBUG: Exchange base_url: {exchange.base_url}")
    
    print(f"\nDEBUG: Preparing builder fee approval...")
    print(f"DEBUG: Builder address: {BUILDER_ADDRESS}")
    print(f"DEBUG: Max fee rate: {MAX_FEE_RATE}")
    
    print(f"\nDEBUG: Calling exchange.approve_builder_fee()...")
    try:
        result = exchange.approve_builder_fee(
            builder=BUILDER_ADDRESS,
            max_fee_rate=MAX_FEE_RATE
        )
        print(f"DEBUG: approve_builder_fee returned successfully")
        print(f"DEBUG: Result type: {type(result)}")
        print(f"DEBUG: Result value: {result}")
        if isinstance(result, dict):
            print(f"DEBUG: Result keys: {result.keys()}")
            for key, value in result.items():
                print(f"DEBUG:   {key}: {value}")
    except Exception as e:
        print(f"DEBUG: ERROR calling approve_builder_fee: {e}")
        print(f"DEBUG: Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise
    
    print("\n" + "-" * 60)
    print("DEBUG: Builder fee approval process complete")
    print("-" * 60)
    
    # Check results
    if isinstance(result, dict):
        status = result.get("status")
        response = result.get("response")
        print(f"\nDEBUG: Status: {status}")
        print(f"DEBUG: Response: {response}")
        
        if status == "ok":
            print("✅ Builder fee approved successfully!")
        else:
            print(f"⚠️ Unexpected result: {result}")
    
    if isinstance(result, str):
        print(f"\nDEBUG: Result is string: {result}")
    
    return result


def step7_test_trade(access_token: str):
    """Test trading"""
    print("\n" + "-" * 60)
    print("DEBUG: Starting trade test")
    print("-" * 60)
    
    url = f"{API_BASE_URL}/positions"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "slippage": 0.01,
        "executionType": "MARKET",
        "leverage": 1.0,
        "usdValue": 11.0,
        "longAssets": [{"asset": "BTC", "weight": 1.0}],
    }
    
    print(f"\nDEBUG: URL: {url}")
    print(f"DEBUG: Headers: Authorization: Bearer {access_token[:50]}...")
    print(f"DEBUG: Payload:")
    print(json.dumps(payload, indent=2))
    
    print(f"\nDEBUG: Sending POST request...")
    response = requests.post(url, headers=headers, json=payload)
    
    print(f"\nDEBUG: Response received")
    print(f"DEBUG: Status code: {response.status_code}")
    print(f"DEBUG: Response headers: {dict(response.headers)}")
    print(f"DEBUG: Response text: {response.text}")
    
    if response.status_code == 200:
        print("\n✅ Trade successful!")
        try:
            data = response.json()
            print(f"DEBUG: Response JSON: {json.dumps(data, indent=2)}")
        except:
            pass
    else:
        print(f"\n❌ Trade failed with status {response.status_code}")
        try:
            error_data = response.json()
            print(f"DEBUG: Error response: {json.dumps(error_data, indent=2)}")
        except:
            print(f"DEBUG: Raw error response: {response.text}")
    
    print("-" * 60)
    return response.status_code == 200


def main():
    if len(sys.argv) < 2:
        print("Usage: python pear_setup.py <WALLET_ADDRESS> [PRIVATE_KEY]")
        sys.exit(1)
    
    wallet_address = sys.argv[1]
    private_key = sys.argv[2] if len(sys.argv) > 2 else os.getenv("PRIVATE_KEY")
    
    if not private_key:
        print("Error: Private key required")
        sys.exit(1)
    
    if not private_key.startswith("0x"):
        private_key = f"0x{private_key}"
    
    print("=" * 60)
    print("STEP 1: Get EIP-712 Message")
    print("=" * 60)
    eip712_message = step1_get_eip712_message(wallet_address)
    timestamp = eip712_message["timestamp"]
    print(f"Timestamp: {timestamp}")
    
    print("\n" + "=" * 60)
    print("STEP 2: Sign Message")
    print("=" * 60)
    signature = step2_sign_message(eip712_message, private_key)
    print(f"Signature: {signature[:50]}...")
    
    print("\n" + "=" * 60)
    print("STEP 3: Authenticate")
    print("=" * 60)
    tokens = step3_authenticate(wallet_address, signature, timestamp)
    access_token = tokens["accessToken"]
    print(f"Access Token: {access_token[:50]}...")
    
    print("\n" + "=" * 60)
    print("STEP 4: Get Agent Wallet")
    print("=" * 60)
    agent_address = step4_get_agent_wallet(access_token)
    print(f"Agent Address: {agent_address}")
    
    print("\n" + "=" * 60)
    print("STEP 5: Approve Agent on Hyperliquid")
    print("=" * 60)
    try:
        step5_approve_agent(private_key, agent_address, wallet_address)
    except Exception as e:
        print(f"Error (may be already approved): {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("STEP 6: Approve Builder Fee on Hyperliquid")
    print("=" * 60)
    try:
        step6_approve_builder_fee(private_key, wallet_address)
    except Exception as e:
        print(f"Error (may be already approved): {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("STEP 7: Test Trade")
    print("=" * 60)
    success = step7_test_trade(access_token)
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Trade successful: {success}")


if __name__ == "__main__":
    main()
