"""Pear Protocol trading service wrapper.

This module provides the main interface for interacting with Pear Protocol API.
Authentication is handled by PearAuthService.
"""

from datetime import datetime
from functools import lru_cache
from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalServiceError
from app.core.logging import get_logger
from app.trade.schemas import (
    AgentWalletStatus,
    Instrument,
    PearAgentWalletResponse,
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
)
from app.trade.services.pear_auth_service import PearAuthService, get_pear_auth_service

logger = get_logger(__name__)


class PearService:
    """
    API client wrapper for Pear Protocol integration.

    This service provides typed request/response models for
    interacting with Pear Protocol's API.
    
    Authentication Flow (from TypeScript reference):
    1. GET /auth/eip712-message - Get message to sign
    2. Sign with wallet (EIP-712 typed data)
    3. POST /auth/login - Login with signature
    4. Use Bearer token for authenticated endpoints
    
    Agent Wallet Flow:
    1. GET /agentWallet - Check status
    2. POST /agentWallet - Create wallet if needed
    3. Approve on Hyperliquid (external to Pear API)
    """

    def __init__(self, auth_service: PearAuthService | None = None):
        self.base_url = settings.PEAR_API_URL
        self.client_id = settings.PEAR_CLIENT_ID
        self.auth_service = auth_service or get_pear_auth_service()
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client with current auth headers."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self.auth_service.get_auth_headers(),
                timeout=30.0,
            )
        return self._client

    async def _refresh_client(self) -> httpx.AsyncClient:
        """Refresh the HTTP client with new auth headers."""
        if self._client:
            await self._client.aclose()
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=self.auth_service.get_auth_headers(),
            timeout=30.0,
        )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _request(
        self,
        method: str,
        endpoint: str,
        params: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
        require_auth: bool = True,
    ) -> dict[str, Any]:
        """
        Make a request to Pear API.
        
        Args:
            method: HTTP method (GET, POST, DELETE)
            endpoint: API endpoint
            params: Query parameters
            data: Request body data
            require_auth: Whether authentication is required
            
        Returns:
            Response JSON as dict
        """
        # Ensure we're authenticated if required
        if require_auth:
            await self.auth_service.ensure_authenticated()
            # Refresh client to get new auth headers
            client = await self._refresh_client()
        else:
            client = await self._get_client()

        try:
            if method == "GET":
                response = await client.get(endpoint, params=params)
            elif method == "POST":
                response = await client.post(endpoint, json=data, params=params)
            elif method == "DELETE":
                response = await client.delete(endpoint, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            
            # Handle empty responses
            if response.status_code == 204 or not response.content:
                return {}
                
            return response.json()
            
        except httpx.HTTPStatusError as e:
            logger.error(
                "Pear API error",
                method=method,
                endpoint=endpoint,
                status_code=e.response.status_code,
                detail=e.response.text,
            )
            raise ExternalServiceError("Pear Protocol", f"{e.response.status_code}: {e.response.text}")
        except httpx.RequestError as e:
            logger.error("Pear API request failed", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    # ========================================================================
    # Authentication & Agent Wallet
    # ========================================================================

    async def get_eip712_message(
        self, address: str, client_id: str | None = None
    ) -> PearEIP712MessageResponse:
        """
        Get EIP-712 message structure for wallet signature.

        Args:
            address: User's wallet address
            client_id: Client identifier (defaults to configured client ID)

        Returns:
            EIP-712 typed data structure to be signed
        """
        cid = client_id or self.client_id
        logger.info("Getting EIP-712 message", address=address, client_id=cid)

        # This endpoint doesn't require authentication
        data = await self.auth_service.get_eip712_message(address, cid)
        return PearEIP712MessageResponse(**data)

    async def login_with_signature(
        self, request: PearLoginRequest
    ) -> PearAuthTokenResponse:
        """
        Login with EIP-712 signature to obtain access token.

        Args:
            request: Login request with wallet address and signature

        Returns:
            Access token and refresh token for API authentication
        """
        logger.info("Logging in with signature", address=request.address)

        # Extract signature and timestamp from details
        signature = request.details.get("signature")
        timestamp = request.details.get("timestamp")
        
        if not signature:
            raise ExternalServiceError("Pear Protocol", "Missing signature in details")
        
        # Use auth service to login
        access_token = await self.auth_service.login(
            address=request.address,
            client_id=request.clientId,
            signature=signature,
            timestamp=timestamp
        )
        
        # Refresh client with new token
        await self._refresh_client()
        
        logger.info("Successfully authenticated", address=request.address)
        
        return PearAuthTokenResponse(
            accessToken=access_token,
            refreshToken=None,  # Pear API may not return refresh token
            tokenType="Bearer"
        )

    async def refresh_access_token(self, refresh_token: str) -> PearAuthTokenResponse:
        """
        Refresh access token using refresh token.

        Args:
            refresh_token: The refresh token

        Returns:
            New access token and refresh token
        """
        logger.info("Refreshing access token")

        try:
            response = await self._request(
                "POST",
                "/auth/refresh",
                data={"refreshToken": refresh_token},
                require_auth=False,
            )

            auth_response = PearAuthTokenResponse(**response)

            # Update the stored access token
            if auth_response.accessToken:
                self.auth_service.set_access_token(auth_response.accessToken)
                await self._refresh_client()

            logger.info("Successfully refreshed token")
            return auth_response
            
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to refresh token", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def authenticate(self) -> str:
        """
        Perform full authentication using configured wallet.
        
        Returns:
            Access token
        """
        logger.info("Performing full authentication")
        access_token = await self.auth_service.authenticate()
        await self._refresh_client()
        return access_token

    async def get_agent_wallet(self) -> PearAgentWalletResponse:
        """
        Check if user has an agent wallet and its status.

        Returns:
            Agent wallet information including address and status
            - NOT_FOUND: No wallet exists (404 or empty response)
            - PENDING_APPROVAL: Wallet exists but needs approval on Hyperliquid
            - ACTIVE: Wallet is active and can be used
            - EXPIRED: Wallet has expired and needs to be recreated
        """
        logger.info("Checking agent wallet status")

        try:
            response = await self._request(
                "GET",
                "/agentWallet",
                params={"clientId": self.client_id},
            )

            logger.debug("Agent wallet response", response=response)
            
            # Handle empty response
            if not response or len(response) == 0:
                logger.info("Agent wallet not found (empty response)")
                return PearAgentWalletResponse(status=AgentWalletStatus.NOT_FOUND)
            
            # Extract agent address from various possible fields
            agent_address = (
                response.get("agentWalletAddress") or 
                response.get("agentAddress") or 
                response.get("address")
            )
            
            # Determine status
            status_str = response.get("status")
            if status_str:
                try:
                    status = AgentWalletStatus(status_str)
                except ValueError:
                    # Unknown status, default to PENDING_APPROVAL if address exists
                    status = AgentWalletStatus.PENDING_APPROVAL if agent_address else AgentWalletStatus.NOT_FOUND
            elif agent_address:
                # Has address but no explicit status = PENDING_APPROVAL
                status = AgentWalletStatus.PENDING_APPROVAL
            else:
                status = AgentWalletStatus.NOT_FOUND
            
            return PearAgentWalletResponse(
                agentWalletAddress=response.get("agentWalletAddress"),
                agentAddress=response.get("agentAddress"),
                address=response.get("address"),
                status=status,
                expiresAt=response.get("expiresAt"),
                createdAt=response.get("createdAt"),
                message=response.get("message"),
            )
            
        except ExternalServiceError as e:
            # Check if it's a 404 (not found)
            if "404" in str(e):
                logger.info("Agent wallet not found (404)")
                return PearAgentWalletResponse(status=AgentWalletStatus.NOT_FOUND)
            raise
        except Exception as e:
            logger.error("Failed to get agent wallet", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def create_agent_wallet(self) -> PearCreateAgentWalletResponse:
        """
        Create a new agent wallet for the user.

        Returns:
            New agent wallet information including address
        """
        logger.info("Creating agent wallet", client_id=self.client_id)

        try:
            response = await self._request(
                "POST",
                "/agentWallet",
                data={"clientId": self.client_id},
            )

            logger.info("Agent wallet created successfully")
            logger.debug("Create agent wallet response", response=response)

            return PearCreateAgentWalletResponse(
                agentWalletAddress=response.get("agentWalletAddress"),
                agentAddress=response.get("agentAddress"),
                address=response.get("address"),
                status=response.get("status", "PENDING_APPROVAL"),
                expiresAt=response.get("expiresAt"),
                createdAt=response.get("createdAt"),
                message=response.get("message"),
            )
            
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to create agent wallet", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def approve_agent_wallet(
        self, agent_address: str, agent_name: str = "PearProtocol"
    ) -> dict[str, Any]:
        """
        Approve an agent wallet on Hyperliquid.
        
        NOTE: This is done directly on Hyperliquid, not through Pear API.
        The approval must be signed by the main wallet and sent to Hyperliquid.

        Args:
            agent_address: The agent wallet address to approve
            agent_name: Name for the agent on Hyperliquid

        Returns:
            Approval result from Hyperliquid
        """
        logger.info("Approving agent wallet on Hyperliquid", 
                   agent_address=agent_address, agent_name=agent_name)
        
        # TODO: Implement Hyperliquid approval using hyperliquid-python-sdk
        # This requires using the ExchangeClient from the SDK
        # 
        # from hyperliquid.exchange import Exchange
        # exchange = Exchange(wallet, base_url)
        # result = exchange.approve_agent(agent_address, agent_name)
        
        raise NotImplementedError(
            "Agent wallet approval must be done on Hyperliquid. "
            "Use the Hyperliquid exchange to approve the agent wallet: "
            f"agent_address={agent_address}, agent_name={agent_name}"
        )

    # ========================================================================
    # Pair Trading
    # ========================================================================

    async def create_pair_trade(
        self, request: PearPairTradeRequest
    ) -> PearPairTradeResponse:
        """
        Create a new pair trade on Pear Protocol.

        Args:
            request: Pair trade request with long/short symbols and size

        Returns:
            Trade response with trade ID and status
        """
        logger.info(
            "Creating pair trade",
            long=request.long_symbol,
            short=request.short_symbol,
            size=request.size,
        )

        try:
            response = await self._request(
                "POST",
                "/pairs/trades",
                data={
                    "longSymbol": request.long_symbol,
                    "shortSymbol": request.short_symbol,
                    "size": request.size,
                    "leverage": request.leverage,
                },
            )

            return PearPairTradeResponse(
                trade_id=response.get("tradeId", response.get("id")),
                long_symbol=response.get("longSymbol", request.long_symbol),
                short_symbol=response.get("shortSymbol", request.short_symbol),
                size=response.get("size", request.size),
                leverage=response.get("leverage", request.leverage),
                status=response.get("status", "open"),
                created_at=response.get("createdAt", datetime.utcnow()),
            )
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to create pair trade", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def get_pair_positions(self) -> list[PearPairPositionResponse]:
        """
        Get all pair trade positions.

        Returns:
            List of current pair trade positions
        """
        logger.info("Getting pair positions")

        try:
            response = await self._request("GET", "/pairs/positions")
            
            positions = []
            for pos in response.get("positions", []):
                positions.append(PearPairPositionResponse(
                    trade_id=pos.get("tradeId", pos.get("id")),
                    long_symbol=pos.get("longSymbol"),
                    short_symbol=pos.get("shortSymbol"),
                    long_entry_price=pos.get("longEntryPrice", 0),
                    short_entry_price=pos.get("shortEntryPrice", 0),
                    current_long_price=pos.get("currentLongPrice", 0),
                    current_short_price=pos.get("currentShortPrice", 0),
                    size=pos.get("size", 0),
                    unrealized_pnl=pos.get("unrealizedPnl", 0),
                    status=pos.get("status", "open"),
                    created_at=pos.get("createdAt", datetime.utcnow()),
                ))
            return positions
            
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get pair positions", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def close_pair_trade(self, trade_id: str) -> bool:
        """
        Close a pair trade.

        Args:
            trade_id: The trade ID to close

        Returns:
            True if closure was successful
        """
        logger.info("Closing pair trade", trade_id=trade_id)

        try:
            await self._request("DELETE", f"/pairs/trades/{trade_id}")
            return True
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to close pair trade", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    # ========================================================================
    # Bucket Trading
    # ========================================================================

    async def create_bucket_strategy(
        self, request: PearBucketStrategyRequest
    ) -> PearBucketStrategyResponse:
        """
        Create a new bucket trading strategy.

        Args:
            request: Bucket strategy configuration

        Returns:
            Strategy response with strategy ID and status
        """
        logger.info(
            "Creating bucket strategy",
            name=request.name,
            assets_count=len(request.assets),
            size=request.total_size,
        )

        try:
            response = await self._request(
                "POST",
                "/buckets/strategies",
                data={
                    "name": request.name,
                    "assets": [{"symbol": a.symbol, "weight": a.weight} for a in request.assets],
                    "totalSize": request.total_size,
                    "rebalanceThreshold": request.rebalance_threshold,
                },
            )

            return PearBucketStrategyResponse(
                strategy_id=response.get("strategyId", response.get("id")),
                name=response.get("name", request.name),
                assets=request.assets,
                total_size=response.get("totalSize", request.total_size),
                status=response.get("status", "active"),
                created_at=response.get("createdAt", datetime.utcnow()),
            )
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to create bucket strategy", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def get_bucket_status(
        self, strategy_id: str
    ) -> PearBucketStatusResponse:
        """
        Get the status of a bucket strategy.

        Args:
            strategy_id: The strategy ID to check

        Returns:
            Current strategy status and holdings
        """
        logger.info("Getting bucket status", strategy_id=strategy_id)

        try:
            response = await self._request(
                "GET",
                f"/buckets/strategies/{strategy_id}",
            )

            return PearBucketStatusResponse(
                strategy_id=response.get("strategyId", strategy_id),
                name=response.get("name", ""),
                assets=response.get("assets", []),
                total_value=response.get("totalValue", 0),
                unrealized_pnl=response.get("unrealizedPnl", 0),
                status=response.get("status", "active"),
                last_rebalance=response.get("lastRebalance"),
                created_at=response.get("createdAt", datetime.utcnow()),
            )
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get bucket status", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def get_bucket_strategies(self) -> list[PearBucketStatusResponse]:
        """
        Get all bucket strategies.

        Returns:
            List of all bucket strategies with status
        """
        logger.info("Getting all bucket strategies")

        try:
            response = await self._request("GET", "/buckets/strategies")
            
            strategies = []
            for strat in response.get("strategies", []):
                strategies.append(PearBucketStatusResponse(
                    strategy_id=strat.get("strategyId", strat.get("id")),
                    name=strat.get("name", ""),
                    assets=strat.get("assets", []),
                    total_value=strat.get("totalValue", 0),
                    unrealized_pnl=strat.get("unrealizedPnl", 0),
                    status=strat.get("status", "active"),
                    last_rebalance=strat.get("lastRebalance"),
                    created_at=strat.get("createdAt", datetime.utcnow()),
                ))
            return strategies
            
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get bucket strategies", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    # ========================================================================
    # Instruments
    # ========================================================================

    async def get_instruments(self) -> list[Instrument]:
        """
        Get list of tradable instruments from Pear Protocol.

        Returns:
            List of available trading instruments
        """
        logger.info("Getting Pear instruments")

        try:
            response = await self._request("GET", "/instruments", require_auth=False)
            
            instruments = []
            for inst in response.get("instruments", []):
                instruments.append(Instrument(
                    symbol=inst.get("symbol"),
                    name=inst.get("name", inst.get("symbol")),
                    base_currency=inst.get("baseCurrency", ""),
                    quote_currency=inst.get("quoteCurrency", ""),
                    min_order_size=inst.get("minOrderSize", 0),
                    price_decimals=inst.get("priceDecimals", 2),
                    size_decimals=inst.get("sizeDecimals", 2),
                    source="pear",
                ))
            return instruments
            
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get instruments", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))


# Service factory with caching
_pear_service: PearService | None = None


def get_pear_service() -> PearService:
    """Get cached Pear service instance."""
    global _pear_service
    if _pear_service is None:
        _pear_service = PearService()
    return _pear_service
