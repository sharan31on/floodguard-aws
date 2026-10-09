import json

# Demo environmental data.
# These are sample values, not live measurements.
LOCATIONS = {
    "Trichy": {
        "rainfall_mm": 85,
        "water_level_cm": 70,
        "risk": "HIGH",
        "recommendation": (
            "Avoid low-lying roads and check local official advisories."
        ),
    },
    "Thanjavur": {
        "rainfall_mm": 45,
        "water_level_cm": 38,
        "risk": "WARNING",
        "recommendation": (
            "Be cautious around low-lying areas and monitor local updates."
        ),
    },
    "Salem": {
        "rainfall_mm": 15,
        "water_level_cm": 20,
        "risk": "SAFE",
        "recommendation": (
            "Sample indicators show lower risk. Continue following "
            "local advisories."
        ),
    },
}


def lambda_handler(event, context):
    """Return sample environmental risk data for FloodGuard."""

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
    location = query.get("location")

    if location:
        match = next(
            (
                name
                for name in LOCATIONS
                if name.lower() == location.strip().lower()
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

        data = { "location": match, **LOCATIONS[match] }

    else:
        data = {
            "demo_mode": True,
            "message": "Sample data only; not an official warning system.",
            "locations": [
                {"location": name, **details}
                for name, details in LOCATIONS.items()
            ],
        }

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps(data),
    }
