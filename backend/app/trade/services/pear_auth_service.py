"""Pear Protocol Authentication Service.

This module handles EIP-712 signing and authentication with Pear Protocol API.
Based on the TypeScript reference implementation.
"""

from typing import Any

import httpx
from eth_account import Account
from eth_account.messages import encode_typed_data

from app.core.config import settings
from app.core.exceptions import ExternalServiceError
from app.core.logging import get_logger

logger = get_logger(__name__)


class PearAuthService:
    """
    Handles authentication with Pear Protocol using EIP-712 signatures.
    
    Authentication Flow:
    1. Get EIP-712 message from /auth/eip712-message
    2. Sign the message with the wallet private key
    3. Login via /auth/login with the signature
    4. Receive access token for subsequent API calls
    """
    
    def __init__(self):
        self.api_url = settings.PEAR_API_URL
        self.client_id = settings.PEAR_CLIENT_ID
        self.private_key = settings.WALLET_PRIVATE_KEY
        self._access_token: str | None = None
        self._wallet_address: str | None = None
        
        # Debug logging
        logger.info("=" * 80)
        logger.info("PEAR AUTH SERVICE INITIALIZED")
        logger.info("=" * 80)
        logger.info(f"API URL: {self.api_url}")
        logger.info(f"Client ID: {self.client_id}")
        logger.info(f"Private Key Configured: {'Yes' if self.private_key else 'No'}")
        if self.private_key:
            logger.info(f"Private Key (first 10 chars): {self.private_key[:10]}...")
        logger.info("=" * 80)
        
    @property
    def wallet_address(self) -> str | None:
        """Get wallet address from private key."""
        if self._wallet_address is None and self.private_key:
            try:
                # Ensure private key has 0x prefix
                pk = self.private_key if self.private_key.startswith('0x') else f'0x{self.private_key}'
                account = Account.from_key(pk)
                self._wallet_address = account.address
            except Exception as e:
                logger.error("Failed to derive wallet address", error=str(e))
                return None
        return self._wallet_address
    
    @property
    def access_token(self) -> str | None:
        """Get current access token."""
        return self._access_token
    
    def set_access_token(self, token: str) -> None:
        """Set the access token manually."""
        self._access_token = token
        
    async def get_eip712_message(
        self, 
        address: str | None = None, 
        client_id: str | None = None
    ) -> dict[str, Any]:
        """
        Get EIP-712 message structure from Pear API.
        
        Args:
            address: Wallet address (defaults to configured wallet)
            client_id: Client ID (defaults to configured client ID)
            
        Returns:
            EIP-712 typed data structure containing domain, types, and message
        """
        addr = address or self.wallet_address
        cid = client_id or self.client_id
        
        if not addr:
            raise ExternalServiceError("Pear Protocol", "No wallet address available")
            
        logger.info("Getting EIP-712 message", address=addr, client_id=cid)
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(
                    f"{self.api_url}/auth/eip712-message",
                    params={"address": addr, "clientId": cid}
                )
                response.raise_for_status()
                data = response.json()
                
                logger.info("=" * 80)
                logger.info("RAW EIP-712 RESPONSE FROM PEAR API")
                logger.info("=" * 80)
                import json
                logger.info(json.dumps(data, indent=2))
                logger.info("=" * 80)
                
                return data
            except httpx.HTTPStatusError as e:
                logger.error(
                    "Failed to get EIP-712 message",
                    status_code=e.response.status_code,
                    detail=e.response.text
                )
                raise ExternalServiceError("Pear Protocol", f"Failed to get EIP-712 message: {e.response.text}")
            except Exception as e:
                logger.error("Failed to get EIP-712 message", error=str(e))
                raise ExternalServiceError("Pear Protocol", str(e))
    
    def sign_eip712_message(self, eip712_data: dict[str, Any]) -> tuple[str, str]:
        """
        Sign an EIP-712 typed data message.
        
        Args:
            eip712_data: The EIP-712 data containing domain, types, and message
            
        Returns:
            Tuple of (signature, timestamp from message)
        """
        if not self.private_key:
            raise ExternalServiceError("Pear Protocol", "No private key configured")
            
        # Extract components
        domain = eip712_data["domain"]
        types = eip712_data["types"].copy()
        message = eip712_data["message"]
        
        # Remove EIP712Domain from types if present (required for eth_account)
        if "EIP712Domain" in types:
            del types["EIP712Domain"]
            
        logger.info("Signing EIP-712 message")
        logger.debug("Domain", domain=domain)
        logger.debug("Message", message=message)
        
        try:
            # Ensure private key has 0x prefix
            pk = self.private_key if self.private_key.startswith('0x') else f'0x{self.private_key}'
            
            # Create the structured message for signing
            # Using encode_typed_data from eth_account
            signable_message = encode_typed_data(
                domain_data=domain,
                message_types=types,
                message_data=message
            )
            
            # Sign the message
            signed = Account.sign_message(signable_message, pk)
            signature = signed.signature.hex()
            
            # Ensure signature has 0x prefix
            if not signature.startswith('0x'):
                signature = f'0x{signature}'
                
            timestamp = message.get("timestamp", "")
            
            logger.info("Message signed successfully")
            logger.debug("Signature", signature=signature[:20] + "...")
            
            return signature, timestamp
            
        except Exception as e:
            logger.error("Failed to sign EIP-712 message", error=str(e))
            raise ExternalServiceError("Pear Protocol", f"Failed to sign message: {str(e)}")
    
    def sign_eip712_message_with_key(self, eip712_data: dict[str, Any], private_key: str) -> tuple[str, str]:
        """
        Sign an EIP-712 typed data message with a custom private key.
        
        Args:
            eip712_data: The EIP-712 data containing domain, types, and message
            private_key: The private key to use for signing (64 hex chars, with or without 0x prefix)
            
        Returns:
            Tuple of (signature, timestamp from message)
        """
        if not private_key:
            raise ExternalServiceError("Pear Protocol", "No private key provided")
            
        # Extract components
        domain = eip712_data["domain"]
        types = eip712_data["types"].copy()
        message = eip712_data["message"]
        
        # Remove EIP712Domain from types if present (required for eth_account)
        if "EIP712Domain" in types:
            del types["EIP712Domain"]
            
        logger.info("Signing EIP-712 message with provided private key")
        logger.debug("Domain", domain=domain)
        logger.debug("Message", message=message)
        
        try:
            # Ensure private key has 0x prefix
            pk = private_key if private_key.startswith('0x') else f'0x{private_key}'
            
            # Create the structured message for signing
            signable_message = encode_typed_data(
                domain_data=domain,
                message_types=types,
                message_data=message
            )
            
            # Sign the message
            signed = Account.sign_message(signable_message, pk)
            signature = signed.signature.hex()
            
            # Ensure signature has 0x prefix
            if not signature.startswith('0x'):
                signature = f'0x{signature}'
                
            timestamp = message.get("timestamp", "")
            
            logger.info("Message signed successfully with custom key")
            logger.debug("Signature", signature=signature[:20] + "...")
            
            return signature, timestamp
            
        except Exception as e:
            logger.error("Failed to sign EIP-712 message with custom key", error=str(e))
            raise ExternalServiceError("Pear Protocol", f"Failed to sign message: {str(e)}")
    
    async def login(
        self, 
        address: str | None = None,
        client_id: str | None = None,
        signature: str | None = None,
        timestamp: str | None = None
    ) -> str:
        """
        Login to Pear Protocol with EIP-712 signature.
        
        If signature and timestamp are not provided, will fetch EIP-712 message
        and sign it automatically.
        
        Args:
            address: Wallet address (defaults to configured wallet)
            client_id: Client ID (defaults to configured client ID)
            signature: Pre-computed signature (optional)
            timestamp: Timestamp from EIP-712 message (optional)
            
        Returns:
            Access token for API authentication
        """
        addr = address or self.wallet_address
        cid = client_id or self.client_id
        
        if not addr:
            raise ExternalServiceError("Pear Protocol", "No wallet address available")
        
        # If signature not provided, get EIP-712 message and sign it
        if signature is None or timestamp is None:
            eip712_data = await self.get_eip712_message(addr, cid)
            signature, timestamp = self.sign_eip712_message(eip712_data)
        
        logger.info("=" * 80)
        logger.info("CALLING PEAR /AUTH/LOGIN ENDPOINT")
        logger.info("=" * 80)
        logger.info(f"URL: {self.api_url}/auth/login")
        logger.info(f"Address: {addr}")
        logger.info(f"Client ID: {cid}")
        
        login_payload = {
            "method": "eip712",
            "address": addr,
            "clientId": cid,
            "details": {
                "signature": signature,
                "timestamp": timestamp
            }
        }
        
        logger.info("Login payload:")
        import json
        logger.info(json.dumps(login_payload, indent=2))
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.api_url}/auth/login",
                    json=login_payload
                )
                
                logger.info(f"Response status: {response.status_code}")
                
                response.raise_for_status()
                data = response.json()
                
                logger.info("=" * 80)
                logger.info("LOGIN RESPONSE FROM PEAR")
                logger.info("=" * 80)
                logger.info(json.dumps(data, indent=2))
                logger.info("=" * 80)
                
                access_token = data.get("accessToken")
                if not access_token:
                    raise ExternalServiceError("Pear Protocol", "No access token in response")
                
                # Store the token
                self._access_token = access_token
                
                logger.info(f"✓ Login successful - Access token received")
                
                return access_token
                
            except httpx.HTTPStatusError as e:
                logger.error(
                    "Login failed",
                    status_code=e.response.status_code,
                    detail=e.response.text
                )
                raise ExternalServiceError("Pear Protocol", f"Login failed: {e.response.text}")
            except Exception as e:
                if isinstance(e, ExternalServiceError):
                    raise
                logger.error("Login failed", error=str(e))
                raise ExternalServiceError("Pear Protocol", str(e))
    
    async def authenticate(self) -> str:
        """
        Full authentication flow: get message, sign, and login.
        
        This is a convenience method that performs the complete authentication
        process using the configured wallet.
        
        Returns:
            Access token for API authentication
        """
        if not self.private_key:
            raise ExternalServiceError("Pear Protocol", "WALLET_PRIVATE_KEY not configured")
            
        logger.info("Starting full authentication flow", address=self.wallet_address)
        
        # Get EIP-712 message
        eip712_data = await self.get_eip712_message()
        
        # Sign the message
        signature, timestamp = self.sign_eip712_message(eip712_data)
        
        # Login
        access_token = await self.login(signature=signature, timestamp=timestamp)
        
        return access_token
    
    async def ensure_authenticated(self) -> str:
        """
        Ensure we have a valid access token, authenticating if necessary.
        
        Returns:
            Access token
        """
        if self._access_token is None:
            await self.authenticate()
        return self._access_token
    
    def get_auth_headers(self) -> dict[str, str]:
        """
        Get authorization headers for API requests.
        
        Returns:
            Dict with Authorization header if token available
        """
        headers = {"Content-Type": "application/json"}
        if self._access_token:
            headers["Authorization"] = f"Bearer {self._access_token}"
        return headers


# Singleton instance
_auth_service: PearAuthService | None = None


def get_pear_auth_service() -> PearAuthService:
    """Get singleton PearAuthService instance."""
    global _auth_service
    if _auth_service is None:
        _auth_service = PearAuthService()
    return _auth_service
