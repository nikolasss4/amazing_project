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


@router.post("/auth/authenticate-wallet")
async def authenticate_wallet(
    address: str = Query(..., description="Wallet address to authenticate"),
    service: PearServiceDep = None,
) -> dict[str, Any]:
    """
    Authenticate a wallet address with Pear Protocol.
    
    This endpoint performs the complete authentication flow:
    1. Gets EIP-712 message from Pear API for the user's address
    2. Signs it using server's private key (for simplicity - simulating wallet signing)
    3. Calls /auth/login with the signature
    4. Returns success/failure
    
    Args:
        address: The wallet address to authenticate
        
    Returns:
        Success status and access token if successful
    """
    logger.info("=" * 80)
    logger.info("WALLET AUTHENTICATION REQUEST")
    logger.info("=" * 80)
    logger.info(f"Address: {address}")
    logger.info(f"Client ID: HLHackathon1")
    
    try:
        # Step 1: Get EIP-712 message for this specific address
        logger.info("Step 1: Getting EIP-712 message for user's address...")
        eip712_result = await service.get_eip712_message(address, "HLHackathon1")
        logger.info(f"✓ EIP-712 message received")
        logger.info(f"  Message address: {eip712_result.message.get('address')}")
        logger.info(f"  Message clientId: {eip712_result.message.get('clientId')}")
        logger.info(f"  Message timestamp: {eip712_result.message.get('timestamp')}")
        
        # Step 2: Sign the message using server's key (simulating wallet signature)
        logger.info("Step 2: Signing EIP-712 message...")
        auth_service = get_pear_auth_service()
        
        # Convert response to dict for signing
        eip712_data = {
            "domain": eip712_result.domain,
            "types": eip712_result.types,
            "message": eip712_result.message
        }
        
        signature, timestamp = auth_service.sign_eip712_message(eip712_data)
        logger.info(f"✓ Message signed")
        logger.info(f"  Signature: {signature[:20]}...")
        logger.info(f"  Timestamp: {timestamp}")
        
        # Step 3: Login with the signature
        logger.info("Step 3: Calling /auth/login endpoint...")
        access_token = await auth_service.login(
            address=address,
            client_id="HLHackathon1",
            signature=signature,
            timestamp=timestamp
        )
        logger.info(f"✓ Login successful")
        logger.info(f"  Access token: {access_token[:20]}...")
        
        logger.info("=" * 80)
        logger.info("AUTHENTICATION SUCCESSFUL")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "authenticated": True,
            "address": address,
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
            "address": address,
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


@router.post("/positions")
async def create_position_trade(
    request: PearPositionRequest,
    service: PearServiceDep,
) -> dict[str, Any]:
    """
    Create a position trade (pair or basket).
    
    This endpoint accepts the full Pear Protocol position format
    and logs the wallet address for tracking purposes.
    """
    logger.info(
        "Position trade request received",
        wallet_address=request.walletAddress,
        execution_type=request.executionType,
        usd_value=request.usdValue,
        leverage=request.leverage,
    )
    
    # For now, return success response
    # In production, this would forward to Pear Protocol API
    return {
        "success": True,
        "message": "Position trade request received",
        "walletAddress": request.walletAddress,
        "usdValue": request.usdValue,
    }


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
