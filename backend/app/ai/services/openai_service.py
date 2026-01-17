"""OpenAI service for chat completions."""

import json
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.core.config import settings
from app.core.exceptions import ExternalServiceError
from app.core.logging import get_logger
from app.ai.schemas import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    MessageRole,
    SuggestedAction,
    UIHelpContext,
    UIHelpRequest,
    UIHelpResponse,
)

logger = get_logger(__name__)

# Load prompts from files
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def _load_prompt(name: str) -> str:
    """Load a prompt template from file."""
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if prompt_file.exists():
        return prompt_file.read_text()
    return ""


class OpenAIService:
    """
    OpenAI service for chat completions.

    Provides methods for general chat, trading assistance,
    and UI help functionality.
    """

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
        self._client: AsyncOpenAI | None = None

    def _get_client(self) -> AsyncOpenAI:
        """Get or create OpenAI client."""
        if self._client is None:
            if not self.api_key:
                logger.warning("OpenAI API key not configured")
            self._client = AsyncOpenAI(api_key=self.api_key)
        return self._client

    async def chat(self, request: ChatRequest) -> ChatResponse:
        """
        Generate a chat response.

        Args:
            request: Chat request with message and history

        Returns:
            Chat response with message and suggested actions
        """
        logger.info("Processing chat request", message_length=len(request.message))

        try:
            client = self._get_client()

            # Build messages
            messages = [
                {"role": "system", "content": _load_prompt("trading_assistant") or self._default_system_prompt()},
            ]

            # Add conversation history
            for msg in request.conversation_history[-10:]:  # Limit history
                messages.append({
                    "role": msg.role.value,
                    "content": msg.content,
                })

            # Add context if provided
            if request.context:
                messages.append({
                    "role": "system",
                    "content": f"Current context: {request.context}",
                })

            # Add user message
            messages.append({
                "role": "user",
                "content": request.message,
            })

            # Call OpenAI
            response = await client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1000,
                temperature=0.7,
            )

            content = response.choices[0].message.content or ""
            tokens_used = response.usage.total_tokens if response.usage else 0

            # Parse suggested actions if present
            suggested_actions = self._parse_suggested_actions(content)

            return ChatResponse(
                message=content,
                suggested_actions=suggested_actions,
                tokens_used=tokens_used,
            )

        except Exception as e:
            logger.error("OpenAI chat failed", error=str(e))
            raise ExternalServiceError("OpenAI", str(e))

    async def ui_help(self, request: UIHelpRequest) -> UIHelpResponse:
        """
        Generate UI-focused help response.

        Args:
            request: UI help request with context

        Returns:
            UI help response with steps and related topics
        """
        logger.info(
            "Processing UI help request",
            screen=request.context.screen_name,
            component=request.context.component,
        )

        try:
            client = self._get_client()

            # Build system prompt for UI help
            system_prompt = _load_prompt("ui_help") or self._default_ui_help_prompt()

            # Build context message
            context_parts = [
                f"Screen: {request.context.screen_name}",
            ]
            if request.context.component:
                context_parts.append(f"Component: {request.context.component}")
            if request.context.user_action:
                context_parts.append(f"User action: {request.context.user_action}")
            if request.context.error_message:
                context_parts.append(f"Error: {request.context.error_message}")

            context_str = "\n".join(context_parts)

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "system", "content": f"UI Context:\n{context_str}"},
                {"role": "user", "content": request.question},
            ]

            response = await client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=500,
                temperature=0.5,
            )

            content = response.choices[0].message.content or ""

            # TODO: Parse structured response for steps and related topics

            return UIHelpResponse(
                message=content,
                steps=[],  # TODO: Extract numbered steps from response
                related_topics=[],  # TODO: Extract related topics
            )

        except Exception as e:
            logger.error("OpenAI UI help failed", error=str(e))
            raise ExternalServiceError("OpenAI", str(e))

    def _default_system_prompt(self) -> str:
        """Default system prompt for trading assistant."""
        return """You are an AI trading assistant for a gamified trading application.

Your role is to:
- Help users understand trading concepts
- Explain market dynamics and trading strategies
- Guide users through the app's features
- Provide educational content about cryptocurrency trading
- Answer questions about Hyperliquid and Pear Protocol

Guidelines:
- Be concise and clear
- Use simple language, avoid jargon unless explained
- Be encouraging and supportive
- Never provide financial advice or specific trade recommendations
- Focus on education and feature guidance

When appropriate, suggest actions the user can take in the app."""

    def _default_ui_help_prompt(self) -> str:
        """Default system prompt for UI help."""
        return """You are a helpful UI assistant for a trading application.

Your role is to:
- Help users navigate the app
- Explain what each screen and component does
- Guide users through common tasks
- Troubleshoot UI issues

Guidelines:
- Provide step-by-step instructions when helpful
- Be concise and direct
- Reference specific UI elements by name
- Suggest related features they might find useful"""

    def _parse_suggested_actions(self, content: str) -> list[SuggestedAction]:
        """Parse suggested actions from response content."""
        # TODO: Implement action parsing from structured response
        # Could use function calling or structured output format
        return []


@lru_cache
def get_openai_service() -> OpenAIService:
    """Get cached OpenAI service instance."""
    return OpenAIService()
