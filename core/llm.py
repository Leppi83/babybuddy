"""
Provider-agnostic LLM streaming client.
Yields plain text chunks. SSE formatting is the caller's responsibility.
"""

import json
import urllib.request
import urllib.error
from typing import Generator


class LLMError(Exception):
    """Raised for configuration errors (bad key, unreachable host)."""

    pass


def generate_summary(
    provider: str,
    model: str,
    base_url: str,
    api_key: str,
    context: str,
) -> Generator[str, None, None]:
    """
    Yields raw text chunks. Raises LLMError on configuration/connection errors.
    """
    if provider == "none":
        raise LLMError("No AI provider configured.")

    if provider == "ollama":
        yield from _ollama_stream(model, base_url, context)
    elif provider == "openai":
        yield from _openai_stream(model, api_key, context)
    elif provider == "anthropic":
        yield from _anthropic_stream(model, api_key, context)
    else:
        raise LLMError(f"Unknown provider: {provider}")


def _ollama_stream(
    model: str, base_url: str, context: str
) -> Generator[str, None, None]:
    base_url = (base_url or "http://localhost:11434").rstrip("/")
    url = f"{base_url}/api/generate"
    payload = json.dumps({"model": model, "prompt": context, "stream": True}).encode()
    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            for line in resp:
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                    chunk = obj.get("response", "")
                    if chunk:
                        yield chunk
                    if obj.get("done"):
                        return
                except json.JSONDecodeError:
                    continue
    except urllib.error.URLError as e:
        raise LLMError(f"Cannot reach Ollama at {base_url}: {e}") from e


def _openai_stream(
    model: str, api_key: str, context: str
) -> Generator[str, None, None]:
    if not api_key:
        raise LLMError("OpenAI API key is not configured.")
    url = "https://api.openai.com/v1/chat/completions"
    payload = json.dumps(
        {
            "model": model or "gpt-4o-mini",
            "messages": [{"role": "user", "content": context}],
            "stream": True,
        }
    ).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    return
                try:
                    obj = json.loads(data)
                    chunk = obj["choices"][0]["delta"].get("content", "")
                    if chunk:
                        yield chunk
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
    except urllib.error.HTTPError as e:
        raise LLMError(f"OpenAI error {e.code}: {e.reason}") from e
    except urllib.error.URLError as e:
        raise LLMError(f"Cannot reach OpenAI: {e}") from e


def _anthropic_stream(
    model: str, api_key: str, context: str
) -> Generator[str, None, None]:
    if not api_key:
        raise LLMError("Anthropic API key is not configured.")
    url = "https://api.anthropic.com/v1/messages"
    payload = json.dumps(
        {
            "model": model or "claude-haiku-4-5-20251001",
            "max_tokens": 1024,
            "stream": True,
            "messages": [{"role": "user", "content": context}],
        }
    ).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line.startswith("data: "):
                    continue
                try:
                    obj = json.loads(line[6:])
                    if obj.get("type") == "content_block_delta":
                        chunk = obj.get("delta", {}).get("text", "")
                        if chunk:
                            yield chunk
                except (json.JSONDecodeError, KeyError):
                    continue
    except urllib.error.HTTPError as e:
        raise LLMError(f"Anthropic error {e.code}: {e.reason}") from e
    except urllib.error.URLError as e:
        raise LLMError(f"Cannot reach Anthropic: {e}") from e
