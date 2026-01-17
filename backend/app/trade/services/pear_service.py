"""Pear Protocol trading service wrapper."""

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

logger = get_logger(__name__)


class PearService:
    """
    API client wrapper for Pear Protocol integration.

    This service provides typed request/response models for
    interacting with Pear Protocol's API.
    """

    def __init__(self):
        self.base_url = settings.PEAR_API_URL
        self.api_key = settings.PEAR_API_KEY
        self._client: httpx.AsyncClient | None = None
        self._access_token: str | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            # Use access token if available, otherwise fall back to API key
            auth_token = self._access_token or self.api_key
            
            headers = {"Content-Type": "application/json"}
            # Only add Authorization header if we have a token
            if auth_token:
                headers["Authorization"] = f"Bearer {auth_token}"
            
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=headers,
                timeout=30.0,
            )
        return self._client

    def set_access_token(self, token: str) -> None:
        """
        Set access token for authenticated requests.

        This token will be used instead of the API key for subsequent requests.
        """
        self._access_token = token
        # Reset client to pick up new token
        if self._client:
            self._client = None

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _request(
        self,
        method: str,
        endpoint: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Make an authenticated request to Pear API.

        TODO: Implement actual API calls.
        """
        client = await self._get_client()

        try:
            if method == "GET":
                response = await client.get(endpoint)
            elif method == "POST":
                response = await client.post(endpoint, json=data)
            elif method == "DELETE":
                response = await client.delete(endpoint)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(
                "Pear API error",
                status_code=e.response.status_code,
                detail=e.response.text,
            )
            raise ExternalServiceError("Pear Protocol", str(e))
        except httpx.RequestError as e:
            logger.error("Pear API request failed", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    # ========================================================================
    # Authentication & Agent Wallet
    # ========================================================================

    async def get_eip712_message(
        self, address: str, client_id: str = "APITRADER"
    ) -> PearEIP712MessageResponse:
        """
        Get EIP-712 message structure for wallet signature.

        Args:
            address: User's wallet address
            client_id: Client identifier

        Returns:
            EIP-712 typed data structure to be signed
        """
        logger.info("Getting EIP-712 message", address=address, client_id=client_id)

        try:
            response = await self._request(
                "GET",
                f"/auth/eip712-message?address={address}&clientId={client_id}",
            )
            return PearEIP712MessageResponse(**response)
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get EIP-712 message", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

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

        try:
            response = await self._request(
                "POST",
                "/auth/login",
                data=request.model_dump(),
            )

            auth_response = PearAuthTokenResponse(**response)

            # Store the access token for subsequent requests
            self.set_access_token(auth_response.access_token)

            logger.info("Successfully authenticated", address=request.address)
            return auth_response
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to login", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

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
                data={"refresh_token": refresh_token},
            )

            auth_response = PearAuthTokenResponse(**response)

            # Update the stored access token
            self.set_access_token(auth_response.access_token)

            logger.info("Successfully refreshed token")
            return auth_response
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to refresh token", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def get_agent_wallet(self) -> PearAgentWalletResponse:
        """
        Check if user has an agent wallet and its status.

        Returns:
            Agent wallet information including address and status
        """
        logger.info("Checking agent wallet status")

        try:
            response = await self._request("GET", "/agent-wallet")

            # Parse the response based on the status
            status_str = response.get("status", "NOT_FOUND")
            status = AgentWalletStatus(status_str)

            return PearAgentWalletResponse(
                address=response.get("address"),
                status=status,
                expires_at=response.get("expires_at"),
                created_at=response.get("created_at"),
            )
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get agent wallet", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def create_agent_wallet(self) -> PearCreateAgentWalletResponse:
        """
        Create a new agent wallet for the user.

        Returns:
            New agent wallet information including address
        """
        logger.info("Creating agent wallet")

        try:
            response = await self._request("POST", "/agent-wallet")

            return PearCreateAgentWalletResponse(
                address=response["address"],
                status=response["status"],
                expires_at=response["expires_at"],
                created_at=response["created_at"],
            )
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to create agent wallet", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def approve_agent_wallet(
        self, agent_address: str, signature: str
    ) -> bool:
        """
        Approve an agent wallet to allow Pear Protocol to use it.

        Args:
            agent_address: The agent wallet address to approve
            signature: User's signature approving the agent wallet

        Returns:
            True if approval was successful
        """
        logger.info("Approving agent wallet", agent_address=agent_address)

        try:
            await self._request(
                "POST",
                "/agent-wallet/approve",
                data={"agent_address": agent_address, "signature": signature},
            )
            logger.info("Successfully approved agent wallet")
            return True
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to approve agent wallet", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    # ========================================================================
    # Pair Trading
    # ========================================================================

    async def create_pair_trade(
        self, request: PearPairTradeRequest
    ) -> PearPairTradeResponse:
        """
        Create a new pair trade on Pear Protocol.

        TODO: Implement actual API call.

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
            # TODO: Implement actual API call
            # response = await self._request(
            #     "POST",
            #     "/v1/pairs/trades",
            #     data=request.model_dump(),
            # )

            # Stub response
            return PearPairTradeResponse(
                trade_id="pear_trade_123",
                long_symbol=request.long_symbol,
                short_symbol=request.short_symbol,
                size=request.size,
                leverage=request.leverage,
                status="open",
                created_at=datetime.utcnow(),
            )
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to create pair trade", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def get_pair_positions(self) -> list[PearPairPositionResponse]:
        """
        Get all pair trade positions.

        TODO: Implement actual API call.

        Returns:
            List of current pair trade positions
        """
        logger.info("Getting pair positions")

        try:
            # TODO: Implement actual API call
            # response = await self._request("GET", "/v1/pairs/positions")

            # Stub response
            return [
                PearPairPositionResponse(
                    trade_id="pear_trade_123",
                    long_symbol="ETH",
                    short_symbol="BTC",
                    long_entry_price=2000.00,
                    short_entry_price=45000.00,
                    current_long_price=2050.00,
                    current_short_price=44500.00,
                    size=1000.00,
                    unrealized_pnl=36.11,
                    status="open",
                    created_at=datetime.utcnow(),
                )
            ]
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get pair positions", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def close_pair_trade(self, trade_id: str) -> bool:
        """
        Close a pair trade.

        TODO: Implement actual API call.

        Args:
            trade_id: The trade ID to close

        Returns:
            True if closure was successful
        """
        logger.info("Closing pair trade", trade_id=trade_id)

        try:
            # TODO: Implement actual API call
            # await self._request("DELETE", f"/v1/pairs/trades/{trade_id}")
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

        TODO: Implement actual API call.

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
            # TODO: Implement actual API call
            # response = await self._request(
            #     "POST",
            #     "/v1/buckets/strategies",
            #     data=request.model_dump(),
            # )

            # Stub response
            return PearBucketStrategyResponse(
                strategy_id="pear_bucket_456",
                name=request.name,
                assets=request.assets,
                total_size=request.total_size,
                status="active",
                created_at=datetime.utcnow(),
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

        TODO: Implement actual API call.

        Args:
            strategy_id: The strategy ID to check

        Returns:
            Current strategy status and holdings
        """
        logger.info("Getting bucket status", strategy_id=strategy_id)

        try:
            # TODO: Implement actual API call
            # response = await self._request(
            #     "GET",
            #     f"/v1/buckets/strategies/{strategy_id}",
            # )

            # Stub response
            return PearBucketStatusResponse(
                strategy_id=strategy_id,
                name="Tech Leaders Basket",
                assets=[
                    {"symbol": "ETH", "weight": 0.4, "current_value": 400.00},
                    {"symbol": "BTC", "weight": 0.3, "current_value": 310.00},
                    {"symbol": "SOL", "weight": 0.3, "current_value": 295.00},
                ],
                total_value=1005.00,
                unrealized_pnl=5.00,
                status="active",
                last_rebalance=datetime.utcnow(),
                created_at=datetime.utcnow(),
            )
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get bucket status", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))

    async def get_bucket_strategies(self) -> list[PearBucketStatusResponse]:
        """
        Get all bucket strategies.

        TODO: Implement actual API call.

        Returns:
            List of all bucket strategies with status
        """
        logger.info("Getting all bucket strategies")

        try:
            # TODO: Implement actual API call
            # response = await self._request("GET", "/v1/buckets/strategies")

            # Stub response - return empty list for now
            return []
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

        TODO: Implement actual API call with caching.

        Returns:
            List of available trading instruments
        """
        logger.info("Getting Pear instruments")

        try:
            # TODO: Implement actual API call
            # response = await self._request("GET", "/v1/instruments")

            # Stub response
            return [
                Instrument(
                    symbol="ETH/BTC",
                    name="Ethereum / Bitcoin Pair",
                    base_currency="ETH",
                    quote_currency="BTC",
                    min_order_size=100.0,
                    price_decimals=6,
                    size_decimals=2,
                    source="pear",
                ),
                Instrument(
                    symbol="SOL/ETH",
                    name="Solana / Ethereum Pair",
                    base_currency="SOL",
                    quote_currency="ETH",
                    min_order_size=50.0,
                    price_decimals=6,
                    size_decimals=2,
                    source="pear",
                ),
            ]
        except Exception as e:
            if isinstance(e, ExternalServiceError):
                raise
            logger.error("Failed to get instruments", error=str(e))
            raise ExternalServiceError("Pear Protocol", str(e))


@lru_cache
def get_pear_service() -> PearService:
    """Get cached Pear service instance."""
    return PearService()
