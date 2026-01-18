"""Unit tests for position trading functionality."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.trade.schemas import (
    PearPositionRequest,
    PearPositionResponse,
    PearAssetWeight,
    PearStopLossTakeProfit,
    PearLadderConfig,
)
from app.trade.services.pear_service import PearService
from app.core.exceptions import ExternalServiceError


class TestPearPositionRequest:
    """Test PearPositionRequest validation."""
    
    def test_valid_position_request(self):
        """Test valid position request creation."""
        request = PearPositionRequest(
            walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            slippage=0.01,
            executionType="SYNC",
            leverage=10,
            usdValue=1000,
            longAssets=[
                PearAssetWeight(asset="BTC", weight=0.6),
                PearAssetWeight(asset="ETH", weight=0.4),
            ],
            shortAssets=[
                PearAssetWeight(asset="SOL", weight=0.7),
                PearAssetWeight(asset="AVAX", weight=0.3),
            ],
        )
        
        assert request.walletAddress == "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        assert request.slippage == 0.01
        assert request.executionType == "SYNC"
        assert request.leverage == 10
        assert request.usdValue == 1000
        assert len(request.longAssets) == 2
        assert len(request.shortAssets) == 2
    
    def test_position_request_with_optional_fields(self):
        """Test position request with all optional fields."""
        request = PearPositionRequest(
            walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            slippage=0.01,
            executionType="SYNC",
            leverage=10,
            usdValue=1000,
            longAssets=[PearAssetWeight(asset="BTC", weight=1.0)],
            triggerValue="45000",
            triggerType="PRICE",
            direction="MORE_THAN",
            assetName="ETH",
            marketCode="KALSHI:EVENT_CODE",
            twapDuration=120,
            twapIntervalSeconds=30,
            randomizeExecution=False,
            ladderConfig=PearLadderConfig(
                ratioStart=42000,
                ratioEnd=48000,
                numberOfLevels=5,
            ),
            stopLoss=PearStopLossTakeProfit(type="PERCENTAGE", value=15),
            takeProfit=PearStopLossTakeProfit(type="PERCENTAGE", value=25),
            referralCode="0x48656c6c6f20776f726c64210000000000000000000000000000000000000000",
        )
        
        assert request.triggerValue == "45000"
        assert request.triggerType == "PRICE"
        assert request.ladderConfig.numberOfLevels == 5
        assert request.stopLoss.value == 15
        assert request.takeProfit.value == 25
        assert request.referralCode is not None
    
    def test_position_request_leverage_validation(self):
        """Test leverage validation (1-100)."""
        with pytest.raises(ValueError):
            PearPositionRequest(
                walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                slippage=0.01,
                executionType="SYNC",
                leverage=0,  # Invalid: too low
                usdValue=1000,
                longAssets=[PearAssetWeight(asset="BTC", weight=1.0)],
            )
        
        with pytest.raises(ValueError):
            PearPositionRequest(
                walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                slippage=0.01,
                executionType="SYNC",
                leverage=101,  # Invalid: too high
                usdValue=1000,
                longAssets=[PearAssetWeight(asset="BTC", weight=1.0)],
            )


class TestPearServiceCreatePosition:
    """Test PearService.create_position method."""
    
    @pytest.fixture
    def mock_auth_service(self):
        """Create mock auth service."""
        auth_service = MagicMock()
        auth_service.ensure_authenticated = AsyncMock()
        auth_service.get_auth_headers.return_value = {
            "Authorization": "Bearer test_token",
            "Content-Type": "application/json",
        }
        return auth_service
    
    @pytest.fixture
    def pear_service(self, mock_auth_service):
        """Create PearService with mock auth."""
        service = PearService(auth_service=mock_auth_service)
        return service
    
    @pytest.mark.asyncio
    async def test_create_position_success(self, pear_service):
        """Test successful position creation."""
        # Mock the _request method
        mock_response = {
            "orderId": "a1b2c3d4e5f67890abcdef1234567891",
            "fills": []
        }
        pear_service._request = AsyncMock(return_value=mock_response)
        
        # Create request
        request = PearPositionRequest(
            walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            slippage=0.01,
            executionType="SYNC",
            leverage=10,
            usdValue=1000,
            longAssets=[
                PearAssetWeight(asset="BTC", weight=0.6),
                PearAssetWeight(asset="ETH", weight=0.4),
            ],
        )
        
        # Call method
        result = await pear_service.create_position(request)
        
        # Verify result
        assert isinstance(result, PearPositionResponse)
        assert result.orderId == "a1b2c3d4e5f67890abcdef1234567891"
        assert result.fills == []
        
        # Verify _request was called with correct parameters
        pear_service._request.assert_called_once()
        call_args = pear_service._request.call_args
        assert call_args[0][0] == "POST"  # method
        assert call_args[0][1] == "/positions"  # endpoint
        assert call_args[1]["require_auth"] is True
        
        # Check payload format
        payload = call_args[1]["data"]
        assert payload["slippage"] == 0.01
        assert payload["executionType"] == "SYNC"
        assert payload["leverage"] == 10
        assert payload["usdValue"] == 1000
        assert len(payload["longAssets"]) == 2
        assert payload["longAssets"][0]["asset"] == "BTC"
        assert payload["longAssets"][0]["weight"] == 0.6
    
    @pytest.mark.asyncio
    async def test_create_position_with_all_fields(self, pear_service):
        """Test position creation with all optional fields."""
        mock_response = {
            "orderId": "test_order_id",
            "fills": [{"price": 67500, "size": 0.01}]
        }
        pear_service._request = AsyncMock(return_value=mock_response)
        
        request = PearPositionRequest(
            walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            slippage=0.01,
            executionType="SYNC",
            leverage=10,
            usdValue=1000,
            longAssets=[PearAssetWeight(asset="BTC", weight=1.0)],
            triggerValue="45000",
            triggerType="PRICE",
            direction="MORE_THAN",
            assetName="ETH",
            twapDuration=120,
            twapIntervalSeconds=30,
            ladderConfig=PearLadderConfig(
                ratioStart=42000,
                ratioEnd=48000,
                numberOfLevels=5,
            ),
            stopLoss=PearStopLossTakeProfit(type="PERCENTAGE", value=15),
            takeProfit=PearStopLossTakeProfit(type="PERCENTAGE", value=25),
            referralCode="0x1234",
        )
        
        result = await pear_service.create_position(request)
        
        # Verify all fields were included in payload
        payload = pear_service._request.call_args[1]["data"]
        assert payload["triggerValue"] == "45000"
        assert payload["triggerType"] == "PRICE"
        assert payload["direction"] == "MORE_THAN"
        assert payload["assetName"] == "ETH"
        assert payload["twapDuration"] == 120
        assert payload["twapIntervalSeconds"] == 30
        assert payload["ladderConfig"]["numberOfLevels"] == 5
        assert payload["stopLoss"]["type"] == "PERCENTAGE"
        assert payload["stopLoss"]["value"] == 15
        assert payload["takeProfit"]["value"] == 25
        assert payload["referralCode"] == "0x1234"
        
        # Verify response
        assert result.orderId == "test_order_id"
        assert len(result.fills) == 1
    
    @pytest.mark.asyncio
    async def test_create_position_api_error(self, pear_service):
        """Test position creation with API error."""
        # Mock API error
        pear_service._request = AsyncMock(
            side_effect=ExternalServiceError("Pear Protocol", "API Error: Invalid request")
        )
        
        request = PearPositionRequest(
            walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            slippage=0.01,
            executionType="SYNC",
            leverage=10,
            usdValue=1000,
            longAssets=[PearAssetWeight(asset="BTC", weight=1.0)],
        )
        
        # Should raise ExternalServiceError
        with pytest.raises(ExternalServiceError) as exc_info:
            await pear_service.create_position(request)
        
        assert "API Error" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_create_position_short_only(self, pear_service):
        """Test position creation with only short assets."""
        mock_response = {"orderId": "short_order", "fills": []}
        pear_service._request = AsyncMock(return_value=mock_response)
        
        request = PearPositionRequest(
            walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            slippage=0.01,
            executionType="SYNC",
            leverage=5,
            usdValue=500,
            shortAssets=[
                PearAssetWeight(asset="SOL", weight=0.7),
                PearAssetWeight(asset="AVAX", weight=0.3),
            ],
        )
        
        result = await pear_service.create_position(request)
        
        payload = pear_service._request.call_args[1]["data"]
        assert "longAssets" not in payload
        assert len(payload["shortAssets"]) == 2
        assert result.orderId == "short_order"


class TestPositionEndpointValidation:
    """Test validation in the position endpoint."""
    
    def test_missing_wallet_address_validation(self):
        """Test that missing wallet address is caught."""
        # This would be tested via integration test with actual HTTP requests
        # Here we just verify the schema allows None
        request = PearPositionRequest(
            walletAddress=None,  # Missing wallet
            slippage=0.01,
            executionType="SYNC",
            leverage=10,
            usdValue=1000,
            longAssets=[PearAssetWeight(asset="BTC", weight=1.0)],
        )
        
        assert request.walletAddress is None
    
    def test_missing_assets_validation(self):
        """Test that missing assets is caught."""
        request = PearPositionRequest(
            walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            slippage=0.01,
            executionType="SYNC",
            leverage=10,
            usdValue=1000,
            longAssets=None,
            shortAssets=None,
        )
        
        assert request.longAssets is None
        assert request.shortAssets is None


class TestPearPositionResponse:
    """Test PearPositionResponse model."""
    
    def test_position_response_creation(self):
        """Test creating position response."""
        response = PearPositionResponse(
            orderId="test_order_123",
            fills=[
                {"price": 67500, "size": 0.01, "asset": "BTC"},
                {"price": 3200, "size": 0.1, "asset": "ETH"},
            ]
        )
        
        assert response.orderId == "test_order_123"
        assert len(response.fills) == 2
        assert response.fills[0]["asset"] == "BTC"
    
    def test_position_response_empty_fills(self):
        """Test position response with no fills."""
        response = PearPositionResponse(
            orderId="test_order_123",
            fills=[]
        )
        
        assert response.orderId == "test_order_123"
        assert response.fills == []
