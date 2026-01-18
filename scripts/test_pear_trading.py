#!/usr/bin/env python3
"""
Test script for Pear Protocol Trading

This script tests the complete flow:
1. Authenticate with Pear Protocol
2. Create a position
3. Print all debugging info

Usage:
python test_pear_trading.py
"""

import httpx
import json
import asyncio
from eth_account import Account
from eth_account.messages import encode_typed_data

# Configuration
PEAR_API_URL = "https://hl-v2.pearprotocol.io"
BACKEND_URL = "http://localhost:8000"
CLIENT_ID = "HLHackathon1"

# Wallet credentials (from Hyperliquid setup)
USER_ADDRESS = "0x95E380BCc6Ee8B183DE069E8D56A12687433C592"
USER_PRIVATE_KEY = None  # Will be set from input
AGENT_ADDRESS = "0x622eaC6D90b1529Ce4C640459e53eF9D469d9887"
AGENT_PRIVATE_KEY = "0x0a6181be1ac728a6ab371c5fdc270fe55c8973d55345112d1baf7088b74f608b"


def print_section(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_json(label: str, data):
    print(f"\n{label}:")
    print(json.dumps(data, indent=2, default=str))


async def step1_get_eip712_message(client: httpx.AsyncClient) -> dict:
    """Step 1: Get EIP-712 message from Pear API"""
    print_section("STEP 1: Get EIP-712 Message")
    
    url = f"{PEAR_API_URL}/auth/eip712-message"
    params = {"address": USER_ADDRESS, "clientId": CLIENT_ID}
    
    print(f"URL: {url}")
    print(f"Params: {params}")
    
    response = await client.get(url, params=params)
    print(f"Status: {response.status_code}")
    
    data = response.json()
    print_json("Response", data)
    
    return data


def step2_sign_message(eip712_data: dict, private_key: str) -> tuple[str, int]:
    """Step 2: Sign the EIP-712 message"""
    print_section("STEP 2: Sign EIP-712 Message")
    
    account = Account.from_key(private_key)
    print(f"Signing with address: {account.address}")
    
    # Get timestamp from message
    timestamp = eip712_data.get("timestamp") or eip712_data["message"]["timestamp"]
    print(f"Timestamp: {timestamp}")
    
    # Prepare typed data for signing
    typed_data = {
        "types": eip712_data["types"],
        "primaryType": eip712_data.get("primaryType", "Authentication"),
        "domain": eip712_data["domain"],
        "message": eip712_data["message"]
    }
    
    # Remove EIP712Domain if present (eth_account adds it automatically)
    if "EIP712Domain" in typed_data["types"]:
        del typed_data["types"]["EIP712Domain"]
    
    print_json("Typed Data for Signing", typed_data)
    
    # Sign the message
    encoded = encode_typed_data(full_message=typed_data)
    signed = account.sign_message(encoded)
    signature = signed.signature.hex()
    
    if not signature.startswith("0x"):
        signature = "0x" + signature
    
    print(f"Signature: {signature[:40]}...")
    
    return signature, timestamp


async def step3_login(client: httpx.AsyncClient, signature: str, timestamp: int) -> str:
    """Step 3: Login with signature to get access token"""
    print_section("STEP 3: Login to Pear Protocol")
    
    url = f"{PEAR_API_URL}/auth/login"
    payload = {
        "method": "eip712",
        "address": USER_ADDRESS,
        "clientId": CLIENT_ID,
        "details": {
            "signature": signature,
            "timestamp": timestamp
        }
    }
    
    print(f"URL: {url}")
    print_json("Payload", payload)
    
    response = await client.post(url, json=payload)
    print(f"Status: {response.status_code}")
    
    data = response.json()
    print_json("Response", data)
    
    if response.status_code != 200:
        raise Exception(f"Login failed: {data}")
    
    return data["accessToken"]


async def step4_create_position(client: httpx.AsyncClient, access_token: str) -> dict:
    """Step 4: Create a position on Pear Protocol"""
    print_section("STEP 4: Create Position")
    
    url = f"{PEAR_API_URL}/positions"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Simple BTC long position
    payload = {
        "slippage": 0.01,
        "executionType": "MARKET",
        "leverage": 1.0,
        "usdValue": 1.0,  # $1 position for testing
        "longAssets": [
            {"asset": "BTC", "weight": 1.0}
        ],
        "shortAssets": [
            {"asset": "USDC", "weight": 1.0}
        ]
    }
    
    print(f"URL: {url}")
    print(f"Headers: Authorization: Bearer {access_token[:30]}...")
    print_json("Payload", payload)
    
    response = await client.post(url, json=payload, headers=headers)
    print(f"Status: {response.status_code}")
    
    # Try to parse response
    try:
        data = response.json()
        print_json("Response", data)
    except:
        print(f"Raw Response: {response.text[:500]}")
        data = {"raw": response.text}
    
    return {"status": response.status_code, "data": data}


async def step5_get_positions(client: httpx.AsyncClient, access_token: str) -> dict:
    """Step 5: Get open positions"""
    print_section("STEP 5: Get Open Positions")
    
    url = f"{PEAR_API_URL}/positions"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    print(f"URL: {url}")
    
    response = await client.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    try:
        data = response.json()
        print_json("Response", data)
    except:
        print(f"Raw Response: {response.text[:500]}")
        data = {"raw": response.text}
    
    return {"status": response.status_code, "data": data}


async def main():
    global USER_PRIVATE_KEY
    import sys
    
    print("\n" + "=" * 70)
    print("  🍐 PEAR PROTOCOL TRADING TEST")
    print("=" * 70)
    
    # Get private key from command line or input
    if len(sys.argv) > 1:
        USER_PRIVATE_KEY = sys.argv[1]
    elif not USER_PRIVATE_KEY:
        USER_PRIVATE_KEY = input("\nEnter your wallet private key: ").strip()
    
    if not USER_PRIVATE_KEY.startswith("0x"):
        USER_PRIVATE_KEY = "0x" + USER_PRIVATE_KEY
    
    print(f"\nUser Address: {USER_ADDRESS}")
    print(f"Agent Address: {AGENT_ADDRESS}")
    print(f"Client ID: {CLIENT_ID}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Step 1: Get EIP-712 message
            eip712_data = await step1_get_eip712_message(client)
            
            # Step 2: Sign the message
            signature, timestamp = step2_sign_message(eip712_data, USER_PRIVATE_KEY)
            
            # Step 3: Login
            access_token = await step3_login(client, signature, timestamp)
            
            # Step 4: Create position
            position_result = await step4_create_position(client, access_token)
            
            # Step 5: Get positions
            positions = await step5_get_positions(client, access_token)
            
            # Summary
            print_section("SUMMARY")
            print(f"Authentication: ✅ SUCCESS")
            print(f"Create Position: {'✅ SUCCESS' if position_result['status'] == 200 else '❌ FAILED'} (Status: {position_result['status']})")
            print(f"Get Positions: {'✅ SUCCESS' if positions['status'] == 200 else '❌ FAILED'} (Status: {positions['status']})")
            
            if position_result['status'] != 200:
                print("\n⚠️  Position creation failed. Check the error above.")
                print("   Common issues:")
                print("   - Insufficient balance on Hyperliquid")
                print("   - Builder fee not approved")
                print("   - Agent wallet not approved")
            
        except Exception as e:
            print_section("ERROR")
            print(f"❌ Test failed: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
