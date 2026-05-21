export default function TripForm({ onSubmit, loading }) {
  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    onSubmit({
      current_location: fd.get("current_location"),
      pickup_location:  fd.get("pickup_location"),
      dropoff_location: fd.get("dropoff_location"),
      cycle_hours_used: parseFloat(fd.get("cycle_hours_used") || "0"),
    });
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
    borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "#374151", marginBottom: 4,
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gap: 16 }}>

        <div>
          <label style={labelStyle}>📍 Current Location</label>
          <input name="current_location" placeholder="e.g. Chicago, IL"
                 style={inputStyle} required
                 onFocus={e => e.target.style.borderColor = "#3B82F6"}
                 onBlur={e => e.target.style.borderColor = "#d1d5db"} />
        </div>

        <div>
          <label style={labelStyle}>🟢 Pickup Location</label>
          <input name="pickup_location" placeholder="e.g. Minneapolis, MN"
                 style={inputStyle} required
                 onFocus={e => e.target.style.borderColor = "#3B82F6"}
                 onBlur={e => e.target.style.borderColor = "#d1d5db"} />
        </div>

        <div>
          <label style={labelStyle}>🔴 Dropoff Location</label>
          <input name="dropoff_location" placeholder="e.g. Denver, CO"
                 style={inputStyle} required
                 onFocus={e => e.target.style.borderColor = "#3B82F6"}
                 onBlur={e => e.target.style.borderColor = "#d1d5db"} />
        </div>

        <div>
          <label style={labelStyle}>⏱ Current Cycle Hours Used (0–70)</label>
          <input name="cycle_hours_used" type="number" min="0" max="70"
                 step="0.5" defaultValue="0" placeholder="0"
                 style={inputStyle}
                 onFocus={e => e.target.style.borderColor = "#3B82F6"}
                 onBlur={e => e.target.style.borderColor = "#d1d5db"} />
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            Hours already used in your current 8-day cycle
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 0",
            background: loading ? "#93c5fd" : "#3B82F6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Planning route…" : "Plan My Trip →"}
        </button>
      </div>
    </form>
  );
}
