# ResQFlow 🚨

### Emergency Response Management & Real-Time Rescue Coordination Platform

ResQFlow is a full-stack emergency response management platform designed
to help coordinators monitor incidents, dispatch rescue teams, track
field teams, and manage emergency shelters from a centralized dashboard.

It combines a React + Vite frontend, Node.js + Express backend,
PostgreSQL persistence, JWT authentication, Socket.IO/SSE real-time
updates, and Leaflet-based live mapping.

## ✨ Key Features

-   🚨 **SOS Emergency Reporting** --- create emergency alerts with
    location, severity, people affected, and priority information.
-   ⚡ **Automatic Dispatch** --- when enabled, the backend can
    automatically assign the first available rescue team to a new SOS.
-   🎯 **Command Center** --- monitor active incidents, assignments, and
    operational status from one place.
-   🚑 **Rescue Team Management** --- view team availability, vehicles,
    capacity, deployment status, and locations.
-   📍 **Live GPS Tracking** --- field teams can share browser GPS
    coordinates with the backend and the live map.
-   🗺️ **Interactive Live Map** --- visualize emergency and rescue-team
    locations using Leaflet.
-   🏥 **Shelter Management** --- track shelter capacity, available
    capacity, status, and medical support.
-   📊 **Analytics Dashboard** --- monitor response and incident
    information through a dedicated analytics view.
-   🔐 **Authentication** --- registration and login with bcrypt
    password hashing and JWT-based protected routes.
-   🔄 **Real-Time Updates** --- incident and team changes can be
    broadcast through Server-Sent Events and Socket.IO.
-   🗄️ **PostgreSQL Database** --- persistent storage for users, SOS
    alerts/incidents, rescue teams, and shelters.
-   🧰 **Local One-Click Startup** --- included startup scripts and
    database setup make local development easier.

## 🧱 Tech Stack

### Frontend

-   React 19
-   Vite
-   React Router
-   Leaflet
-   React Leaflet
-   Socket.IO Client
-   CSS

### Backend

-   Node.js
-   Express 5
-   PostgreSQL
-   `pg`
-   JWT
-   bcryptjs
-   Socket.IO
-   Server-Sent Events
-   CORS
-   dotenv

## 🏗️ Architecture

``` text
┌──────────────────────┐
│   React + Vite UI    │
│ Dashboard / SOS /    │
│ Maps / Analytics     │
└──────────┬───────────┘
           │ REST API
           │ Socket.IO / SSE
           ▼
┌──────────────────────┐
│ Node.js + Express    │
│ Authentication       │
│ Dispatch Logic       │
│ Incident APIs        │
│ Team GPS Updates     │
└──────────┬───────────┘
           │ SQL
           ▼
┌──────────────────────┐
│      PostgreSQL      │
│ Users                │
│ SOS / Incidents      │
│ Rescue Teams         │
│ Shelters             │
└──────────────────────┘
```

## 📁 Project Structure

``` text
RESQFLOW/
├── backend/
│   ├── server.js
│   ├── ensure-db.js
│   ├── package.json
│   ├── .env.example
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── .env.example
├── START_RESQFLOW.bat
├── START_RESQFLOW.ps1
├── QUICK_START.md
├── DEPLOYMENT.md
└── render.yaml
```

## 🚀 Run Locally

### Requirements

-   Windows 10/11
-   Node.js 18+
-   PostgreSQL 14+
-   Git

### Option 1 --- One-click startup

From the project folder, run:

``` powershell
.\START_RESQFLOW.bat
```

The project is designed to set up the local database/tables and start
the frontend and backend.

### Option 2 --- Manual startup

#### Backend

``` powershell
cd backend
npm install
npm run setup-db
npm start
```

Backend:

``` text
http://localhost:5000
```

#### Frontend

Open a second terminal:

``` powershell
cd frontend
npm install
npm run dev
```

Frontend:

``` text
http://localhost:5173
```

If Vite selects another available port such as `5174` or `5175`, use the
URL printed in the terminal.

## 🔐 Environment Variables

Create `backend/.env` from `backend/.env.example`.

Example:

``` env
PORT=5000
DATABASE_URL=postgresql://postgres:<YOUR_PASSWORD>@127.0.0.1:5432/resqflow
JWT_SECRET=<YOUR_SECRET>
CLIENT_ORIGIN=http://localhost:5173
AUTO_DISPATCH=true
```

For production, use a strong random `JWT_SECRET` and never commit real
secrets.

The frontend can use:

``` env
VITE_API_URL=http://localhost:5000
```

## 👤 Demo Login

For a fresh local database, the application can create a demo
administrator account:

``` text
Email:    admin@resqflow.local
Password: ResQFlow123
```

Change or remove demo credentials before using the application in a real
deployment.

## 🔄 Real-Time Workflow

A typical emergency workflow is:

``` text
User sends SOS
      ↓
Incident stored in PostgreSQL
      ↓
Priority / severity evaluated
      ↓
Available rescue team selected
      ↓
Team assigned automatically (if enabled)
      ↓
Command Center updates in real time
      ↓
Team shares GPS location
      ↓
Live Map receives location updates
      ↓
Incident resolved
      ↓
Assigned team returns to AVAILABLE
```

## 🔌 Important API Capabilities

The backend provides REST endpoints for:

-   Authentication and user registration
-   Database health checks
-   SOS creation and incident management
-   Rescue-team management
-   Rescue-team GPS location updates
-   Shelter management
-   Real-time event streaming
-   Automatic dispatch workflows

Rescue-team GPS updates can be sent to:

``` http
PATCH /api/rescue-teams/:id/location
```

Example body:

``` json
{
  "latitude": 28.61,
  "longitude": 77.20
}
```

## 🗺️ Live GPS

The Rescue Teams workflow can use browser geolocation to send current
coordinates to the backend.

For production deployments, browser GPS requires a secure HTTPS context
and user location permission.

## ☁️ Deployment

The repository includes deployment documentation and a `render.yaml`
configuration.

Recommended production setup:

``` text
React/Vite frontend
        ↓
Static hosting
        ↓
HTTPS
        ↓
Node/Express backend
        ↓
Managed PostgreSQL
```

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for deployment configuration.

## 🛡️ Security Notes

-   Passwords are hashed with bcrypt.
-   Protected frontend routes require a JWT stored in session storage.
-   Socket.IO connections validate JWT authentication.
-   Production deployments should use HTTPS.
-   Do not commit `.env` files or production credentials.
-   Use a long, randomly generated JWT secret in production.
-   Restrict `CLIENT_ORIGIN` to the deployed frontend origin.

## 🎯 Why ResQFlow?

Emergency response requires fast coordination between people, incidents,
vehicles, locations, and shelters. ResQFlow demonstrates how a
full-stack application can bring those workflows into a single
operational interface while keeping updates synchronized in real time.

## 📌 Project Highlights

**Full-stack:** React + Node.js + PostgreSQL

**Real-time:** Socket.IO + Server-Sent Events

**Mapping:** Leaflet + browser Geolocation

**Security:** JWT authentication + bcrypt password hashing

**Operations:** SOS → dispatch → GPS tracking → resolution

**Deployment:** Production-oriented environment configuration and Render
setup

## 🔮 Future Improvements

-   Role-based access control for admins, dispatchers, responders, and
    citizens
-   Push/SMS emergency notifications
-   ETA and route optimization for rescue teams
-   Multi-region disaster coordination
-   Offline-first responder mode
-   Advanced incident analytics and response-time KPIs
-   Audit logs and incident history
-   Automated tests and CI/CD
-   Production observability and monitoring

## 👨‍💻 Author

**Hardik Garg**

GitHub: [@hardikgarg30](https://github.com/hardikgarg30)

------------------------------------------------------------------------

⭐ If you find ResQFlow useful, consider starring the repository.
