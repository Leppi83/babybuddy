import json
import os
import re
from urllib import error, request

from django.utils import timezone


def _env_enabled():
    return (
        os.environ.get("AI_ENABLED") == "1" or os.environ.get("OLLAMA_ENABLED") == "1"
    )


def ai_enabled():
    return _env_enabled()


def _use_openai_compat():
    return os.environ.get("AI_ENABLED") == "1"


def _format_dt(value):
    if not value:
        return "-"
    return timezone.localtime(value).strftime("%Y-%m-%d %H:%M")


def _truncate_to_three_sentences(text):
    chunks = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks = [chunk.strip() for chunk in chunks if chunk.strip()]
    return " ".join(chunks[:3]).strip() or None


def _format_time_only(value):
    if not value:
        return "-"
    return timezone.localtime(value).strftime("%H:%M")


_LOCALE_TO_LANGUAGE = {
    "de": "German",
    "fr": "French",
    "es": "Spanish",
    "it": "Italian",
    "nl": "Dutch",
    "pt": "Portuguese",
    "pt-br": "Portuguese",
    "pl": "Polish",
    "ru": "Russian",
    "sv": "Swedish",
    "nb": "Norwegian",
    "da": "Danish",
    "fi": "Finnish",
    "tr": "Turkish",
    "uk": "Ukrainian",
    "ja": "Japanese",
    "zh": "Chinese",
    "he": "Hebrew",
    "hu": "Hungarian",
    "hr": "Croatian",
    "ca": "Catalan",
    "cs": "Czech",
    "sr": "Serbian",
}


def _build_prompt(bundle):
    child_name = bundle.get("child", {}).get("name", "Baby")
    as_of = bundle.get("as_of")
    local_hour = timezone.localtime(as_of).hour if as_of else timezone.localtime().hour
    locale = bundle.get("locale", "en").lower().replace("_", "-")
    language = _LOCALE_TO_LANGUAGE.get(
        locale, _LOCALE_TO_LANGUAGE.get(locale.split("-")[0])
    )
    lang_instruction = f" Respond in {language}." if language else ""

    if local_hour < 16:
        nap = bundle.get("nap", {})
        return (
            f"You are helping parents of {child_name} know when to put the baby down for a nap. "
            f"Write 2 short sentences. Describe the nap window as a range from earliest to latest. "
            f"Do not mention exact times, only ranges. Do not give medical advice.{lang_instruction}\n\n"
            f"Nap window: {_format_time_only(nap.get('earliest'))} – {_format_time_only(nap.get('latest'))}\n"
            f"Status: {nap.get('status')}\n"
            f"Wake window: {nap.get('wake_window_min_minutes')}–{nap.get('wake_window_max_minutes')} min\n"
        )
    else:
        bedtime = bundle.get("bedtime", {})
        return (
            f"You are helping parents of {child_name} know when to put the baby to bed for the night. "
            f"Write 2 short sentences. Describe the bedtime window as a range from earliest to latest. "
            f"Do not mention exact times, only ranges. Do not give medical advice.{lang_instruction}\n\n"
            f"Bedtime window: {_format_time_only(bedtime.get('earliest'))} – {_format_time_only(bedtime.get('latest'))}\n"
            f"Status: {bedtime.get('status')}\n"
            f"Reason: {bedtime.get('reason')}\n"
        )


def _call_openai_compat(bundle):
    """Call OpenAI-compatible API (e.g. Open WebUI)."""
    base_url = os.environ.get("AI_URL", "http://localhost:11434").rstrip("/")
    model = os.environ.get("AI_MODEL", "mistral:7b-instruct")
    timeout_s = float(os.environ.get("AI_TIMEOUT_S", "10"))
    api_key = os.environ.get("AI_API_KEY", "")

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a baby sleep advisor. Be concise, warm, and practical. "
                    "Always describe time as ranges (e.g. 'between X and Y'), never as exact times. "
                    "Never give medical advice."
                ),
            },
            {
                "role": "user",
                "content": _build_prompt(bundle),
            },
        ],
        "temperature": 0.3,
        "max_tokens": 120,
    }
    body = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = request.Request(
        url=f"{base_url}/api/chat/completions",
        data=body,
        headers=headers,
        method="POST",
    )

    with request.urlopen(req, timeout=timeout_s) as response:
        data = json.loads(response.read().decode("utf-8"))

    return data.get("choices", [{}])[0].get("message", {}).get("content") or None


def _call_ollama(bundle):
    """Call Ollama native API."""
    base_url = os.environ.get("OLLAMA_URL", "http://ollama:11434").rstrip("/")
    model = os.environ.get("OLLAMA_MODEL", "llama3.1:8b-instruct")
    timeout_s = float(os.environ.get("OLLAMA_TIMEOUT_S", "2.5"))

    payload = {
        "model": model,
        "prompt": _build_prompt(bundle),
        "stream": False,
        "options": {"temperature": 0.2},
    }
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url=f"{base_url}/api/generate",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with request.urlopen(req, timeout=timeout_s) as response:
        data = json.loads(response.read().decode("utf-8"))

    return data.get("response") or None


def explain_sleep_recommendations(bundle):
    if not _env_enabled():
        return None

    try:
        if _use_openai_compat():
            text = _call_openai_compat(bundle)
        else:
            text = _call_ollama(bundle)
    except (
        error.URLError,
        TimeoutError,
        OSError,
        ValueError,
        json.JSONDecodeError,
        KeyError,
        IndexError,
    ):
        return None

    if not text:
        return None
    return _truncate_to_three_sentences(text)
