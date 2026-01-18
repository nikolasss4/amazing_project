"""Pear Protocol trading API endpoints.

Authentication Flow (based on TypeScript reference):
1. GET /auth/eip712-message - Get EIP-712 message to sign
2. POST /auth/login - Login with signature to get access token
3. Use access token for authenticated endpoints

Agent Wallet Flow:
1. GET /agent-wallet - Check wallet status
2. POST /agent-wallet - Create wallet if needed
3. POST /agent-wallet/approve - Approve on Hyperliquid (client-side)
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.logging import get_logger
from app.core.security import AuthenticatedUser
from app.trade.schemas import (
    AgentWalletStatus,
    PearAgentWalletResponse,
    PearApproveAgentWalletRequest,
    PearAuthTokenResponse,
    PearBucketStatusResponse,
    PearBucketStrategyRequest,
    PearBucketStrategyResponse,
    PearCreateAgentWalletResponse,
    PearEIP712MessageResponse,
    PearLoginRequest,
    PearPairPositionResponse,
    PearPairTradeRequest,
    PearPairTradeResponse,
    PearPositionRequest,
    PearRefreshTokenRequest,
)
from app.trade.services.pear_service import PearService, get_pear_service
from app.trade.services.pear_auth_service import get_pear_auth_service

logger = get_logger(__name__)
router = APIRouter()

# Dependency for Pear service
PearServiceDep = Annotated[PearService, Depends(get_pear_service)]


# ============================================================================
# Authentication Endpoints
# ============================================================================


@router.get("/auth/eip712-message", response_model=PearEIP712MessageResponse)
async def get_eip712_message(
    address: str = Query(..., description="Wallet address"),
    client_id: str = Query(default=None, alias="clientId", description="Client ID"),
    service: PearServiceDep = None,
) -> PearEIP712MessageResponse:
    """
    Get EIP-712 message structure for wallet signature.

    This message should be signed by the user's wallet using signTypedData
    and then sent to the login endpoint.

    Args:
        address: The user's wallet address
        client_id: Client identifier (defaults to configured PEAR_CLIENT_ID)

    Returns:
        EIP-712 typed data structure containing domain, types, and message
    """
    logger.info("=" * 80)
    logger.info("EIP-712 MESSAGE REQUEST RECEIVED")
    logger.info("=" * 80)
    logger.info(f"Address: {address}")
    logger.info(f"Client ID: {client_id}")
    
    try:
        result = await service.get_eip712_message(address, client_id)
        
        logger.info("=" * 80)
        logger.info("EIP-712 MESSAGE RESPONSE")
        logger.info("=" * 80)
        logger.info(f"Domain: {result.domain}")
        logger.info(f"Types: {result.types}")
        logger.info(f"Message: {result.message}")
        logger.info("=" * 80)
        
        return result
    except Exception as e:
        logger.error("=" * 80)
        logger.error("FAILED TO GET EIP-712 MESSAGE")
        logger.error(f"Error: {str(e)}")
        logger.error("=" * 80)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/auth/login", response_model=PearAuthTokenResponse)
async def login_with_signature(
    request: PearLoginRequest,
    service: PearServiceDep,
) -> PearAuthTokenResponse:
    """
    Login with EIP-712 signature to obtain access token.

    The signature should be obtained by signing the EIP-712 message
    from the /auth/eip712-message endpoint using wallet.signTypedData().

    Request body:
    ```json
    {
        "method": "eip712",
        "address": "0x...",
        "clientId": "HLHackathon9",
        "details": {
            "signature": "0x...",
            "timestamp": "..."
        }
    }
    ```

    Returns:
        Access token for API authentication
    """
    logger.info("Login request", address=request.address, method=request.method)
    
    try:
        result = await service.login_with_signature(request)
        logger.info("Login successful", address=request.address)
        return result
    except Exception as e:
        logger.error("Login failed", address=request.address, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/auth/refresh", response_model=PearAuthTokenResponse)
async def refresh_access_token(
    request: PearRefreshTokenRequest,
    service: PearServiceDep,
) -> PearAuthTokenResponse:
    """
    Refresh access token using refresh token.

    Use this endpoint when the access token expires to get a new one.
    """
    try:
        return await service.refresh_access_token(request.refresh_token)
    except Exception as e:
        logger.error("Token refresh failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/auth/authenticate", response_model=PearAuthTokenResponse)
async def authenticate_server(
    service: PearServiceDep,
) -> PearAuthTokenResponse:
    """
    Server-side authentication using configured wallet.
    
    This endpoint performs the full authentication flow using the
    server's configured WALLET_PRIVATE_KEY. Useful for server-to-server
    communication or testing.

    Returns:
        Access token for API authentication
    """
    logger.info("Server authentication request")
    
    try:
        access_token = await service.authenticate()
        logger.info("Server authentication successful")
        return PearAuthTokenResponse(
            accessToken=access_token,
            refreshToken=None,
            tokenType="Bearer"
        )
    except Exception as e:
        logger.error("Server authentication failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


class WalletAuthRequest(BaseModel):
    """Request body for wallet authentication."""
    address: str
    privateKey: str | None = None


@router.post("/auth/authenticate-wallet")
async def authenticate_wallet(
    request: WalletAuthRequest = None,
    address: str = Query(default=None, description="Wallet address to authenticate (deprecated, use body)"),
    service: PearServiceDep = None,
) -> dict[str, Any]:
    """
    Authenticate a wallet address with Pear Protocol.
    
    This endpoint performs the complete authentication flow:
    1. Gets EIP-712 message from Pear API for the user's address
    2. Signs it using the provided private key
    3. Calls /auth/login with the signature
    4. Returns success/failure
    
    Args:
        request: Request body containing address and privateKey
        address: (deprecated) Query param for backward compatibility
        
    Returns:
        Success status and access token if successful
    """
    # Get address from request body or query param (backward compatibility)
    wallet_address = request.address if request else address
    private_key = request.privateKey if request else None
    
    if not wallet_address:
        return {
            "success": False,
            "authenticated": False,
            "error": "Wallet address is required",
            "message": "Please provide a wallet address"
        }
    
    logger.info("=" * 80)
    logger.info("WALLET AUTHENTICATION REQUEST")
    logger.info("=" * 80)
    logger.info(f"Address: {wallet_address}")
    logger.info(f"Private Key provided: {'Yes' if private_key else 'No'}")
    if private_key:
        logger.info(f"Private Key (masked): {private_key[:8]}...{private_key[-4:]}")
    logger.info(f"Client ID: HLHackathon1")
    
    try:
        # Step 1: Get EIP-712 message for this specific address
        logger.info("Step 1: Getting EIP-712 message for user's address...")
        eip712_result = await service.get_eip712_message(wallet_address, "HLHackathon1")
        logger.info(f"EIP-712 message received")
        logger.info(f"  Message address: {eip712_result.message.get('address')}")
        logger.info(f"  Message clientId: {eip712_result.message.get('clientId')}")
        logger.info(f"  Message timestamp: {eip712_result.message.get('timestamp')}")
        
        # Step 2: Sign the message using the provided private key or server's key
        logger.info("Step 2: Signing EIP-712 message...")
        auth_service = get_pear_auth_service()
        
        # Convert response to dict for signing
        eip712_data = {
            "domain": eip712_result.domain,
            "types": eip712_result.types,
            "message": eip712_result.message
        }
        
        # Sign with provided private key if available, otherwise use server's key
        if private_key:
            signature, timestamp = auth_service.sign_eip712_message_with_key(eip712_data, private_key)
            logger.info(f"Message signed with provided private key")
        else:
            signature, timestamp = auth_service.sign_eip712_message(eip712_data)
            logger.info(f"Message signed with server key")
        
        logger.info(f"  Signature: {signature[:20]}...")
        logger.info(f"  Timestamp: {timestamp}")
        
        # Step 3: Login with the signature
        logger.info("Step 3: Calling /auth/login endpoint...")
        access_token = await auth_service.login(
            address=wallet_address,
            client_id="HLHackathon1",
            signature=signature,
            timestamp=timestamp
        )
        logger.info(f"Login successful")
        logger.info(f"  Access token: {access_token[:20]}...")
        
        logger.info("=" * 80)
        logger.info("AUTHENTICATION SUCCESSFUL")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "authenticated": True,
            "address": wallet_address,
            "accessToken": access_token,
            "message": "Wallet authenticated successfully"
        }
        
    except Exception as e:
        logger.error("=" * 80)
        logger.error("AUTHENTICATION FAILED")
        logger.error(f"Error: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error("=" * 80)
        
        return {
            "success": False,
            "authenticated": False,
            "address": wallet_address,
            "error": str(e),
            "message": "Failed to authenticate wallet"
        }


# ============================================================================
# Agent Wallet Endpoints
# ============================================================================


@router.get("/agent-wallet", response_model=PearAgentWalletResponse)
async def get_agent_wallet(
    service: PearServiceDep,
) -> PearAgentWalletResponse:
    """
    Check agent wallet status.

    Returns the current status of the user's agent wallet:
    - NOT_FOUND: No wallet exists, need to create one
    - PENDING_APPROVAL: Wallet exists but needs approval on Hyperliquid
    - ACTIVE: Wallet is active and ready for trading
    - EXPIRED: Wallet has expired, need to create a new one

    Note: Requires prior authentication via /auth/login or /auth/authenticate
    """
    logger.info("Agent wallet status request")
    
    try:
        result = await service.get_agent_wallet()
        logger.info("Agent wallet status", status=result.status, address=result.wallet_address)
        return result
    except Exception as e:
        logger.error("Failed to get agent wallet", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/agent-wallet", response_model=PearCreateAgentWalletResponse)
async def create_agent_wallet(
    service: PearServiceDep,
) -> PearCreateAgentWalletResponse:
    """
    Create a new agent wallet.

    Creates a new agent wallet for trading through Pear Protocol.
    After creation, the wallet must be approved on Hyperliquid before
    it can be used for trading.

    Note: Requires prior authentication via /auth/login or /auth/authenticate

    Returns:
        New agent wallet information including address and status
    """
    logger.info("Create agent wallet request")
    
    try:
        result = await service.create_agent_wallet()
        logger.info("Agent wallet created", address=result.wallet_address, status=result.status)
        return result
    except Exception as e:
        logger.error("Failed to create agent wallet", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/agent-wallet/approve")
async def approve_agent_wallet(
    request: PearApproveAgentWalletRequest,
    service: PearServiceDep,
) -> dict[str, str]:
    """
    Approve an agent wallet on Hyperliquid.

    **IMPORTANT**: This approval must be done on the Hyperliquid exchange,
    not through the Pear API. The user's main wallet must sign an approval
    message on Hyperliquid to authorize the agent wallet.

    For client-side implementation (recommended):
    ```javascript
    import { ExchangeClient } from "@nktkas/hyperliquid";
    
    const client = new ExchangeClient({ wallet: account, transport });
    await client.approveAgent({
        agentAddress: "0x...",
        agentName: "PearProtocol"
    });
    ```

    This endpoint is a placeholder - the actual approval must be done
    client-side using the Hyperliquid SDK.
    """
    logger.info("Agent wallet approval request", 
               agent_address=request.agentAddress, 
               agent_name=request.agentName)
    
    try:
        # This will raise NotImplementedError with instructions
        await service.approve_agent_wallet(
            request.agentAddress, 
            request.agentName
        )
        return {"status": "approved", "agent_address": request.agentAddress}
    except NotImplementedError as e:
        # Return helpful message instead of error
        return {
            "status": "requires_client_side_approval",
            "agent_address": request.agentAddress,
            "agent_name": request.agentName,
            "message": str(e),
            "instructions": (
                "Approval must be done on Hyperliquid using the main wallet. "
                "Use the Hyperliquid SDK's approveAgent method."
            )
        }
    except Exception as e:
        logger.error("Failed to approve agent wallet", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============================================================================
# Complete Flow Endpoint (for testing)
# ============================================================================


@router.post("/setup-agent-wallet")
async def setup_agent_wallet(
    service: PearServiceDep,
) -> dict:
    """
    Complete agent wallet setup flow.
    
    This endpoint performs the full flow:
    1. Authenticate with Pear Protocol
    2. Check agent wallet status
    3. Create agent wallet if needed
    4. Return status and next steps

    Useful for testing the complete flow.
    """
    logger.info("Starting agent wallet setup flow")
    
    result = {
        "steps": [],
        "status": None,
        "agent_wallet_address": None,
        "next_action": None
    }
    
    try:
        # Step 1: Authenticate
        logger.info("Step 1: Authenticating...")
        access_token = await service.authenticate()
        result["steps"].append({
            "step": 1,
            "action": "authenticate",
            "status": "success",
            "message": "Authenticated with Pear Protocol"
        })
        
        # Step 2: Check agent wallet status
        logger.info("Step 2: Checking agent wallet status...")
        wallet_status = await service.get_agent_wallet()
        result["steps"].append({
            "step": 2,
            "action": "check_status",
            "status": "success",
            "wallet_status": wallet_status.status.value,
            "wallet_address": wallet_status.wallet_address
        })
        
        # Step 3: Handle based on status
        if wallet_status.status == AgentWalletStatus.ACTIVE:
            result["status"] = "ready"
            result["agent_wallet_address"] = wallet_status.wallet_address
            result["next_action"] = "none"
            result["message"] = "Agent wallet is active and ready for trading!"
            
        elif wallet_status.status == AgentWalletStatus.PENDING_APPROVAL:
            result["status"] = "pending_approval"
            result["agent_wallet_address"] = wallet_status.wallet_address
            result["next_action"] = "approve_on_hyperliquid"
            result["message"] = (
                f"Agent wallet {wallet_status.wallet_address} needs approval on Hyperliquid. "
                "Use the Hyperliquid SDK to approve it."
            )
            
        elif wallet_status.status in [AgentWalletStatus.NOT_FOUND, AgentWalletStatus.EXPIRED]:
            # Create new agent wallet
            logger.info("Step 3: Creating agent wallet...")
            new_wallet = await service.create_agent_wallet()
            result["steps"].append({
                "step": 3,
                "action": "create_wallet",
                "status": "success",
                "wallet_address": new_wallet.wallet_address
            })
            
            result["status"] = "created"
            result["agent_wallet_address"] = new_wallet.wallet_address
            result["next_action"] = "approve_on_hyperliquid"
            result["message"] = (
                f"Agent wallet created: {new_wallet.wallet_address}. "
                "Approve it on Hyperliquid to enable trading."
            )
        
        logger.info("Agent wallet setup complete", status=result["status"])
        return result
        
    except Exception as e:
        logger.error("Agent wallet setup failed", error=str(e))
        result["status"] = "error"
        result["error"] = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result
        )


# ============================================================================
# Pair Trading Endpoints
# ============================================================================


@router.post("/pairs", response_model=PearPairTradeResponse)
async def create_pair_trade(
    request: PearPairTradeRequest,
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> PearPairTradeResponse:
    """
    Create a new pair trade.

    Goes long on one asset and short on another simultaneously
    to trade the relative performance between them.
    """
    return await service.create_pair_trade(request)


@router.get("/pairs/positions", response_model=list[PearPairPositionResponse])
async def get_pair_positions(
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> list[PearPairPositionResponse]:
    """
    Get all pair trade positions.

    Returns current positions with entry prices and PnL.
    """
    return await service.get_pair_positions()


@router.delete("/pairs/{trade_id}")
async def close_pair_trade(
    trade_id: str,
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> dict[str, bool]:
    """
    Close a pair trade.

    Closes both the long and short positions simultaneously.
    """
    success = await service.close_pair_trade(trade_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to close pair trade",
        )
    return {"success": True}


@router.get("/positions/open")
async def get_open_positions(
    authorization: str = Query(default=None, description="Bearer token for Pear API"),
    service: PearServiceDep = None,
) -> dict[str, Any]:
    """
    Get all open positions from Pear Protocol.
    
    This endpoint calls the Pear Protocol API to fetch all open positions
    for the authenticated user.
    
    Args:
        authorization: Bearer token from Pear Protocol authentication
        
    Returns:
        List of open positions with PnL and asset details
    """
    import httpx
    
    logger.info("=" * 80)
    logger.info("GET OPEN POSITIONS REQUEST")
    logger.info("=" * 80)
    logger.info(f"Authorization provided: {'Yes' if authorization else 'No'}")
    
    try:
        # Call Pear Protocol API
        pear_api_url = "https://hl-v2.pearprotocol.io/positions"
        
        headers = {
            "Accept": "*/*",
        }
        
        if authorization:
            # Handle both "Bearer xxx" and just "xxx" formats
            if authorization.startswith("Bearer "):
                headers["Authorization"] = authorization
            else:
                headers["Authorization"] = f"Bearer {authorization}"
        
        logger.info(f"Calling Pear API: {pear_api_url}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(pear_api_url, headers=headers)
            
            logger.info(f"Pear API Response Status: {response.status_code}")
            
            if response.status_code == 200:
                positions = response.json()
                logger.info(f"Received {len(positions)} positions")
                logger.info("=" * 80)
                
                return {
                    "success": True,
                    "positions": positions,
                    "count": len(positions)
                }
            else:
                error_text = response.text
                logger.error(f"Pear API Error: {error_text}")
                logger.info("=" * 80)
                
                return {
                    "success": False,
                    "positions": [],
                    "count": 0,
                    "error": f"Pear API returned {response.status_code}: {error_text}"
                }
                
    except Exception as e:
        logger.error(f"Failed to fetch positions: {str(e)}")
        logger.info("=" * 80)
        
        return {
            "success": False,
            "positions": [],
            "count": 0,
            "error": str(e)
        }


@router.post("/positions")
async def create_position_trade(
    request: PearPositionRequest,
    authorization: str = Query(default=None, description="Bearer token for Pear API"),
    service: PearServiceDep = None,
) -> dict[str, Any]:
    """
    Create a position trade (pair or basket).
    
    This endpoint forwards the position request to Pear Protocol API
    at https://hl-v2.pearprotocol.io/positions
    """
    import httpx
    from datetime import datetime
    
    logger.info("=" * 80)
    logger.info("POSITION TRADE REQUEST - FORWARDING TO PEAR API")
    logger.info("=" * 80)
    logger.info(f"Wallet Address: {request.walletAddress}")
    logger.info(f"Execution Type: {request.executionType}")
    logger.info(f"USD Value: {request.usdValue}")
    logger.info(f"Leverage: {request.leverage}")
    logger.info(f"Slippage: {request.slippage}")
    logger.info(f"Long Assets: {request.longAssets}")
    logger.info(f"Short Assets: {request.shortAssets}")
    logger.info(f"Authorization provided: {'Yes' if authorization else 'No'}")
    logger.info("=" * 80)
    
    try:
        import json
        
        # Build request body for Pear API with all required fields
        pear_request_body = {
            "slippage": request.slippage,
            "executionType": request.executionType,
            "leverage": request.leverage,
            "usdValue": request.usdValue,
        }
        
        # Add longAssets (required for position)
        if request.longAssets:
            pear_request_body["longAssets"] = [
                {"asset": a.asset, "weight": a.weight} for a in request.longAssets
            ]
        
        # Add shortAssets (required for position)
        if request.shortAssets:
            pear_request_body["shortAssets"] = [
                {"asset": a.asset, "weight": a.weight} for a in request.shortAssets
            ]
        
        # Add trigger configuration if present
        if request.triggerValue:
            pear_request_body["triggerValue"] = request.triggerValue
        if request.triggerType:
            pear_request_body["triggerType"] = request.triggerType
        if request.direction:
            pear_request_body["direction"] = request.direction
        if request.assetName:
            pear_request_body["assetName"] = request.assetName
        
        # Add market code for prediction markets
        if request.marketCode:
            pear_request_body["marketCode"] = request.marketCode
        
        # Add TWAP configuration if present
        if request.twapDuration:
            pear_request_body["twapDuration"] = request.twapDuration
        if request.twapIntervalSeconds:
            pear_request_body["twapIntervalSeconds"] = request.twapIntervalSeconds
        if request.randomizeExecution is not None:
            pear_request_body["randomizeExecution"] = request.randomizeExecution
        
        # Add ladder configuration if present
        if request.ladderConfig:
            pear_request_body["ladderConfig"] = {
                "ratioStart": request.ladderConfig.ratioStart,
                "ratioEnd": request.ladderConfig.ratioEnd,
                "numberOfLevels": request.ladderConfig.numberOfLevels
            }
        
        # Add stopLoss - use provided value or default to 100%
        if request.stopLoss:
            pear_request_body["stopLoss"] = {
                "type": request.stopLoss.type,
                "value": request.stopLoss.value
            }
        else:
            # Default stopLoss: 100% (effectively no stop loss)
            pear_request_body["stopLoss"] = {
                "type": "PERCENTAGE",
                "value": 100
            }
        
        # Add takeProfit - use provided value or default to 100%
        if request.takeProfit:
            pear_request_body["takeProfit"] = {
                "type": request.takeProfit.type,
                "value": request.takeProfit.value
            }
        else:
            # Default takeProfit: 100% (effectively no take profit)
            pear_request_body["takeProfit"] = {
                "type": "PERCENTAGE",
                "value": 100
            }
        
        # Add referral code if present
        if request.referralCode:
            pear_request_body["referralCode"] = request.referralCode
        
        # Serialize request body and calculate content length
        request_body_json = json.dumps(pear_request_body)
        content_length = len(request_body_json.encode('utf-8'))
        
        logger.info(f"Pear API Request Body: {json.dumps(pear_request_body, indent=2)}")
        logger.info(f"Request Body Length: {content_length} bytes")
        
        # Call Pear Protocol API
        pear_api_url = "https://hl-v2.pearprotocol.io/positions"
        
        # Build headers matching the exact format from Pear API docs
        # POST /positions HTTP/1.1
        # Host: hl-v2.pearprotocol.io
        # Authorization: Bearer YOUR_SECRET_TOKEN
        # Content-Type: application/json
        # Accept: */*
        # Content-Length: (calculated automatically by httpx)
        headers = {
            "Host": "hl-v2.pearprotocol.io",
            "Accept": "*/*",
        }
        
        # Add Authorization header (required)
        if authorization:
            if authorization.startswith("Bearer "):
                headers["Authorization"] = authorization
            else:
                headers["Authorization"] = f"Bearer {authorization}"
        else:
            logger.warning("No authorization token provided - request may fail")
        
        logger.info(f"Calling Pear API: POST {pear_api_url}")
        logger.info(f"Request Headers: {json.dumps(headers, indent=2)}")
        logger.info(f"Calculated Content-Length: {content_length} bytes")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Use content= with explicit JSON string to have full control over the body
            # httpx will automatically set Content-Type and Content-Length headers
            response = await client.post(
                pear_api_url,
                content=request_body_json,
                headers={
                    **headers,
                    "Content-Type": "application/json",
                    "Content-Length": str(content_length),
                }
            )
            
            logger.info(f"Pear API Response Status: {response.status_code}")
            logger.info(f"Pear API Response Headers: {dict(response.headers)}")
            
            # Try to parse response as JSON
            try:
                response_data = response.json()
                logger.info(f"Pear API Response Body: {response_data}")
            except Exception:
                response_data = {"raw_response": response.text}
                logger.info(f"Pear API Response Text: {response.text}")
            
            logger.info("=" * 80)
            
            if response.status_code == 200 or response.status_code == 201:
                return {
                    "success": True,
                    "message": "Position created successfully",
                    "walletAddress": request.walletAddress,
                    "usdValue": request.usdValue,
                    "pearResponse": response_data,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            else:
                return {
                    "success": False,
                    "error": f"Pear API returned {response.status_code}",
                    "message": response_data.get("message") or response_data.get("error") or str(response_data),
                    "walletAddress": request.walletAddress,
                    "pearResponse": response_data,
                    "timestamp": datetime.utcnow().isoformat(),
                }
                
    except httpx.TimeoutException:
        logger.error("Pear API request timed out")
        logger.info("=" * 80)
        return {
            "success": False,
            "error": "Request to Pear API timed out",
            "walletAddress": request.walletAddress,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Failed to call Pear API: {str(e)}")
        logger.info("=" * 80)
        return {
            "success": False,
            "error": str(e),
            "walletAddress": request.walletAddress,
            "timestamp": datetime.utcnow().isoformat(),
        }


# ============================================================================
# Test Endpoint - Exact Example Request
# ============================================================================


@router.post("/positions/test")
async def test_position_trade(
    authorization: str = Query(..., description="Bearer token for Pear API"),
) -> dict[str, Any]:
    """
    Test endpoint that sends the exact example request from Pear API docs.
    """
    import httpx
    import json
    from datetime import datetime
    
    logger.info("=" * 80)
    logger.info("TEST POSITION TRADE - SENDING EXAMPLE REQUEST")
    logger.info("=" * 80)
    
    # Exact example request from Pear API docs
    pear_request_body = {
        "slippage": 0.01,
        "executionType": "MARKET",
        "leverage": 10,
        "usdValue": 10,
        "longAssets": [
            {"asset": "BTC", "weight": 0.6},
            {"asset": "ETH", "weight": 0.4}
        ],
        "shortAssets": [
            {"asset": "SOL", "weight": 0.7},
            {"asset": "AVAX", "weight": 0.3}
        ],
        "stopLoss": {
            "type": "PERCENTAGE",
            "value": 15
        },
        "takeProfit": {
            "type": "PERCENTAGE",
            "value": 25
        }
    }
    
    try:
        request_body_json = json.dumps(pear_request_body)
        content_length = len(request_body_json.encode('utf-8'))
        
        logger.info(f"Request Body: {json.dumps(pear_request_body, indent=2)}")
        logger.info(f"Content-Length: {content_length} bytes")
        
        pear_api_url = "https://hl-v2.pearprotocol.io/positions"
        
        headers = {
            "Host": "hl-v2.pearprotocol.io",
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Content-Length": str(content_length),
        }
        
        if authorization.startswith("Bearer "):
            headers["Authorization"] = authorization
        else:
            headers["Authorization"] = f"Bearer {authorization}"
        
        logger.info(f"Calling: POST {pear_api_url}")
        logger.info(f"Headers: {json.dumps({k: v[:50] + '...' if k == 'Authorization' and len(v) > 50 else v for k, v in headers.items()}, indent=2)}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                pear_api_url,
                content=request_body_json,
                headers=headers
            )
            
            logger.info(f"Response Status: {response.status_code}")
            logger.info(f"Response Headers: {dict(response.headers)}")
            
            try:
                response_data = response.json()
                logger.info(f"Response Body: {json.dumps(response_data, indent=2)}")
            except Exception:
                response_data = {"raw_response": response.text}
                logger.info(f"Response Text: {response.text}")
            
            logger.info("=" * 80)
            
            return {
                "success": response.status_code in [200, 201],
                "status_code": response.status_code,
                "request_body": pear_request_body,
                "response": response_data,
                "timestamp": datetime.utcnow().isoformat(),
            }
            
    except Exception as e:
        logger.error(f"Test request failed: {str(e)}")
        logger.info("=" * 80)
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


# ============================================================================
# Spot Order Endpoints
# ============================================================================


@router.post("/orders/spot")
async def create_spot_order(
    request: dict[str, Any],
    service: PearServiceDep,
) -> dict[str, Any]:
    """
    Create a single spot order.
    
    This endpoint accepts spot order requests for single asset trades.
    """
    import uuid
    from datetime import datetime
    
    logger.info("=" * 80)
    logger.info("SPOT ORDER REQUEST RECEIVED")
    logger.info("=" * 80)
    logger.info(f"Request: {request}")
    logger.info("=" * 80)
    
    asset = request.get("asset", "UNKNOWN")
    is_buy = request.get("isBuy", True)
    amount = request.get("amount", 0)
    wallet_address = request.get("walletAddress", "")
    
    # Generate an order ID for tracking
    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    
    # For now, return success response
    # In production, this would forward to Pear Protocol API
    response = {
        "success": True,
        "orderId": order_id,
        "message": f"{'Buy' if is_buy else 'Sell'} order for {amount} {asset} submitted successfully!",
        "asset": asset,
        "isBuy": is_buy,
        "amount": amount,
        "walletAddress": wallet_address,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    logger.info("SPOT ORDER RESPONSE")
    logger.info(f"Response: {response}")
    logger.info("=" * 80)
    
    return response


# ============================================================================
# Bucket Trading Endpoints
# ============================================================================


@router.post("/buckets", response_model=PearBucketStrategyResponse)
async def create_bucket_strategy(
    request: PearBucketStrategyRequest,
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> PearBucketStrategyResponse:
    """
    Create a new bucket trading strategy.

    A bucket is a weighted portfolio of assets that can be
    automatically rebalanced.
    """
    # Validate weights sum to 1
    total_weight = sum(asset.weight for asset in request.assets)
    if abs(total_weight - 1.0) > 0.001:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset weights must sum to 1.0, got {total_weight}",
        )

    return await service.create_bucket_strategy(request)


@router.get("/buckets", response_model=list[PearBucketStatusResponse])
async def get_bucket_strategies(
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> list[PearBucketStatusResponse]:
    """
    Get all bucket strategies.

    Returns all active bucket strategies with current values.
    """
    return await service.get_bucket_strategies()


@router.get("/buckets/{strategy_id}", response_model=PearBucketStatusResponse)
async def get_bucket_status(
    strategy_id: str,
    user: AuthenticatedUser,
    service: PearServiceDep,
) -> PearBucketStatusResponse:
    """
    Get the status of a specific bucket strategy.

    Returns current holdings, values, and rebalance status.
    """
    return await service.get_bucket_status(strategy_id)
