
import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta, timezone

LOCATIONS = {
    "Trichy": {"latitude": 10.7905, "longitude": 78.7047},
    "Thanjavur": {"latitude": 10.7870, "longitude": 79.1378},
    "Salem": {"latitude": 11.6643, "longitude": 78.1460},
}


def get_weather(name, coordinates):
    """Fetch weather-model data for a location."""
    params = {
        "latitude": coordinates["latitude"],
        "longitude": coordinates["longitude"],
        "current": (
            "temperature_2m,relative_humidity_2m,"
            "precipitation,weather_code,wind_speed_10m"
        ),
        "hourly": "precipitation",
        "past_days": 1,
        "forecast_days": 1,
        "timezone": "Asia/Kolkata",
    }

    url = (
        "https://api.open-meteo.com/v1/forecast?"
        + urllib.parse.urlencode(params)
    )

    request = urllib.request.Request(
        url, headers={"User-Agent": "FloodGuard/1.0"}
    )

    with urllib.request.urlopen(request, timeout=10) as response:
        weather = json.loads(response.read().decode("utf-8"))

    current = weather["current"]
    hourly = weather.get("hourly", {})
    times = hourly.get("time", [])
    rainfall = hourly.get("precipitation", [])

    # Match hourly timestamps using the API's Asia/Kolkata timezone.
    now = datetime.now().replace(
        minute=0, second=0, microsecond=0
    )
    cutoff = now - timedelta(hours=24)
    recent_values = []

    for timestamp, amount in zip(times, rainfall):
        try:
            hour = datetime.fromisoformat(timestamp)
            if (
                cutoff <= hour < now
                and isinstance(amount, (int, float))
            ):
                recent_values.append(amount)
        except (ValueError, TypeError):
            continue

    rainfall_24h = (
        round(sum(recent_values), 1)
        if len(recent_values) == 24
        else None
    )

    # Project-defined rainfall indicators, not official flood predictions.
    if rainfall_24h is None:
        risk = "DATA UNAVAILABLE"
        recommendation = (
            "Complete previous-24-hour rainfall data is unavailable. "
            "Check official weather and flood advisories."
        )
    elif rainfall_24h >= 100:
        risk = "HEAVY RAINFALL"
        recommendation = (
            "High modelled rainfall indicator. Avoid flooded roads "
            "and check official local advisories."
        )
    elif rainfall_24h >= 50:
        risk = "CAUTION"
        recommendation = (
            "Elevated modelled rainfall indicator. Monitor weather "
            "and official local advisories."
        )
    else:
        risk = "MONITOR"
        recommendation = (
            "Continue monitoring official advisories. Lower rainfall "
            "does not guarantee flood safety."
        )

    return {
        "location": name,
        "temperature_c": current.get("temperature_2m"),
        "humidity_percent": current.get("relative_humidity_2m"),
        "current_precipitation_mm": current.get("precipitation"),
        "modelled_precipitation_last_24h_mm": rainfall_24h,
        "wind_speed_kmh": current.get("wind_speed_10m"),
        "weather_code": current.get("weather_code"),
        "water_level_cm": None,
        "risk": risk,
        "recommendation": recommendation,
        "data_source": "Open-Meteo weather model",
        "data_mode": "live_weather_model",
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
    }


def lambda_handler(event, context):
    """Return weather data for FloodGuard."""
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    method = (
        event.get("requestContext", {})
        .get("http", {})
        .get("method", "GET")
    )

    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": headers,
            "body": "",
        }

    query = event.get("queryStringParameters") or {}
    requested = query.get("location")

    if requested:
        requested = requested.strip()
        match = next(
            (
                name for name in LOCATIONS
                if name.lower() == requested.lower()
            ),
            None,
        )

        if match is None:
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({
                    "error": "Location not found",
                    "available_locations": list(LOCATIONS.keys()),
                }),
            }

        names = [match]
    else:
        names = list(LOCATIONS.keys())

    results = []
    failures = []

    for name in names:
        try:
            results.append(get_weather(name, LOCATIONS[name]))
        except Exception as error:
            print(f"Weather request failed for {name}: {error}")
            failures.append({
                "location": name,
                "error": "Weather data temporarily unavailable",
                "data_mode": "unavailable",
                "temperature_c": None,
                "humidity_percent": None,
                "current_precipitation_mm": None,
                "modelled_precipitation_last_24h_mm": None,
                "wind_speed_kmh": None,
                "water_level_cm": None,
                "risk": "DATA UNAVAILABLE",
                "recommendation": (
                    "Check official local weather and flood advisories."
                ),
                "data_source": "Unavailable",
            })

    if requested and failures:
        return {
            "statusCode": 502,
            "headers": headers,
            "body": json.dumps(failures[0]),
        }

    data = {
        "demo_mode": False,
        "data_source": "Open-Meteo weather model",
        "message": (
            "Weather-model estimates are not direct rain-gauge "
            "measurements or official flood warnings. Water levels "
            "are unavailable because no verified water-level source "
            "is connected."
        ),
        "locations": results + failures,
    }

    if requested and results:
        data = results[0]

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps(data),
    }
