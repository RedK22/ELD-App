# ELD Trip Planner

FMCSA-compliant HOS trip planner. Enter origin, pickup, and dropoff - get a route map, stop schedule, and filled ELD daily log sheets.

## Stack

- **Backend:** Django + Django REST Framework
- **Frontend:** React + Vite + Leaflet

## Run locally

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Environment variables

`backend/.env` is included with the ORS API key pre-filled.

For deployment, set these in your host's dashboard:

- `ORS_API_KEY` - OpenRouteService API key
- `SECRET_KEY` - Django secret key
- `DEBUG` - set to `False` in production

## Deploy

- **Frontend → Vercel:** import the `frontend/` folder, set `VITE_API_URL` to your Railway URL
- **Backend → Railway:** import the `backend/` folder, it will detect the `Procfile` automatically

## HOS Rules enforced

- 11-hour driving limit per shift
- 14-hour driving window
- 30-minute break after 8 cumulative driving hours
- 10-hour off-duty reset
- 70-hour / 8-day rolling cycle
- Fuel stop every 1,000 miles
- 1 hour for pickup and dropoff each
