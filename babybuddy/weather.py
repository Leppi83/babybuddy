"""
Weather + celestial helpers for the activity dial.

- Sunrise/sunset via `astral` (pure-Python solar calculations)
- Weather via Open-Meteo free API (no key needed)
- Client-side geolocation saved to Settings model
- Fallback: sunny + half-moon if no location or API unavailable
"""

import datetime
import logging
import urllib.request
import json

from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

# ── Defaults (used when location/weather unavailable) ────────────
DEFAULT_SUNRISE = 6.0  # 06:00
DEFAULT_SUNSET = 18.0  # 18:00
DEFAULT_WEATHER = "sunny"

# ── Weather code → scenario mapping (WMO codes from Open-Meteo) ──
# https://open-meteo.com/en/docs → weathercode
_WMO_MAP = {
    0: "sunny",    # Clear sky
    1: "sunny",    # Mainly clear
    2: "cloudy",   # Partly cloudy
    3: "cloudy",   # Overcast
    45: "cloudy",  # Fog
    48: "cloudy",  # Depositing rime fog
    51: "rainy",   # Light drizzle
    53: "rainy",   # Moderate drizzle
    55: "rainy",   # Dense drizzle
    56: "rainy",   # Light freezing drizzle
    57: "rainy",   # Dense freezing drizzle
    61: "rainy",   # Slight rain
    63: "rainy",   # Moderate rain
    65: "rainy",   # Heavy rain
    66: "rainy",   # Light freezing rain
    67: "rainy",   # Heavy freezing rain
    71: "snowy",   # Slight snowfall
    73: "snowy",   # Moderate snowfall
    75: "snowy",   # Heavy snowfall
    77: "snowy",   # Snow grains
    80: "rainy",   # Slight rain showers
    81: "rainy",   # Moderate rain showers
    82: "rainy",   # Violent rain showers
    85: "snowy",   # Slight snow showers
    86: "snowy",   # Heavy snow showers
    95: "rainy",   # Thunderstorm
    96: "rainy",   # Thunderstorm with slight hail
    99: "rainy",   # Thunderstorm with heavy hail
}


def get_sunrise_sunset(lat, lng, date=None):
    """
    Compute sunrise/sunset as fractional hours using astral.
    Returns (sunrise_hour, sunset_hour) or defaults on failure.
    """
    try:
        from astral import LocationInfo
        from astral.sun import sun

        loc = LocationInfo(latitude=lat, longitude=lng)
        if date is None:
            date = datetime.date.today()
        s = sun(loc.observer, date=date)
        sunrise_h = s["sunrise"].hour + s["sunrise"].minute / 60
        sunset_h = s["sunset"].hour + s["sunset"].minute / 60
        return (sunrise_h, sunset_h)
    except Exception:
        logger.debug("astral sunrise/sunset failed, using defaults", exc_info=True)
        return (DEFAULT_SUNRISE, DEFAULT_SUNSET)


def get_weather(lat, lng):
    """
    Fetch current weather from Open-Meteo API.
    Uses Django cache (30 min TTL). Returns one of: sunny, cloudy, rainy, snowy.
    """
    cache_key = f"weather_{lat:.2f}_{lng:.2f}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&current_weather=true"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "BabyBuddy/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
        code = data.get("current_weather", {}).get("weathercode", 0)
        weather = _WMO_MAP.get(code, "sunny")
        cache.set(cache_key, weather, 1800)  # 30 min
        return weather
    except Exception:
        logger.debug("Open-Meteo fetch failed, using default", exc_info=True)
        return DEFAULT_WEATHER


def get_celestial_data(user_settings):
    """
    Build the celestial + weather data dict for the dashboard bootstrap.
    Uses location from Settings if available (< 24h old), otherwise defaults.

    Returns dict with: sunriseHour, sunsetHour, weatherCondition, hasLocation
    """
    has_location = False
    lat = lng = None

    if (
        user_settings
        and user_settings.latitude is not None
        and user_settings.longitude is not None
    ):
        # Check if location is fresh enough (< 24 hours)
        if user_settings.location_updated_at:
            age = timezone.now() - user_settings.location_updated_at
            if age < datetime.timedelta(hours=24):
                lat = user_settings.latitude
                lng = user_settings.longitude
                has_location = True

        # If location_updated_at is missing but coords exist, use them anyway
        if not has_location and user_settings.latitude is not None:
            lat = user_settings.latitude
            lng = user_settings.longitude
            has_location = True

    if has_location:
        sunrise, sunset = get_sunrise_sunset(lat, lng)
        weather = get_weather(lat, lng)
    else:
        sunrise = DEFAULT_SUNRISE
        sunset = DEFAULT_SUNSET
        weather = DEFAULT_WEATHER

    return {
        "sunriseHour": round(sunrise, 2),
        "sunsetHour": round(sunset, 2),
        "weatherCondition": weather,
        "hasLocation": has_location,
    }


def save_location(user_settings, lat, lng):
    """
    Save client-provided geolocation to user settings.
    """
    user_settings.latitude = lat
    user_settings.longitude = lng
    user_settings.location_updated_at = timezone.now()
    user_settings.save(update_fields=["latitude", "longitude", "location_updated_at"])
