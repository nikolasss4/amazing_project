#!/usr/bin/env python3
"""
Test script for Pear Protocol API authentication.

This script tests the complete authentication and agent wallet flow:
1. Get EIP-712 message from Pear API
2. Sign the message with the configured wallet
3. Login to get access token
4. Check agent wallet status
5. Create agent wallet if needed

Usage:
    # Set environment variables first
    export WALLET_PRIVATE_KEY="your_private_key"
    export PEAR_CLIENT_ID="HLHackathon9"
    
    # Run the script
    python scripts/test_pear_api.py
    
    # Or with specific actions
    python scripts/test_pear_api.py --authenticate
    python scripts/test_pear_api.py --check-wallet
    python scripts/test_pear_api.py --create-wallet
    python scripts/test_pear_api.py --full-flow
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load .env file if it exists
from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings
from app.trade.services.pear_auth_service import PearAuthService
from app.trade.services.pear_service import PearService


def print_header(title: str):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_json(data: dict):
    """Print formatted JSON."""
    print(json.dumps(data, indent=2, default=str))


async def test_get_eip712_message(auth_service: PearAuthService):
    """Test getting EIP-712 message."""
    print_header("Step 1: Get EIP-712 Message")
    
    print(f"API URL: {auth_service.api_url}")
    print(f"Client ID: {auth_service.client_id}")
    print(f"Wallet Address: {auth_service.wallet_address}")
    
    try:
        eip712_data = await auth_service.get_eip712_message()
        print("\n✅ EIP-712 message received successfully!")
        print("\nDomain:")
        print_json(eip712_data.get("domain", {}))
        print("\nMessage:")
        print_json(eip712_data.get("message", {}))
        return eip712_data
    except Exception as e:
        print(f"\n❌ Failed to get EIP-712 message: {e}")
        return None


async def test_sign_message(auth_service: PearAuthService, eip712_data: dict):
    """Test signing EIP-712 message."""
    print_header("Step 2: Sign EIP-712 Message")
    
    try:
        signature, timestamp = auth_service.sign_eip712_message(eip712_data)
        print("\n✅ Message signed successfully!")
        print(f"\nSignature: {signature[:40]}...{signature[-10:]}")
        print(f"Timestamp: {timestamp}")
        return signature, timestamp
    except Exception as e:
        print(f"\n❌ Failed to sign message: {e}")
        return None, None


async def test_login(auth_service: PearAuthService, signature: str, timestamp: str):
    """Test login with signature."""
    print_header("Step 3: Login")
    
    try:
        access_token = await auth_service.login(signature=signature, timestamp=timestamp)
        print("\n✅ Login successful!")
        print(f"\nAccess Token: {access_token[:40]}...{access_token[-10:]}")
        print(f"Token Length: {len(access_token)} characters")
        return access_token
    except Exception as e:
        print(f"\n❌ Login failed: {e}")
        return None


async def test_full_authentication(auth_service: PearAuthService):
    """Test full authentication flow."""
    print_header("Full Authentication Flow")
    
    try:
        access_token = await auth_service.authenticate()
        print("\n✅ Full authentication successful!")
        print(f"\nAccess Token: {access_token[:40]}...{access_token[-10:]}")
        return access_token
    except Exception as e:
        print(f"\n❌ Full authentication failed: {e}")
        return None


async def test_check_agent_wallet(pear_service: PearService):
    """Test checking agent wallet status."""
    print_header("Check Agent Wallet Status")
    
    try:
        wallet_info = await pear_service.get_agent_wallet()
        print("\n✅ Agent wallet status retrieved!")
        print(f"\nStatus: {wallet_info.status.value}")
        print(f"Address: {wallet_info.wallet_address or 'N/A'}")
        if wallet_info.createdAt:
            print(f"Created At: {wallet_info.createdAt}")
        if wallet_info.expiresAt:
            print(f"Expires At: {wallet_info.expiresAt}")
        if wallet_info.message:
            print(f"Message: {wallet_info.message}")
        return wallet_info
    except Exception as e:
        print(f"\n❌ Failed to check agent wallet: {e}")
        return None


async def test_create_agent_wallet(pear_service: PearService):
    """Test creating agent wallet."""
    print_header("Create Agent Wallet")
    
    try:
        wallet_info = await pear_service.create_agent_wallet()
        print("\n✅ Agent wallet created!")
        print(f"\nAddress: {wallet_info.wallet_address}")
        print(f"Status: {wallet_info.status}")
        if wallet_info.createdAt:
            print(f"Created At: {wallet_info.createdAt}")
        if wallet_info.expiresAt:
            print(f"Expires At: {wallet_info.expiresAt}")
        if wallet_info.message:
            print(f"Message: {wallet_info.message}")
        return wallet_info
    except Exception as e:
        print(f"\n❌ Failed to create agent wallet: {e}")
        return None


async def test_full_flow():
    """Test the complete flow: authenticate -> check wallet -> create if needed."""
    print_header("COMPLETE AGENT WALLET SETUP FLOW")
    
    # Check configuration
    print("\n📋 Configuration:")
    print(f"   API URL: {settings.PEAR_API_URL}")
    print(f"   Client ID: {settings.PEAR_CLIENT_ID}")
    print(f"   Private Key: {'Configured' if settings.WALLET_PRIVATE_KEY else 'NOT SET'}")
    
    if not settings.WALLET_PRIVATE_KEY:
        print("\n❌ ERROR: WALLET_PRIVATE_KEY not configured!")
        print("   Set it in .env file or environment variable")
        return
    
    auth_service = PearAuthService()
    pear_service = PearService(auth_service)
    
    print(f"   Wallet Address: {auth_service.wallet_address}")
    
    # Step 1: Authenticate
    print_header("Phase 1: Authentication")
    access_token = await test_full_authentication(auth_service)
    if not access_token:
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Step 2: Check agent wallet status
    print_header("Phase 2: Check Agent Wallet Status")
    wallet_info = await test_check_agent_wallet(pear_service)
    
    if not wallet_info:
        print("\n⚠️  Could not determine agent wallet status")
        return
    
    # Step 3: Handle based on status
    print_header("Phase 3: Next Steps")
    
    from app.trade.schemas import AgentWalletStatus
    
    if wallet_info.status == AgentWalletStatus.ACTIVE:
        print("\n✅ Agent wallet is ACTIVE and ready for trading!")
        print(f"   Address: {wallet_info.wallet_address}")
        
    elif wallet_info.status == AgentWalletStatus.PENDING_APPROVAL:
        print("\n⚠️  Agent wallet exists but needs APPROVAL on Hyperliquid")
        print(f"   Agent Wallet Address: {wallet_info.wallet_address}")
        print("\n📋 Manual Steps Required:")
        print("   1. Go to Hyperliquid Exchange (https://app.hyperliquid.xyz)")
        print(f"   2. Connect your wallet ({auth_service.wallet_address})")
        print(f"   3. Approve the agent wallet: {wallet_info.wallet_address}")
        print("   4. Once approved, you can use it for trading via Pear Protocol API")
        print("\n💡 Or use the Hyperliquid SDK:")
        print('   client.approveAgent({')
        print(f'       agentAddress: "{wallet_info.wallet_address}",')
        print('       agentName: "PearProtocol"')
        print('   })')
        
    elif wallet_info.status in [AgentWalletStatus.NOT_FOUND, AgentWalletStatus.EXPIRED]:
        print(f"\n📋 Status: {wallet_info.status.value}")
        print("   Need to create a new agent wallet...")
        
        # Create new wallet
        new_wallet = await test_create_agent_wallet(pear_service)
        
        if new_wallet:
            print("\n✅ Agent wallet created successfully!")
            print(f"   Address: {new_wallet.wallet_address}")
            print("\n⚠️  IMPORTANT: Wallet needs approval on Hyperliquid!")
            print("   Follow the approval steps above.")
    
    # Summary
    print_header("SUMMARY")
    print(f"✅ Authentication: Success")
    print(f"📊 Agent Wallet Status: {wallet_info.status.value}")
    if wallet_info.wallet_address:
        print(f"🏦 Agent Wallet Address: {wallet_info.wallet_address}")
    
    await pear_service.close()


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Test Pear Protocol API")
    parser.add_argument("--authenticate", action="store_true", help="Test authentication only")
    parser.add_argument("--check-wallet", action="store_true", help="Check agent wallet status")
    parser.add_argument("--create-wallet", action="store_true", help="Create agent wallet")
    parser.add_argument("--full-flow", action="store_true", help="Run complete flow (default)")
    parser.add_argument("--step-by-step", action="store_true", help="Run step-by-step auth flow")
    
    args = parser.parse_args()
    
    # Default to full flow if no specific action
    if not any([args.authenticate, args.check_wallet, args.create_wallet, args.step_by_step]):
        args.full_flow = True
    
    print("🚀 Pear Protocol API Test Script")
    print(f"   Python: {sys.version}")
    
    if args.full_flow:
        await test_full_flow()
        return
    
    auth_service = PearAuthService()
    pear_service = PearService(auth_service)
    
    if args.step_by_step:
        # Step-by-step authentication
        eip712_data = await test_get_eip712_message(auth_service)
        if eip712_data:
            signature, timestamp = await test_sign_message(auth_service, eip712_data)
            if signature:
                await test_login(auth_service, signature, timestamp)
    
    elif args.authenticate:
        await test_full_authentication(auth_service)
    
    if args.check_wallet:
        # Ensure authenticated first
        if not auth_service.access_token:
            await auth_service.authenticate()
        await test_check_agent_wallet(pear_service)
    
    if args.create_wallet:
        # Ensure authenticated first
        if not auth_service.access_token:
            await auth_service.authenticate()
        await test_create_agent_wallet(pear_service)
    
    await pear_service.close()


if __name__ == "__main__":
    asyncio.run(main())
