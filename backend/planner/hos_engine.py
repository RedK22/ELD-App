"""
HOSEngine - FMCSA Hours of Service compliance engine
Property-carrying driver, 70 hr / 8 day cycle.

Rules enforced:
  - 11-hour driving limit per shift
  - 14-hour driving window (from first on-duty moment)
  - 30-minute break required after 8 cumulative driving hours
  - 10-hour off-duty reset between shifts
  - 70-hour / 8-day rolling on-duty limit
  - 1-hour on-duty (not driving) for pickup and dropoff
  - Fueling stop (30 min on-duty not driving) every ≤1,000 miles
"""

from dataclasses import dataclass, field
from typing import List, Tuple


# ── Constants ────────────────────────────────────────────────────────────────

MAX_DRIVING_PER_SHIFT   = 11.0   # hours
DRIVING_WINDOW          = 14.0   # hours from first on-duty moment
BREAK_AFTER_DRIVING     = 8.0    # cumulative driving hours before mandatory break
BREAK_DURATION          = 0.5    # hours (30 min)
OFF_DUTY_RESET          = 10.0   # consecutive off-duty hours to reset shift
MAX_CYCLE_HOURS         = 70.0   # hours in 8-day rolling window
PICKUP_DROPOFF_DURATION = 1.0    # hours on-duty (not driving)
FUEL_STOP_DURATION      = 0.5    # hours on-duty (not driving)
FUEL_INTERVAL_MILES     = 1000.0 # max miles between fuel stops
AVG_SPEED_MPH           = 55.0   # assumed average driving speed


# ── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class DutySegment:
    """One block on the ELD log grid."""
    status: str          # 'off_duty' | 'driving' | 'on_duty_nd' | 'sleeper'
    start_hour: float    # hours from midnight of this log day (0–24)
    end_hour: float
    label: str = ""      # remark text for remarks section

    @property
    def duration(self) -> float:
        return self.end_hour - self.start_hour


@dataclass
class LogDay:
    """One completed ELD log sheet."""
    day_number: int
    segments: List[DutySegment] = field(default_factory=list)
    total_miles: float = 0.0
    remarks: List[str] = field(default_factory=list)

    @property
    def driving_hours(self) -> float:
        return sum(s.duration for s in self.segments if s.status == 'driving')

    @property
    def on_duty_hours(self) -> float:
        return sum(s.duration for s in self.segments
                   if s.status in ('driving', 'on_duty_nd'))

    @property
    def off_duty_hours(self) -> float:
        return sum(s.duration for s in self.segments
                   if s.status in ('off_duty', 'sleeper'))


@dataclass
class Stop:
    """A waypoint produced by the planner."""
    type: str            # 'pickup' | 'dropoff' | 'rest' | 'fuel'
    location: str
    arrival_hour: float  # absolute hours from trip start
    duration: float      # hours spent at this stop
    miles_from_start: float = 0.0


# ── Engine ───────────────────────────────────────────────────────────────────

class HOSEngine:
    """
    Given a list of driving legs (miles each), a starting location, and
    prior cycle hours used, produce:
      - stops[]      waypoints with type and timing
      - log_days[]   fully segmented ELD daily logs
    """

    def __init__(self, cycle_hours_used: float = 0.0):
        # Rolling 8-day accumulator - simplified: treat as hours already burned
        self.cycle_hours_used = min(cycle_hours_used, MAX_CYCLE_HOURS)

    def plan(
        self,
        legs: List[Tuple[str, float]],   # [(location_name, miles), ...]
        start_location: str = "Origin",
    ) -> Tuple[List[Stop], List[LogDay]]:
        """
        Main entry point.  `legs` describes each driving segment:
            [("Pickup City", 120.0), ("Dropoff City", 340.0)]
        Returns (stops, log_days).
        """
        stops: List[Stop] = []
        log_days: List[LogDay] = []

        # State machine
        abs_hour       = 0.0   # absolute hours elapsed since trip start (day 0, 00:00)
        shift_start    = None  # abs_hour when this shift's 14-hr window opened
        driving_today  = 0.0   # driving hours this shift
        since_break    = 0.0   # cumulative driving since last 30-min break
        cycle_remaining = MAX_CYCLE_HOURS - self.cycle_hours_used
        miles_since_fuel = 0.0
        total_miles    = 0.0

        # Start shift immediately (driver is already on-duty at hour 0)
        shift_start = abs_hour

        current_day_segments: List[DutySegment] = []
        current_day_remarks:  List[str] = []
        current_day_miles: float = 0.0

        def day_of(h: float) -> int:
            return int(h // 24)

        def hour_in_day(h: float) -> float:
            return h % 24

        def flush_day(up_to_hour: float):
            """Close out all full days between last flush and up_to_hour."""
            nonlocal current_day_segments, current_day_remarks, current_day_miles

            while log_days and (day_of(up_to_hour) > log_days[-1].day_number) or \
                  (not log_days and day_of(up_to_hour) > 0):
                # fill midnight gap with off-duty if needed
                expected_day = len(log_days)
                if expected_day < day_of(up_to_hour):
                    log_days.append(LogDay(
                        day_number=expected_day,
                        segments=current_day_segments,
                        total_miles=current_day_miles,
                        remarks=current_day_remarks,
                    ))
                    current_day_segments = []
                    current_day_remarks  = []
                    current_day_miles    = 0.0
                else:
                    break

        def add_segment(status: str, start: float, end: float, label: str = ""):
            """Add a duty segment, splitting across midnight boundaries."""
            nonlocal current_day_segments, current_day_remarks, current_day_miles, log_days

            while start < end:
                d     = day_of(start)
                d_end = (d + 1) * 24.0          # midnight ending this day

                # ensure we have a list for day d
                while len(log_days) <= d:
                    log_days.append(LogDay(
                        day_number=len(log_days),
                        segments=[],
                        total_miles=0.0,
                        remarks=[],
                    ))

                seg_end = min(end, d_end)
                log_days[d].segments.append(DutySegment(
                    status=status,
                    start_hour=hour_in_day(start),
                    end_hour=hour_in_day(seg_end) if seg_end < d_end else 24.0,
                    label=label,
                ))
                if label and label not in log_days[d].remarks:
                    log_days[d].remarks.append(label)

                start = seg_end

        def do_off_duty(hours: float, label: str = "Rest stop"):
            nonlocal abs_hour, shift_start, driving_today, since_break, cycle_remaining
            add_segment('off_duty', abs_hour, abs_hour + hours, label)
            abs_hour    += hours
            shift_start  = None   # shift window closes during off-duty
            driving_today = 0.0
            since_break   = 0.0

        def open_shift_if_needed():
            nonlocal shift_start
            if shift_start is None:
                shift_start = abs_hour

        def do_on_duty_nd(hours: float, label: str):
            nonlocal abs_hour, cycle_remaining
            open_shift_if_needed()
            add_segment('on_duty_nd', abs_hour, abs_hour + hours, label)
            abs_hour       += hours
            cycle_remaining -= hours

        def drive_miles(miles: float, label: str = "") -> float:
            """
            Drive `miles` worth of road, respecting all HOS limits.
            Inserts breaks, rest periods, and fuel stops automatically.
            Returns hours consumed.
            """
            nonlocal abs_hour, shift_start, driving_today, since_break
            nonlocal cycle_remaining, miles_since_fuel, total_miles

            remaining_miles = miles
            hours_consumed  = 0.0

            while remaining_miles > 0:
                open_shift_if_needed()

                # ── How far can we drive before hitting a limit? ──────────
                window_used    = abs_hour - shift_start
                window_left    = DRIVING_WINDOW - window_used - driving_today
                # can drive within 14-hr window but also limited by 11-hr cap
                drive_cap      = min(
                    MAX_DRIVING_PER_SHIFT - driving_today,   # 11-hr cap
                    DRIVING_WINDOW - window_used,             # 14-hr window
                    BREAK_AFTER_DRIVING - since_break,        # break trigger
                    cycle_remaining,                          # 70-hr cycle
                )
                drive_cap = max(drive_cap, 0.0)

                # Check if fuel stop needed first
                miles_to_fuel  = FUEL_INTERVAL_MILES - miles_since_fuel
                miles_drivable = drive_cap * AVG_SPEED_MPH

                if drive_cap <= 0.001:
                    # Need a break or rest
                    if since_break >= BREAK_AFTER_DRIVING:
                        # 30-min break (can be on-duty or off-duty per regs)
                        add_segment('off_duty', abs_hour, abs_hour + BREAK_DURATION, "30-min break")
                        abs_hour   += BREAK_DURATION
                        since_break = 0.0
                    else:
                        # Need 10-hr off-duty reset
                        do_off_duty(OFF_DUTY_RESET, "10-hr rest period")
                    continue

                # Miles we'll cover this segment (before any forced stop)
                seg_miles = min(remaining_miles, miles_drivable, miles_to_fuel if miles_to_fuel < miles_drivable else miles_drivable)
                # Clamp to actual drive_cap
                seg_miles = min(seg_miles, drive_cap * AVG_SPEED_MPH)

                seg_hours = seg_miles / AVG_SPEED_MPH

                add_segment('driving', abs_hour, abs_hour + seg_hours, label)
                abs_hour        += seg_hours
                driving_today   += seg_hours
                since_break     += seg_hours
                cycle_remaining -= seg_hours
                remaining_miles -= seg_miles
                miles_since_fuel += seg_miles
                total_miles      += seg_miles
                hours_consumed   += seg_hours

                # Insert fuel stop if needed
                if miles_since_fuel >= FUEL_INTERVAL_MILES and remaining_miles > 0:
                    do_on_duty_nd(FUEL_STOP_DURATION, "Fuel stop")
                    stops.append(Stop(
                        type='fuel',
                        location=label or "En route",
                        arrival_hour=abs_hour - FUEL_STOP_DURATION,
                        duration=FUEL_STOP_DURATION,
                        miles_from_start=total_miles,
                    ))
                    miles_since_fuel = 0.0

                # Insert 30-min break if threshold hit and still driving
                if since_break >= BREAK_AFTER_DRIVING and remaining_miles > 0:
                    add_segment('off_duty', abs_hour, abs_hour + BREAK_DURATION, "30-min break")
                    abs_hour   += BREAK_DURATION
                    since_break = 0.0

            return hours_consumed

        # ── Execute the trip ─────────────────────────────────────────────────

        # Ensure day 0 exists
        if not log_days:
            log_days.append(LogDay(day_number=0, segments=[], total_miles=0.0, remarks=[]))

        # Add start remark
        if log_days:
            log_days[0].remarks.append(f"Depart {start_location}")

        for idx, (dest_name, leg_miles) in enumerate(legs):
            is_first = (idx == 0)
            is_last  = (idx == len(legs) - 1)

            # Drive to this leg's destination
            drive_miles(leg_miles, f"En route to {dest_name}")

            # Update miles on current day
            day_idx = day_of(abs_hour)
            while len(log_days) <= day_idx:
                log_days.append(LogDay(day_number=len(log_days)))

            # Pickup or dropoff stop
            if is_first:
                stop_type = 'pickup'
                stop_label = f"Pickup at {dest_name}"
            else:
                stop_type = 'dropoff'
                stop_label = f"Dropoff at {dest_name}"

            arrival = abs_hour
            do_on_duty_nd(PICKUP_DROPOFF_DURATION, stop_label)

            stops.append(Stop(
                type=stop_type,
                location=dest_name,
                arrival_hour=arrival,
                duration=PICKUP_DROPOFF_DURATION,
                miles_from_start=total_miles,
            ))

        # End of trip - driver goes off duty
        add_segment('off_duty', abs_hour, min(abs_hour + 1.0, (day_of(abs_hour) + 1) * 24.0), "End of trip")

        # Assign miles to each day proportionally (simplified)
        total_days = len(log_days)
        if total_days > 0:
            per_day = total_miles / total_days
            for ld in log_days:
                ld.total_miles = round(per_day, 1)

        return stops, log_days


# ── Helpers for serialization ─────────────────────────────────────────────────

def segment_to_dict(seg: DutySegment) -> dict:
    return {
        "status":     seg.status,
        "start_hour": round(seg.start_hour, 4),
        "end_hour":   round(seg.end_hour, 4),
        "label":      seg.label,
        "duration":   round(seg.duration, 4),
    }

def log_day_to_dict(ld: LogDay) -> dict:
    return {
        "day_number":     ld.day_number,
        "segments":       [segment_to_dict(s) for s in ld.segments],
        "total_miles":    ld.total_miles,
        "remarks":        ld.remarks,
        "driving_hours":  round(ld.driving_hours, 2),
        "on_duty_hours":  round(ld.on_duty_hours, 2),
        "off_duty_hours": round(ld.off_duty_hours, 2),
    }

def stop_to_dict(stop: Stop) -> dict:
    return {
        "type":             stop.type,
        "location":         stop.location,
        "arrival_hour":     round(stop.arrival_hour, 2),
        "duration":         stop.duration,
        "miles_from_start": round(stop.miles_from_start, 1),
    }
