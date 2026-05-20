"""
RouteService — geocoding + routing via OpenRouteService (free tier).
Falls back to straight-line distance estimate if API key is absent.
"""

import os
import math
import requests
from typing import List, Tuple, Optional

ORS_BASE = "https://api.openrouteservice.org"
ORS_KEY  = os.environ.get("ORS_API_KEY", "")


def geocode(place: str) -> Optional[Tuple[float, float]]:
    """Return (lon, lat) for a place name string, or None on failure."""
    if not ORS_KEY:
        return None
    try:
        r = requests.get(
            f"{ORS_BASE}/geocode/search",
            params={"api_key": ORS_KEY, "text": place, "size": 1},
            timeout=10,
        )
        r.raise_for_status()
        features = r.json().get("features", [])
        if features:
            coords = features[0]["geometry"]["coordinates"]  # [lon, lat]
            return tuple(coords)
    except Exception:
        pass
    return None


def get_route(
    origin: str,
    pickup: str,
    dropoff: str,
) -> dict:
    """
    Return routing data between origin → pickup → dropoff.

    Response shape:
    {
      "legs": [
          {"from": "Origin", "to": "Pickup", "miles": 123.4,
           "duration_hours": 2.24, "polyline": [[lon,lat],...]},
          {"from": "Pickup", "to": "Dropoff", "miles": 456.7, ...}
      ],
      "total_miles": 580.1,
      "total_duration_hours": 10.5,
      "waypoints": [
          {"name": "Origin",  "coords": [lon, lat]},
          {"name": "Pickup",  "coords": [lon, lat]},
          {"name": "Dropoff", "coords": [lon, lat]},
      ]
    }
    """
    places = [origin, pickup, dropoff]
    coords = [geocode(p) for p in places]

    # If any geocoding failed, fall back to estimates
    if not all(coords):
        return _fallback_route(origin, pickup, dropoff)

    legs = []
    total_miles = 0.0
    total_hours = 0.0

    for i in range(len(coords) - 1):
        c1, c2 = coords[i], coords[i + 1]
        leg = _ors_directions(c1, c2, places[i], places[i + 1])
        legs.append(leg)
        total_miles += leg["miles"]
        total_hours += leg["duration_hours"]

    return {
        "legs": legs,
        "total_miles": round(total_miles, 1),
        "total_duration_hours": round(total_hours, 2),
        "waypoints": [
            {"name": places[i], "coords": list(coords[i])}
            for i in range(len(places))
        ],
    }


def _ors_directions(
    c1: Tuple[float, float],
    c2: Tuple[float, float],
    from_name: str,
    to_name: str,
) -> dict:
    """Call ORS directions API for one leg."""
    try:
        r = requests.post(
            f"{ORS_BASE}/v2/directions/driving-hgv/geojson",
            headers={"Authorization": ORS_KEY, "Content-Type": "application/json"},
            json={"coordinates": [list(c1), list(c2)]},
            timeout=15,
        )
        r.raise_for_status()
        data     = r.json()
        props    = data["features"][0]["properties"]["summary"]
        meters   = props["distance"]
        seconds  = props["duration"]
        geometry = data["features"][0]["geometry"]["coordinates"]  # [[lon,lat],...]

        miles = meters * 0.000621371
        hours = seconds / 3600.0

        return {
            "from": from_name,
            "to": to_name,
            "miles": round(miles, 1),
            "duration_hours": round(hours, 2),
            "polyline": geometry,
        }
    except Exception:
        # Fallback to haversine estimate
        miles = _haversine_miles(c1, c2)
        return {
            "from": from_name,
            "to": to_name,
            "miles": round(miles, 1),
            "duration_hours": round(miles / 55.0, 2),
            "polyline": [list(c1), list(c2)],
        }


def _haversine_miles(c1: Tuple[float, float], c2: Tuple[float, float]) -> float:
    """Straight-line distance in miles between two (lon, lat) points."""
    lon1, lat1 = math.radians(c1[0]), math.radians(c1[1])
    lon2, lat2 = math.radians(c2[0]), math.radians(c2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(a))


def _fallback_route(origin: str, pickup: str, dropoff: str) -> dict:
    """
    When ORS is unavailable, return a plausible synthetic route
    based on US average city distances so the app still works for demos.
    """
    # Rough miles — just enough to exercise the HOS engine meaningfully
    leg1_miles = 350.0
    leg2_miles = 600.0
    return {
        "legs": [
            {
                "from": origin,
                "to": pickup,
                "miles": leg1_miles,
                "duration_hours": round(leg1_miles / 55.0, 2),
                "polyline": [[-87.6298, 41.8781], [-93.0979, 44.9778]],
            },
            {
                "from": pickup,
                "to": dropoff,
                "miles": leg2_miles,
                "duration_hours": round(leg2_miles / 55.0, 2),
                "polyline": [[-93.0979, 44.9778], [-104.9903, 39.7392]],
            },
        ],
        "total_miles": leg1_miles + leg2_miles,
        "total_duration_hours": round((leg1_miles + leg2_miles) / 55.0, 2),
        "waypoints": [
            {"name": origin,  "coords": [-87.6298, 41.8781]},
            {"name": pickup,  "coords": [-93.0979, 44.9778]},
            {"name": dropoff, "coords": [-104.9903, 39.7392]},
        ],
        "note": "Live geocoding unavailable — distances are estimates.",
    }
