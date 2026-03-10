import json
import os
import re
from urllib import error, request

from django.utils import timezone


def _env_enabled():
    return (
        os.environ.get("AI_ENABLED") == "1" or os.environ.get("OLLAMA_ENABLED") == "1"
    )


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


def _build_prompt(bundle):
    nap = bundle.get("nap", {})
    bedtime = bundle.get("bedtime", {})
    age_days = bundle.get("age_days")
    if age_days is not None:
        weeks = age_days // 7
        days = age_days % 7
        age_str = f"{age_days} days ({weeks} weeks, {days} days)"
    else:
        age_str = "unknown"

    return (
        "You are assisting with baby sleep logs. "
        "Write at most 3 short sentences explaining the existing recommendation. "
        "Do not change any times, do not give medical advice.\n\n"
        f"Baby age: {age_str}\n\n"
        "Nap recommendation:\n"
        f"- status: {nap.get('status')}\n"
        f"- earliest: {_format_dt(nap.get('earliest'))}\n"
        f"- ideal: {_format_dt(nap.get('ideal'))}\n"
        f"- latest: {_format_dt(nap.get('latest'))}\n"
        f"- wake window: {nap.get('wake_window_min_minutes')}-{nap.get('wake_window_max_minutes')} min\n"
        f"- source: {nap.get('source')}\n\n"
        "Bedtime recommendation:\n"
        f"- status: {bedtime.get('status')}\n"
        f"- target: {_format_dt(bedtime.get('target_bedtime'))}\n"
        f"- earliest: {_format_dt(bedtime.get('earliest'))}\n"
        f"- ideal: {_format_dt(bedtime.get('ideal'))}\n"
        f"- latest: {_format_dt(bedtime.get('latest'))}\n"
        f"- source: {bedtime.get('source')}\n"
        f"- reason: {bedtime.get('reason')}\n"
    )


def _call_openai_compat(bundle):
    """Call OpenAI-compatible API (e.g. Open WebUI)."""
    base_url = os.environ.get("AI_URL", "http://192.168.2.198:3000").rstrip("/")
    model = os.environ.get("AI_MODEL", "gpt-4o-mini")
    timeout_s = float(os.environ.get("AI_TIMEOUT_S", "10"))
    api_key = os.environ.get("AI_API_KEY", "")

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a baby sleep advisor helping parents understand sleep "
                    "recommendations. Be concise, warm, and practical. "
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
