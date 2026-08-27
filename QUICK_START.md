# RESQFLOW — Live Emergency Response

## Local run

### Terminal 1 — backend
```powershell
cd "C:\Users\<YOUR_NAME>\Downloads\RESQFLOW\backend"
npm install
# Create .env from .env.example and put your real DATABASE_URL + JWT_SECRET in it.
npm start
```

### Terminal 2 — frontend
```powershell
cd "C:\Users\<YOUR_NAME>\Downloads\RESQFLOW\frontend"
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## Live workflow

1. Login/register.
2. SOS page → allow browser GPS → Send SOS.
3. With `AUTO_DISPATCH=true`, the first free rescue team is automatically assigned.
4. Command Center updates through Socket.IO, with SSE fallback.
5. Rescue Teams shows the actual active incident assigned to each team.
6. On a rescue-team device, click `START LIVE GPS` for that team. The device's GPS is sent to the backend every few seconds.
7. Live Map displays incidents, shelters and rescue teams.
8. Resolve an incident. The backend automatically changes its assigned team to `AVAILABLE` and tries to dispatch the oldest waiting incident.

## Environment

Backend `.env`:
- `PORT=5000`
- `DATABASE_URL=<your PostgreSQL connection string>`
- `JWT_SECRET=<long random secret>`
- `CLIENT_ORIGIN=<frontend origin>`
- `AUTO_DISPATCH=true`

Frontend `.env`:
- `VITE_API_URL=http://localhost:5000`

## Production

Use the included `render.yaml` as a starting point. Set the real frontend URL in backend `CLIENT_ORIGIN` and the real backend URL in frontend `VITE_API_URL`. Production browser GPS requires HTTPS and user permission.
