"""Trading instruments API endpoints."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.trade.schemas import Instrument, InstrumentsListResponse
from app.trade.services.hyperliquid_service import (
    HyperliquidService,
    get_hyperliquid_service,
)
from app.trade.services.pear_service import PearService, get_pear_service

router = APIRouter()

# Service dependencies
HyperliquidServiceDep = Annotated[HyperliquidService, Depends(get_hyperliquid_service)]
PearServiceDep = Annotated[PearService, Depends(get_pear_service)]

# Simple in-memory cache for instruments
_instruments_cache: dict[str, tuple[list[Instrument], datetime]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


def _get_cached_instruments(source: str) -> list[Instrument] | None:
    """Get cached instruments if still valid."""
    if source in _instruments_cache:
        instruments, cached_at = _instruments_cache[source]
        age = (datetime.utcnow() - cached_at).total_seconds()
        if age < CACHE_TTL_SECONDS:
            return instruments
    return None


def _set_cached_instruments(source: str, instruments: list[Instrument]) -> None:
    """Cache instruments."""
    _instruments_cache[source] = (instruments, datetime.utcnow())


@router.get("", response_model=InstrumentsListResponse)
async def list_all_instruments(
    hyperliquid_service: HyperliquidServiceDep,
    pear_service: PearServiceDep,
    source: str | None = Query(
        None,
        description="Filter by source: 'hyperliquid' or 'pear'",
    ),
) -> InstrumentsListResponse:
    """
    List all tradable instruments.

    Returns instruments from both Hyperliquid and Pear Protocol
    unless filtered by source. Results are cached for performance.
    """
    instruments: list[Instrument] = []
    cached_at: datetime | None = None

    if source is None or source == "hyperliquid":
        # Check cache first
        cached = _get_cached_instruments("hyperliquid")
        if cached:
            instruments.extend(cached)
            cached_at = _instruments_cache["hyperliquid"][1]
        else:
            hl_instruments = await hyperliquid_service.get_instruments()
            _set_cached_instruments("hyperliquid", hl_instruments)
            instruments.extend(hl_instruments)

    if source is None or source == "pear":
        # Check cache first
        cached = _get_cached_instruments("pear")
        if cached:
            instruments.extend(cached)
            if cached_at is None:
                cached_at = _instruments_cache["pear"][1]
        else:
            pear_instruments = await pear_service.get_instruments()
            _set_cached_instruments("pear", pear_instruments)
            instruments.extend(pear_instruments)

    return InstrumentsListResponse(
        instruments=instruments,
        count=len(instruments),
        cached_at=cached_at,
    )


@router.get("/hyperliquid", response_model=InstrumentsListResponse)
async def list_hyperliquid_instruments(
    service: HyperliquidServiceDep,
) -> InstrumentsListResponse:
    """
    List tradable instruments from Hyperliquid.

    Returns only Hyperliquid instruments with caching.
    """
    cached = _get_cached_instruments("hyperliquid")
    if cached:
        return InstrumentsListResponse(
            instruments=cached,
            count=len(cached),
            cached_at=_instruments_cache["hyperliquid"][1],
        )

    instruments = await service.get_instruments()
    _set_cached_instruments("hyperliquid", instruments)

    return InstrumentsListResponse(
        instruments=instruments,
        count=len(instruments),
        cached_at=None,
    )


@router.get("/pear", response_model=InstrumentsListResponse)
async def list_pear_instruments(
    service: PearServiceDep,
) -> InstrumentsListResponse:
    """
    List tradable instruments from Pear Protocol.

    Returns only Pear Protocol instruments with caching.
    """
    cached = _get_cached_instruments("pear")
    if cached:
        return InstrumentsListResponse(
            instruments=cached,
            count=len(cached),
            cached_at=_instruments_cache["pear"][1],
        )

    instruments = await service.get_instruments()
    _set_cached_instruments("pear", instruments)

    return InstrumentsListResponse(
        instruments=instruments,
        count=len(instruments),
        cached_at=None,
    )
