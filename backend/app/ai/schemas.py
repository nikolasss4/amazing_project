"""Pydantic schemas for AI module."""

from enum import Enum

from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    """Chat message role."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# ============================================================================
# Chat Schemas
# ============================================================================


class ChatMessage(BaseModel):
    """Chat message."""

    role: MessageRole
    content: str


class ChatRequest(BaseModel):
    """Chat request."""

    message: str = Field(..., min_length=1, max_length=4000)
    conversation_history: list[ChatMessage] = Field(default_factory=list)
    context: str | None = Field(
        None,
        description="Additional context like current screen or trading state",
    )


class SuggestedAction(BaseModel):
    """Suggested action from AI response."""

    label: str
    action_type: str  # "navigate", "execute", "learn_more"
    payload: dict = {}


class ChatResponse(BaseModel):
    """Chat response."""

    message: str
    suggested_actions: list[SuggestedAction] = []
    tokens_used: int = 0


# ============================================================================
# Voice Schemas
# ============================================================================


class VoiceRequest(BaseModel):
    """Voice synthesis request."""

    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: str | None = Field(None, description="ElevenLabs voice ID")


class VoiceResponse(BaseModel):
    """Voice synthesis response."""

    audio_base64: str
    content_type: str = "audio/mpeg"
    duration_seconds: float | None = None


# ============================================================================
# UI Help Schemas
# ============================================================================


class UIHelpContext(BaseModel):
    """Context for UI help requests."""

    screen_name: str
    component: str | None = None
    user_action: str | None = None
    error_message: str | None = None


class UIHelpRequest(BaseModel):
    """UI help request."""

    question: str = Field(..., min_length=1, max_length=1000)
    context: UIHelpContext


class UIHelpResponse(BaseModel):
    """UI help response."""

    message: str
    steps: list[str] = []
    related_topics: list[str] = []
    audio_url: str | None = None
