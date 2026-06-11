"""Anthropic Claude API client wrapper."""

from anthropic import Anthropic


def get_client(api_key: str) -> Anthropic:
    """Create an Anthropic client."""
    return Anthropic(api_key=api_key)


async def chat(
    client: Anthropic,
    system_prompt: str,
    user_message: str,
    model: str = "claude-sonnet-4-20250514",
    max_tokens: int = 1024,
) -> str:
    """Send a chat message to Claude and return the text response.

    Args:
        client: Anthropic client instance
        system_prompt: System prompt for context
        user_message: User message content
        model: Claude model to use
        max_tokens: Maximum response tokens

    Returns:
        Claude's text response
    """
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


async def chat_with_image(
    client: Anthropic,
    system_prompt: str,
    user_message: str,
    image_data: bytes,
    image_media_type: str = "image/png",
    model: str = "claude-sonnet-4-20250514",
    max_tokens: int = 1024,
) -> str:
    """Send a chat message with an image to Claude (vision).

    Args:
        client: Anthropic client instance
        system_prompt: System prompt
        user_message: Text part of user message
        image_data: Image bytes
        image_media_type: MIME type of the image
        model: Claude model to use
        max_tokens: Maximum response tokens

    Returns:
        Claude's text response
    """
    import base64

    encoded_image = base64.standard_b64encode(image_data).decode("utf-8")

    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": image_media_type,
                            "data": encoded_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": user_message,
                    },
                ],
            }
        ],
    )
    return response.content[0].text
