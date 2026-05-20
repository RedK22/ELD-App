from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .hos_engine import HOSEngine, log_day_to_dict, stop_to_dict
from .route_service import get_route


class TripPlanView(APIView):
    """
    POST /api/plan-trip/
    """

    def post(self, request):
        data = request.data

        required = ["current_location", "pickup_location", "dropoff_location"]
        missing  = [f for f in required if not data.get(f, "").strip()]
        if missing:
            return Response(
                {"error": f"Missing fields: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cycle_hours = float(data.get("cycle_hours_used", 0))
            cycle_hours = max(0.0, min(cycle_hours, 70.0))
        except (ValueError, TypeError):
            cycle_hours = 0.0

        origin  = data["current_location"].strip()
        pickup  = data["pickup_location"].strip()
        dropoff = data["dropoff_location"].strip()

        route = get_route(origin, pickup, dropoff)

        legs = [
            (pickup,  route["legs"][0]["miles"]),
            (dropoff, route["legs"][1]["miles"]),
        ]

        engine = HOSEngine(cycle_hours_used=cycle_hours)
        stops, log_days = engine.plan(legs, start_location=origin)

        waypoint_map = {w["name"]: w["coords"] for w in route.get("waypoints", [])}
        stops_out = []
        for s in stops:
            d = stop_to_dict(s)
            d["coords"] = waypoint_map.get(s.location)
            stops_out.append(d)

        full_polyline = []
        for leg in route["legs"]:
            full_polyline.extend(leg.get("polyline", []))

        return Response({
            "route": {
                "origin":               origin,
                "pickup":               pickup,
                "dropoff":              dropoff,
                "total_miles":          route["total_miles"],
                "total_duration_hours": route["total_duration_hours"],
                "polyline":             full_polyline,
                "waypoints":            route["waypoints"],
                "note":                 route.get("note", ""),
            },
            "stops":    stops_out,
            "log_days": [log_day_to_dict(ld) for ld in log_days],
            "summary": {
                "total_days":              len(log_days),
                "cycle_hours_used":        cycle_hours,
                "cycle_hours_remaining":   round(70.0 - cycle_hours, 1),
            },
        })
