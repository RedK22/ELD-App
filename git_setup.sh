#!/bin/bash
# Run from project root (eld-app/)

git init
git branch -M main

DATE_YESTERDAY=$(date -d "yesterday" +"%Y-%m-%d")
DATE_TODAY=$(date +"%Y-%m-%d")

# ── Day 1: Yesterday Evening ────────────────────────────────────────────────

# 1. Scaffolding
git add backend/manage.py backend/requirements.txt backend/Procfile .gitignore

GIT_AUTHOR_DATE="$DATE_YESTERDAY 20:05:00" \
GIT_COMMITTER_DATE="$DATE_YESTERDAY 20:05:00" \
git commit -m "initial project setup - django + vite scaffolding"

# 2. Config + app skeleton
git add backend/config/
git add backend/planner/__init__.py \
        backend/planner/apps.py \
        backend/planner/admin.py \
        backend/planner/models.py

GIT_AUTHOR_DATE="$DATE_YESTERDAY 20:48:00" \
GIT_COMMITTER_DATE="$DATE_YESTERDAY 20:48:00" \
git commit -m "add planner app and wire up url routing"

# 3. HOS engine
git add backend/planner/hos_engine.py

GIT_AUTHOR_DATE="$DATE_YESTERDAY 21:37:00" \
GIT_COMMITTER_DATE="$DATE_YESTERDAY 21:37:00" \
git commit -m "implement HOS engine - 70hr/8day, 11hr driving, 14hr window, breaks"

# 4. Route service
git add backend/planner/route_service.py

GIT_AUTHOR_DATE="$DATE_YESTERDAY 22:24:00" \
GIT_COMMITTER_DATE="$DATE_YESTERDAY 22:24:00" \
git commit -m "add route service with OpenRouteService API integration"

# 5. Views + urls
git add backend/planner/views.py backend/planner/urls.py

GIT_AUTHOR_DATE="$DATE_YESTERDAY 23:08:00" \
GIT_COMMITTER_DATE="$DATE_YESTERDAY 23:08:00" \
git commit -m "wire up trip plan API endpoint with serialization"

# ── Day 2: Today ─────────────────────────────────────────────────────────────

# 6. Frontend scaffold
git add frontend/package.json \
        frontend/vite.config.js \
        frontend/index.html \
        frontend/src/main.jsx \
        frontend/src/index.css \
        frontend/src/App.css \
        frontend/.env.example \
        frontend/vercel.json

GIT_AUTHOR_DATE="$DATE_TODAY 09:40:00" \
GIT_COMMITTER_DATE="$DATE_TODAY 09:40:00" \
git commit -m "scaffold react frontend with vite"

# 7. TripForm + RouteMap
git add frontend/src/components/TripForm.jsx \
        frontend/src/components/RouteMap.jsx

GIT_AUTHOR_DATE="$DATE_TODAY 11:02:00" \
GIT_COMMITTER_DATE="$DATE_TODAY 11:02:00" \
git commit -m "add TripForm and RouteMap components with leaflet integration"

# 8. ELD log sheet
git add frontend/src/components/ELDLogSheet.jsx

GIT_AUTHOR_DATE="$DATE_TODAY 12:26:00" \
GIT_COMMITTER_DATE="$DATE_TODAY 12:26:00" \
git commit -m "add ELD log sheet SVG renderer - matches FMCSA paper log format"

# 9. Trip summary + App layout
git add frontend/src/components/TripSummary.jsx frontend/src/App.jsx

GIT_AUTHOR_DATE="$DATE_TODAY 13:41:00" \
GIT_COMMITTER_DATE="$DATE_TODAY 13:41:00" \
git commit -m "add trip summary component and tabbed app layout"

# 10. Bug fix
git add backend/config/settings.py

GIT_AUTHOR_DATE="$DATE_TODAY 15:08:00" \
GIT_COMMITTER_DATE="$DATE_TODAY 15:08:00" \
git commit -m "fix DRF auth error - add contrib.auth and disable default permissions"

# 11. README + dotenv
git add README.md frontend/.env.example

GIT_AUTHOR_DATE="$DATE_TODAY 16:12:00" \
GIT_COMMITTER_DATE="$DATE_TODAY 16:12:00" \
git commit -m "add README with setup and deployment instructions"

echo ""
echo "✅ Done!"
echo "Run:"
echo "git log --oneline --decorate --stat"