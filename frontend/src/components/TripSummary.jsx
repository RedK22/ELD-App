const STOP_LABELS = { pickup: "Pickup", dropoff: "Dropoff", fuel: "Fuel Stop", rest: "Rest" };
const STOP_COLORS = { pickup: "#2ECC71", dropoff: "#E74C3C", fuel: "#F39C12", rest: "#4A90D9" };

function formatHour(h) {
  const totalMins = Math.round(h * 60);
  const days  = Math.floor(totalMins / (60 * 24));
  const hrs   = Math.floor((totalMins % (60 * 24)) / 60);
  const mins  = totalMins % 60;
  const parts = [];
  if (days > 0) parts.push(`Day ${days + 1}`);
  parts.push(`${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
  return parts.join(" ");
}

export default function TripSummary({ route, stops, summary, logDays }) {
  if (!route) return null;

  const cardStyle = {
    background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb",
    padding: "16px 20px", marginBottom: 16,
  };

  const statStyle = {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "12px 8px", background: "#f9fafb", borderRadius: 6,
    border: "1px solid #e5e7eb",
  };

  return (
    <div>
      {/* Stats grid */}
      <div style={{ ...cardStyle }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#111827" }}>
          Trip Overview
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { label: "Total Miles",  value: `${route.total_miles?.toLocaleString()} mi` },
            { label: "Total Days",   value: `${summary?.total_days ?? logDays?.length} days` },
            { label: "Cycle Remaining", value: `${summary?.cycle_hours_remaining ?? "—"} hrs` },
          ].map(({ label, value }) => (
            <div key={label} style={statStyle}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#1d4ed8" }}>{value}</span>
              <span style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{label}</span>
            </div>
          ))}
        </div>
        {route.note && (
          <p style={{ fontSize: 11, color: "#f59e0b", marginTop: 8, marginBottom: 0 }}>
            ⚠ {route.note}
          </p>
        )}
      </div>

      {/* Stops timeline */}
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#111827" }}>
          Stops & Schedule
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(stops || []).map((stop, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", background: "#f9fafb",
              borderRadius: 6, border: "1px solid #e5e7eb",
              borderLeft: `4px solid ${STOP_COLORS[stop.type] || "#888"}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                  {STOP_LABELS[stop.type] || stop.type} — {stop.location}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  Arrives {formatHour(stop.arrival_hour)} · {stop.miles_from_start} mi from start ·{" "}
                  {stop.duration === 0.5 ? "30 min" : `${stop.duration} hr`} stop
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-day hours */}
      {logDays?.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#111827" }}>
            Daily Hours Summary
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                {["Day", "Drive", "On Duty", "Off Duty", "Miles"].map(h => (
                  <th key={h} style={{ padding: "6px 8px", textAlign: "left",
                                       fontWeight: 600, color: "#374151",
                                       borderBottom: "1px solid #e5e7eb" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logDays.map((ld, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "6px 8px", color: "#374151" }}>Day {ld.day_number + 1}</td>
                  <td style={{ padding: "6px 8px", color: "#2ECC71", fontWeight: 600 }}>
                    {ld.driving_hours?.toFixed(1)} h
                  </td>
                  <td style={{ padding: "6px 8px", color: "#F39C12", fontWeight: 600 }}>
                    {ld.on_duty_hours?.toFixed(1)} h
                  </td>
                  <td style={{ padding: "6px 8px", color: "#4A90D9", fontWeight: 600 }}>
                    {ld.off_duty_hours?.toFixed(1)} h
                  </td>
                  <td style={{ padding: "6px 8px", color: "#6b7280" }}>{ld.total_miles} mi</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
