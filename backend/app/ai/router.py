"""AI assistant API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.security import AuthenticatedUser
from app.ai.schemas import (
    ChatRequest,
    ChatResponse,
    UIHelpRequest,
    UIHelpResponse,
    VoiceRequest,
    VoiceResponse,
)
from app.ai.services.openai_service import OpenAIService, get_openai_service
from app.ai.services.elevenlabs_service import ElevenLabsService, get_elevenlabs_service

router = APIRouter()

# Service dependencies
OpenAIServiceDep = Annotated[OpenAIService, Depends(get_openai_service)]
ElevenLabsServiceDep = Annotated[ElevenLabsService, Depends(get_elevenlabs_service)]


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: AuthenticatedUser,
    service: OpenAIServiceDep,
) -> ChatResponse:
    """
    Chat with the AI trading assistant.

    Send a message and receive an AI-generated response with
    optional suggested actions.
    """
    return await service.chat(request)


@router.post("/voice", response_model=VoiceResponse)
async def synthesize_voice(
    request: VoiceRequest,
    user: AuthenticatedUser,
    service: ElevenLabsServiceDep,
) -> VoiceResponse:
    """
    Convert text to speech using ElevenLabs.

    Returns base64 encoded audio data.
    """
    return await service.synthesize(request)


@router.post("/voice/audio")
async def synthesize_voice_audio(
    request: VoiceRequest,
    user: AuthenticatedUser,
    service: ElevenLabsServiceDep,
) -> Response:
    """
    Convert text to speech and return audio directly.

    Returns the audio file as a streaming response.
    """
    import base64

    voice_response = await service.synthesize(request)
    audio_bytes = base64.b64decode(voice_response.audio_base64)

    return Response(
        content=audio_bytes,
        media_type=voice_response.content_type,
        headers={
            "Content-Disposition": "attachment; filename=speech.mp3",
        },
    )


@router.post("/ui-help", response_model=UIHelpResponse)
async def ui_help(
    request: UIHelpRequest,
    user: AuthenticatedUser,
    service: OpenAIServiceDep,
) -> UIHelpResponse:
    """
    Get context-aware UI help.

    Provide your current screen context and question to
    receive targeted assistance.
    """
    return await service.ui_help(request)


@router.get("/voices")
async def list_voices(
    user: AuthenticatedUser,
    service: ElevenLabsServiceDep,
) -> list[dict]:
    """
    List available ElevenLabs voices.

    Returns available voice configurations for text-to-speech.
    """
    return await service.get_voices()
