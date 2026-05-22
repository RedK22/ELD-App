/**
 * Props:
 *   logDay  - one element from the API's log_days[]
 *   dayDate - JS Date for this log day
 *   tripInfo - { origin, carrier, vehicle }
 */

const STATUS_ROWS = [
  {key: "off_duty", label: "1. Off Duty", y: 0},
  {key: "sleeper", label: "2. Sleeper Berth", y: 1},
  {key: "driving", label: "3. Driving", y: 2},
  {key: "on_duty_nd", label: "4. On Duty\n(not driving)", y: 3},
];

const ROW_H = 28; // height
const GRID_TOP = 120; // y grid
const GRID_LEFT = 90; // x hour-0
const GRID_W = 530; // width - 24 hours
const HOUR_W = GRID_W / 24; // pixels per hour

const STATUS_COLORS = {
  off_duty: "#4A90D9",
  sleeper: "#7B68EE",
  driving: "#2ECC71",
  on_duty_nd: "#F39C12",
};

function hourToX(hour) {
  return GRID_LEFT + (hour / 24) * GRID_W;
}

function formatHour(h) {
  if (h === 0 || h === 24) return "Mid-\nnight";
  if (h === 12) return "Noon";
  return String(h);
}

export default function ELDLogSheet({logDay, dayDate, tripInfo = {}}) {
  const {
    day_number,
    segments = [],
    total_miles = 0,
    remarks = [],
    driving_hours = 0,
    on_duty_hours = 0,
    off_duty_hours = 0,
  } = logDay;

  const dateStr = dayDate
    ? dayDate.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : `Day ${day_number + 1}`;

  const svgH = GRID_TOP + STATUS_ROWS.length * ROW_H + 160;

  // Build per-row segments
  const rowSegments = {};
  STATUS_ROWS.forEach((r) => {
    rowSegments[r.key] = [];
  });
  segments.forEach((seg) => {
    if (rowSegments[seg.status] !== undefined) {
      rowSegments[seg.status].push(seg);
    }
  });

  // Hour totals per status
  const totals = {};
  STATUS_ROWS.forEach((r) => {
    totals[r.key] = segments
      .filter((s) => s.status === r.key)
      .reduce((sum, s) => sum + s.duration, 0);
  });

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: 4,
        marginBottom: 20,
        overflow: "hidden",
      }}
    >
      <svg
        viewBox={`0 0 680 ${svgH}`}
        width="100%"
        style={{display: "block", fontFamily: "Arial, sans-serif"}}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <text
          x="340"
          y="18"
          textAnchor="middle"
          fontSize="13"
          fontWeight="bold"
          fill="#000"
        >
          DRIVER'S DAILY LOG (24 hours)
        </text>
        <text x="340" y="32" textAnchor="middle" fontSize="9" fill="#555">
          Original - File at home terminal · Duplicate - Driver retains for 8
          days
        </text>

        {/* Date */}
        <text x="10" y="52" fontSize="9" fill="#555">
          Date:
        </text>
        <text x="36" y="52" fontSize="10" fontWeight="bold" fill="#000">
          {dateStr}
        </text>

        {/* Total miles */}
        <text x="200" y="52" fontSize="9" fill="#555">
          Total Miles:
        </text>
        <text x="258" y="52" fontSize="10" fontWeight="bold" fill="#000">
          {total_miles}
        </text>

        {/* Carrier */}
        <text x="10" y="68" fontSize="9" fill="#555">
          Carrier:
        </text>
        <text x="48" y="68" fontSize="10" fill="#000">
          {tripInfo.carrier || "-"}
        </text>

        {/* Vehicle */}
        <text x="350" y="68" fontSize="9" fill="#555">
          Vehicle #:
        </text>
        <text x="395" y="68" fontSize="10" fill="#000">
          {tripInfo.vehicle || "-"}
        </text>

        {/* From / To */}
        <text x="10" y="84" fontSize="9" fill="#555">
          From:
        </text>
        <text x="40" y="84" fontSize="10" fill="#000">
          {tripInfo.origin || "-"}
        </text>
        <text x="350" y="84" fontSize="9" fill="#555">
          To:
        </text>
        <text x="368" y="84" fontSize="10" fill="#000">
          {tripInfo.dropoff || "-"}
        </text>

        {/* Hour labels */}
        {[
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
          20, 21, 22, 23, 24,
        ].map((h) => {
          const x = hourToX(h);
          const label =
            h === 0 ? "M" : h === 12 ? "N" : h === 24 ? "M" : String(h);
          return (
            <text
              key={h}
              x={x}
              y={GRID_TOP - 4}
              textAnchor="middle"
              fontSize="8"
              fill="#333"
            >
              {label}
            </text>
          );
        })}

        {/* ── Grid rows ────────────────────────────────────────────── */}
        {STATUS_ROWS.map((row, ri) => {
          const rowY = GRID_TOP + ri * ROW_H;
          return (
            <g key={row.key}>
              {/* Row label */}
              <text
                x={GRID_LEFT - 4}
                y={rowY + ROW_H / 2 + 4}
                textAnchor="end"
                fontSize="8"
                fill="#333"
              >
                {row.label.split("\n").map((line, li) => (
                  <tspan key={li} x={GRID_LEFT - 4} dy={li === 0 ? 0 : 10}>
                    {line}
                  </tspan>
                ))}
              </text>

              {/* Grid background */}
              <rect
                x={GRID_LEFT}
                y={rowY}
                width={GRID_W}
                height={ROW_H}
                fill={ri % 2 === 0 ? "#fafafa" : "#f3f3f3"}
                stroke="#bbb"
                strokeWidth="0.5"
              />

              {/* Hour tick marks */}
              {Array.from({length: 25}).map((_, h) => {
                const x = hourToX(h);
                const isMajor = h % 6 === 0;
                const isMid = h % 3 === 0;
                const tickH = isMajor
                  ? ROW_H
                  : isMid
                    ? ROW_H * 0.6
                    : ROW_H * 0.3;
                return (
                  <line
                    key={h}
                    x1={x}
                    y1={rowY + ROW_H - tickH}
                    x2={x}
                    y2={rowY + ROW_H}
                    stroke="#bbb"
                    strokeWidth="0.5"
                  />
                );
              })}

              {/* Duty segments - filled rectangles */}
              {(rowSegments[row.key] || []).map((seg, si) => {
                const x1 = hourToX(seg.start_hour);
                const x2 = hourToX(seg.end_hour);
                const w = Math.max(x2 - x1, 1);
                return (
                  <rect
                    key={si}
                    x={x1}
                    y={rowY + 2}
                    width={w}
                    height={ROW_H - 4}
                    fill={STATUS_COLORS[row.key]}
                    opacity="0.85"
                    rx="1"
                  />
                );
              })}

              {/* Hour total on right */}
              <text
                x={GRID_LEFT + GRID_W + 8}
                y={rowY + ROW_H / 2 + 4}
                fontSize="9"
                fill="#333"
              >
                {totals[row.key] > 0 ? totals[row.key].toFixed(2) : "-"}
              </text>
            </g>
          );
        })}

        {/* Total hours label */}
        <text
          x={GRID_LEFT + GRID_W + 4}
          y={GRID_TOP - 4}
          fontSize="8"
          fill="#555"
        >
          Total
        </text>
        <text
          x={GRID_LEFT + GRID_W + 4}
          y={GRID_TOP + 4}
          fontSize="8"
          fill="#555"
        >
          Hrs
        </text>

        {/* Divider */}
        <line
          x1="10"
          y1={GRID_TOP + STATUS_ROWS.length * ROW_H + 8}
          x2="670"
          y2={GRID_TOP + STATUS_ROWS.length * ROW_H + 8}
          stroke="#ccc"
          strokeWidth="0.5"
        />

        {/* ── Remarks section ───────────────────────────────────────── */}
        <text
          x="10"
          y={GRID_TOP + STATUS_ROWS.length * ROW_H + 22}
          fontSize="9"
          fontWeight="bold"
          fill="#333"
        >
          REMARKS:
        </text>
        {remarks.slice(0, 6).map((r, i) => (
          <text
            key={i}
            x="10"
            y={GRID_TOP + STATUS_ROWS.length * ROW_H + 36 + i * 14}
            fontSize="9"
            fill="#444"
          >
            {r}
          </text>
        ))}

        {/* ── Summary totals bar ────────────────────────────────────── */}
        {(() => {
          const summaryY = GRID_TOP + STATUS_ROWS.length * ROW_H + 130;
          return (
            <g>
              <rect
                x="10"
                y={summaryY}
                width="660"
                height="22"
                fill="#f0f0f0"
                stroke="#ccc"
                strokeWidth="0.5"
                rx="2"
              />
              <text x="20" y={summaryY + 14} fontSize="9" fill="#333">
                Driving:{" "}
                <tspan fontWeight="bold">{driving_hours.toFixed(2)} hrs</tspan>
              </text>
              <text x="160" y={summaryY + 14} fontSize="9" fill="#333">
                On Duty Total:{" "}
                <tspan fontWeight="bold">{on_duty_hours.toFixed(2)} hrs</tspan>
              </text>
              <text x="330" y={summaryY + 14} fontSize="9" fill="#333">
                Off Duty:{" "}
                <tspan fontWeight="bold">{off_duty_hours.toFixed(2)} hrs</tspan>
              </text>
              <text x="490" y={summaryY + 14} fontSize="9" fill="#333">
                Total:{" "}
                <tspan fontWeight="bold">
                  {(driving_hours + on_duty_hours + off_duty_hours).toFixed(2)}{" "}
                  hrs
                </tspan>
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
