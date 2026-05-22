import {MapContainer, TileLayer, Polyline, Marker, Popup} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const STOP_COLORS = {
  pickup: "#2ECC71",
  dropoff: "#E74C3C",
  fuel: "#F39C12",
  rest: "#4A90D9",
};

const STOP_ICONS = {
  pickup: "🟢",
  dropoff: "🔴",
  fuel: "⛽",
  rest: "🛏️",
};

function makeIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 1px 3px rgba(0,0,0,0.4)">
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function RouteMap({route, stops}) {
  if (!route || !route.waypoints?.length) {
    return (
      <div
        style={{
          height: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      >
        <span style={{color: "#999"}}>No route data</span>
      </div>
    );
  }

  // Default center from first waypoint [lon, lat] → Leaflet needs [lat, lon]
  const center = route.waypoints[0].coords
    ? [route.waypoints[0].coords[1], route.waypoints[0].coords[0]]
    : [39.5, -98.35]; // center of US

  // Polyline: ORS returns [lon, lat], Leaflet needs [lat, lon]
  const polyline = (route.polyline || []).map((c) => [c[1], c[0]]);

  return (
    <div
      style={{borderRadius: 8, overflow: "hidden", border: "1px solid #ddd"}}
    >
      <MapContainer
        center={center}
        zoom={5}
        style={{height: 420}}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {polyline.length > 1 && (
          <Polyline
            positions={polyline}
            color="#3B82F6"
            weight={3}
            opacity={0.8}
          />
        )}

        {/* Waypoint markers (origin, pickup, dropoff) */}
        {route.waypoints.map((wp, i) => {
          if (!wp.coords) return null;
          const pos = [wp.coords[1], wp.coords[0]];
          const colors = ["#3B82F6", "#2ECC71", "#E74C3C"];
          const labels = ["Origin", "Pickup", "Dropoff"];
          return (
            <Marker key={i} position={pos} icon={makeIcon(colors[i] || "#888")}>
              <Popup>
                <strong>{labels[i] || wp.name}</strong>
                <br />
                {wp.name}
              </Popup>
            </Marker>
          );
        })}

        {/* Stop markers (fuel, rest) */}
        {(stops || [])
          .filter((s) => s.type === "fuel" || s.type === "rest")
          .map((stop, i) => {
            if (!stop.coords) return null;
            const pos = [stop.coords[1], stop.coords[0]];
            return (
              <Marker
                key={`stop-${i}`}
                position={pos}
                icon={makeIcon(STOP_COLORS[stop.type] || "#888")}
              >
                <Popup>
                  <strong>
                    {STOP_ICONS[stop.type]} {stop.type.toUpperCase()}
                  </strong>
                  <br />
                  {stop.location}
                  <br />
                  <span style={{fontSize: 12, color: "#666"}}>
                    {stop.duration === 0.5 ? "30 min" : `${stop.duration} hr`}{" "}
                    stop &nbsp;· {stop.miles_from_start} mi
                  </span>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Legend */}
      <div
        style={{
          padding: "8px 12px",
          background: "#fafafa",
          borderTop: "1px solid #eee",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          fontSize: 12,
        }}
      >
        {Object.entries(STOP_ICONS).map(([type, icon]) => (
          <span
            key={type}
            style={{display: "flex", alignItems: "center", gap: 4}}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: STOP_COLORS[type],
                display: "inline-block",
              }}
            />
            {icon} {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}
