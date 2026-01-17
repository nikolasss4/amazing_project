"""ElevenLabs service for text-to-speech."""

import base64
from functools import lru_cache

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalServiceError
from app.core.logging import get_logger
from app.ai.schemas import VoiceRequest, VoiceResponse

logger = get_logger(__name__)


class ElevenLabsService:
    """
    ElevenLabs service for text-to-speech synthesis.

    Provides methods for converting text to natural-sounding speech.
    """

    BASE_URL = "https://api.elevenlabs.io/v1"

    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.default_voice_id = settings.ELEVENLABS_VOICE_ID
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers={
                    "xi-api-key": self.api_key,
                    "Content-Type": "application/json",
                },
                timeout=60.0,  # TTS can take time
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def synthesize(self, request: VoiceRequest) -> VoiceResponse:
        """
        Synthesize speech from text.

        Args:
            request: Voice request with text and optional voice ID

        Returns:
            Voice response with base64 encoded audio

        Raises:
            ExternalServiceError: If synthesis fails
        """
        voice_id = request.voice_id or self.default_voice_id
        if not voice_id:
            raise ExternalServiceError(
                "ElevenLabs",
                "No voice ID configured. Set ELEVENLABS_VOICE_ID or provide voice_id.",
            )

        logger.info(
            "Synthesizing speech",
            text_length=len(request.text),
            voice_id=voice_id,
        )

        try:
            client = await self._get_client()

            response = await client.post(
                f"/text-to-speech/{voice_id}",
                json={
                    "text": request.text,
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                },
            )

            if response.status_code != 200:
                error_detail = response.text
                logger.error(
                    "ElevenLabs API error",
                    status_code=response.status_code,
                    detail=error_detail,
                )
                raise ExternalServiceError("ElevenLabs", f"API error: {error_detail}")

            # Get audio bytes
            audio_bytes = response.content

            # Encode as base64
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

            # Estimate duration (rough calculation based on text length)
            # Average speaking rate is ~150 words per minute
            word_count = len(request.text.split())
            estimated_duration = (word_count / 150) * 60

            return VoiceResponse(
                audio_base64=audio_base64,
                content_type="audio/mpeg",
                duration_seconds=estimated_duration,
            )

        except httpx.RequestError as e:
            logger.error("ElevenLabs request failed", error=str(e))
            raise ExternalServiceError("ElevenLabs", str(e))

    async def get_voices(self) -> list[dict]:
        """
        Get available voices.

        Returns:
            List of available voice configurations
        """
        try:
            client = await self._get_client()
            response = await client.get("/voices")

            if response.status_code != 200:
                raise ExternalServiceError("ElevenLabs", "Failed to fetch voices")

            data = response.json()
            return data.get("voices", [])

        except httpx.RequestError as e:
            logger.error("Failed to fetch voices", error=str(e))
            raise ExternalServiceError("ElevenLabs", str(e))


@lru_cache
def get_elevenlabs_service() -> ElevenLabsService:
    """Get cached ElevenLabs service instance."""
    return ElevenLabsService()
