import { useState } from "react";
import axios from "axios";
import TripForm from "./components/TripForm";
import RouteMap from "./components/RouteMap";
import ELDLogSheet from "./components/ELDLogSheet";
import TripSummary from "./components/TripSummary";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TAB_STYLE = (active) => ({
  padding: "10px 20px",
  border: "none",
  borderBottom: active ? "3px solid #3B82F6" : "3px solid transparent",
  background: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: active ? 700 : 400,
  color: active ? "#1d4ed8" : "#6b7280",
  transition: "all 0.15s",
});

export default function App() {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState("map");
  const [formData, setFormData] = useState(null);

  async function handleSubmit(data) {
    setLoading(true);
    setError(null);
    setFormData(data);
    try {
      const res = await axios.post(`${API_BASE}/api/plan-trip/`, data);
      setResult(res.data);
      setTab("map");
    } catch (e) {
      setError(e.response?.data?.error || "Server error — is Django running?");
    } finally {
      setLoading(false);
    }
  }

  const tripInfo = formData ? {
    origin:  formData.current_location,
    dropoff: formData.dropoff_location,
    carrier: "—",
    vehicle: "—",
  } : {};

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{ background: "#1e3a5f", padding: "0 24px",
                       display: "flex", alignItems: "center", gap: 12, height: 56 }}>
        <span style={{ fontSize: 22 }}>🚛</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>ELD Trip Planner</span>
        <span style={{ color: "#93c5fd", fontSize: 13, marginLeft: 4 }}>
          FMCSA HOS Compliant · 70 hr / 8 day
        </span>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px",
                    display: "grid", gridTemplateColumns: "320px 1fr", gap: 20,
                    alignItems: "start" }}>

        {/* Left panel — form */}
        <div style={{ background: "#fff", borderRadius: 10, padding: 20,
                      border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700, color: "#111827" }}>
            Trip Details
          </h2>
          <TripForm onSubmit={handleSubmit} loading={loading} />
          {error && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#fef2f2",
                          border: "1px solid #fca5a5", borderRadius: 6,
                          color: "#b91c1c", fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}
          <div style={{ marginTop: 20, padding: "12px", background: "#eff6ff",
                        borderRadius: 6, fontSize: 11, color: "#1e40af" }}>
            <strong>Assumptions:</strong><br />
            · 70 hr / 8-day property carrier<br />
            · 55 mph average speed<br />
            · Fuel every 1,000 miles<br />
            · 1 hr pickup + dropoff each<br />
            · 30-min break after 8 hrs driving<br />
            · 10-hr rest between shifts
          </div>
        </div>

        {/* Right panel — results */}
        {result ? (
          <div>
            {/* Tabs */}
            <div style={{ background: "#fff", borderRadius: "10px 10px 0 0",
                          borderBottom: "1px solid #e5e7eb", display: "flex" }}>
              {[
                { key: "map",     label: "🗺  Route Map" },
                { key: "summary", label: "📋 Summary" },
                { key: "logs",    label: `📝 ELD Logs (${result.log_days?.length} days)` },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                        style={TAB_STYLE(tab === t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: "0 0 10px 10px",
                          padding: 20, border: "1px solid #e5e7eb",
                          borderTop: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
              {tab === "map" && (
                <RouteMap route={result.route} stops={result.stops} />
              )}
              {tab === "summary" && (
                <TripSummary
                  route={result.route}
                  stops={result.stops}
                  summary={result.summary}
                  logDays={result.log_days}
                />
              )}
              {tab === "logs" && (
                <div>
                  <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>
                    {result.log_days?.length} daily log sheet{result.log_days?.length !== 1 ? "s" : ""} generated.
                  </p>
                  {result.log_days?.map((ld, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + ld.day_number);
                    return (
                      <div key={i}>
                        <h4 style={{ margin: "12px 0 6px", fontSize: 13, color: "#374151" }}>
                          Day {ld.day_number + 1}
                        </h4>
                        <ELDLogSheet logDay={ld} dayDate={d} tripInfo={tripInfo} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", height: 400,
                        background: "#fff", borderRadius: 10,
                        border: "2px dashed #d1d5db", color: "#9ca3af" }}>
            <span style={{ fontSize: 48 }}>🗺️</span>
            <p style={{ fontSize: 15, marginTop: 12 }}>
              Enter trip details to generate your route and ELD logs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
