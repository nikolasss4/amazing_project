#!/usr/bin/env python3
"""
Quick script to check if environment variables are loaded correctly.
Run this from the backend directory.
"""

import os
from pathlib import Path

print("=" * 80)
print("ENVIRONMENT VARIABLE CHECK")
print("=" * 80)

# Check current directory
print(f"\nCurrent Directory: {os.getcwd()}")

# Check if .env file exists
env_file = Path(".env")
if env_file.exists():
    print(f"✓ .env file found at: {env_file.absolute()}")
    print(f"  File size: {env_file.stat().st_size} bytes")
else:
    print(f"✗ .env file NOT found at: {env_file.absolute()}")

# Try to load settings
print("\n" + "=" * 80)
print("LOADING SETTINGS")
print("=" * 80)

try:
    from app.core.config import settings
    
    print(f"\nSettings loaded successfully!")
    print(f"APP_NAME: {settings.APP_NAME}")
    print(f"APP_ENV: {settings.APP_ENV}")
    print(f"PEAR_API_URL: {settings.PEAR_API_URL}")
    print(f"PEAR_CLIENT_ID: {settings.PEAR_CLIENT_ID}")
    print(f"WALLET_PRIVATE_KEY: {'SET (' + str(len(settings.WALLET_PRIVATE_KEY)) + ' chars)' if settings.WALLET_PRIVATE_KEY else 'NOT SET'}")
    
    if settings.WALLET_PRIVATE_KEY:
        print(f"  Prefix: {settings.WALLET_PRIVATE_KEY[:10]}...")
    else:
        print("\n❌ ERROR: WALLET_PRIVATE_KEY is not set!")
        print("   Please add WALLET_PRIVATE_KEY=0x... to your .env file")
        
except Exception as e:
    print(f"\n❌ ERROR loading settings: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)

# Also check direct environment variable
print("\nDirect Environment Variable Check:")
print(f"WALLET_PRIVATE_KEY (from os.environ): {'SET' if os.environ.get('WALLET_PRIVATE_KEY') else 'NOT SET'}")

print("=" * 80)
