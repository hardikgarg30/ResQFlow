# RESQFLOW deployment

## Local

Backend:
```powershell
cd backend
npm install
copy .env.example .env
# Fill DATABASE_URL and JWT_SECRET in .env
npm start
```

Frontend:
```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set `VITE_API_URL` to the backend URL when the backend is not localhost.

## Production

1. Create a managed PostgreSQL database (Render Postgres, Neon, Supabase, etc.).
2. Deploy `backend` as a Node web service with `npm ci` and `npm start`.
3. Set backend environment variables:
   - `DATABASE_URL` = managed PostgreSQL connection string
   - `JWT_SECRET` = long random secret
   - `CLIENT_ORIGIN` = exact frontend origin
   - `PORT` = platform-provided port if required
4. Deploy `frontend` as a static site with `npm ci` and `npm run build`, publishing `dist`.
5. Set frontend environment variable `VITE_API_URL` to the deployed backend HTTPS URL, then rebuild.
6. The backend exposes `/api/events` as an authenticated Server-Sent Events stream and also supports authenticated Socket.IO WebSockets. The dashboard, command center, analytics, rescue teams and maps subscribe to it and refresh immediately when incidents or teams change.
7. Browser GPS requires HTTPS in production (localhost is the main development exception). Users must grant location permission.

## Rescue-team GPS

A tracking device/app can send current coordinates to:
`PATCH /api/rescue-teams/:id/location`
with JSON:
`{ "latitude": 28.61, "longitude": 77.20 }`

The server broadcasts the change over `/api/events`, so the live map updates without waiting for the polling interval.


## Fully live local workflow

1. Start backend: `cd backend; npm install; npm start`.
2. Start frontend: `cd frontend; npm install; npm run dev`.
3. Log in.
4. Send SOS from the SOS page. With `AUTO_DISPATCH=true`, the backend immediately assigns the first free team.
5. Open Command Center in another tab: incidents, dispatches and team status update in real time without manual refresh.
6. Open Rescue Teams on the rescue team's device and use `START LIVE GPS` for that team. The browser sends GPS coordinates to the backend and Live Map receives them in real time.
7. Resolve the incident. The assigned team is automatically returned to `AVAILABLE`; if another incident is waiting, the backend can automatically dispatch the newly free team.

## Production SPA routing

The static frontend needs an SPA rewrite so `/login`, `/command-center`, `/live-map`, etc. all serve `index.html`. The included `render.yaml` configures this rewrite. Set the generated frontend URL in `CLIENT_ORIGIN` and the backend URL in `VITE_API_URL` before deploying.
