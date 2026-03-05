import datetime
import json
import os
import re
from urllib import error, request

from django.utils import timezone


def _env_enabled():
    return os.environ.get("OLLAMA_ENABLED") == "1"


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
    return (
        "You are assisting with baby sleep logs. "
        "Write at most 3 short sentences explaining the existing recommendation. "
        "Do not change any times, do not give medical advice.\n\n"
        "Nap:\n"
        f"- status: {nap.get('status')}\n"
        f"- earliest: {_format_dt(nap.get('earliest'))}\n"
        f"- ideal: {_format_dt(nap.get('ideal'))}\n"
        f"- latest: {_format_dt(nap.get('latest'))}\n"
        f"- source: {nap.get('source')}\n\n"
        "Bedtime:\n"
        f"- status: {bedtime.get('status')}\n"
        f"- target: {_format_dt(bedtime.get('target_bedtime'))}\n"
        f"- earliest: {_format_dt(bedtime.get('earliest'))}\n"
        f"- ideal: {_format_dt(bedtime.get('ideal'))}\n"
        f"- latest: {_format_dt(bedtime.get('latest'))}\n"
        f"- source: {bedtime.get('source')}\n"
        f"- reason: {bedtime.get('reason')}\n"
    )


def explain_sleep_recommendations(bundle):
    if not _env_enabled():
        return None

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

    try:
        with request.urlopen(req, timeout=timeout_s) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (
        error.URLError,
        TimeoutError,
        OSError,
        ValueError,
        json.JSONDecodeError,
    ):
        return None

    text = data.get("response")
    if not text:
        return None
    return _truncate_to_three_sentences(text)
