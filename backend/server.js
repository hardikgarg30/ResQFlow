const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

const JWT_SECRET =
  process.env.JWT_SECRET || "resqflow-secret-2026";
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN },
});

app.use(cors({ origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Server-Sent Events clients for real-time incident/team updates.
const realtimeClients = new Set();

function broadcastRealtime(type, payload = {}) {
  const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of realtimeClients) {
    try {
      client.write(message);
    } catch (error) {
      realtimeClients.delete(client);
    }
  }
  io.emit(type, payload);
}

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true });
});


// =====================================================
// HOME / TEST
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    project: "RESQFLOW",
    message: "RESQFLOW backend is running",
    status: "ONLINE",
  });
});

// =====================================================
// DATABASE TEST
// =====================================================

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database(), NOW()"
    );

    res.json({
      success: true,
      database: result.rows[0].current_database,
      serverTime: result.rows[0].now,
      message: "PostgreSQL connected successfully",
    });
  } catch (error) {
    console.error("DATABASE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// =====================================================
// SETUP USERS TABLE
// =====================================================

async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT
  `);
}

app.get("/api/setup-users", async (req, res) => {
  try {
    await ensureUsersTable();

    res.json({
      success: true,
      message: "Users table is ready",
    });
  } catch (error) {
    console.error("USER TABLE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Could not setup users table",
      error: error.message,
    });
  }
});

// =====================================================
// SETUP SOS TABLE
// =====================================================

async function ensureSosTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sos_alerts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      name VARCHAR(100),
      phone VARCHAR(30),
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      location TEXT,
      status VARCHAR(30) DEFAULT 'ACTIVE',
      emergency_type VARCHAR(100),
      people_affected INTEGER DEFAULT 1,
      children INTEGER DEFAULT 0,
      elderly INTEGER DEFAULT 0,
      severity VARCHAR(30) DEFAULT 'HIGH',
      battery INTEGER DEFAULT 100,
      message TEXT,
      priority VARCHAR(10) DEFAULT 'P1',
      assigned_team_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE sos_alerts
    ADD COLUMN IF NOT EXISTS emergency_type VARCHAR(100)
  `);

  await pool.query(`
    ALTER TABLE sos_alerts
    ADD COLUMN IF NOT EXISTS people_affected INTEGER DEFAULT 1
  `);

  await pool.query(`
    ALTER TABLE sos_alerts
    ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE sos_alerts
    ADD COLUMN IF NOT EXISTS elderly INTEGER DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE sos_alerts
    ADD COLUMN IF NOT EXISTS severity VARCHAR(30) DEFAULT 'HIGH'
  `);

  await pool.query(`
    ALTER TABLE sos_alerts
    ADD COLUMN IF NOT EXISTS battery INTEGER DEFAULT 100
  `);

  await pool.query(`
    ALTER TABLE sos_alerts
    ADD COLUMN IF NOT EXISTS message TEXT
  `);

  await pool.query(`
    ALTER TABLE sos_alerts
    ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'P1'
  `);

  await pool.query(`
    ALTER TABLE sos_alerts
    ADD COLUMN IF NOT EXISTS assigned_team_id INTEGER
  `);
}

app.get("/api/setup-sos", async (req, res) => {
  try {
    await ensureSosTable();

    res.json({
      success: true,
      message: "SOS table is ready",
    });
  } catch (error) {
    console.error("SOS TABLE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Could not setup SOS table",
      error: error.message,
    });
  }
});

// =====================================================
// SETUP RESCUE TEAMS TABLE
// =====================================================

async function ensureRescueTeamsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rescue_teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      status VARCHAR(30) DEFAULT 'AVAILABLE',
      vehicle VARCHAR(100),
      capacity INTEGER DEFAULT 4,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.get("/api/setup-rescue-teams", async (req, res) => {
  try {
    await ensureRescueTeamsTable();

    res.json({
      success: true,
      message: "Rescue teams table is ready",
    });
  } catch (error) {
    console.error(
      "RESCUE TEAMS TABLE ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Could not setup rescue teams table",
      error: error.message,
    });
  }
});

// =====================================================
// SETUP SHELTERS TABLE
// =====================================================

async function ensureSheltersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shelters (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      capacity INTEGER DEFAULT 0,
      available_capacity INTEGER DEFAULT 0,
      status VARCHAR(30) DEFAULT 'AVAILABLE',
      medical_support BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.get("/api/setup-shelters", async (req, res) => {
  try {
    await ensureSheltersTable();

    res.json({
      success: true,
      message: "Shelters table is ready",
    });
  } catch (error) {
    console.error("SHELTERS TABLE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Could not setup shelters table",
      error: error.message,
    });
  }
});

// =====================================================
// REGISTER
// =====================================================

app.post("/api/register", async (req, res) => {
  try {
    await ensureUsersTable();

    const {
      name,
      email,
      password,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    const cleanName = name.trim();
    const cleanEmail =
      email.trim().toLowerCase();

    const existingUser =
      await pool.query(
        `
        SELECT id
        FROM users
        WHERE email = $1
        `,
        [cleanEmail]
      );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users
      (
        name,
        email,
        password_hash
      )
      VALUES
      ($1, $2, $3)
      RETURNING id, name, email, created_at
      `,
      [
        cleanName,
        cleanEmail,
        hashedPassword,
      ]
    );

    const user = result.rows[0];

    console.log(
      `NEW USER REGISTERED: ${user.email}`
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
});

// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {
  try {
    await ensureUsersTable();

    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const cleanEmail =
      email.trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE email = $1
      `,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        message:
          "Password is not configured for this account",
      });
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

// =====================================================
// AUTH MIDDLEWARE
// =====================================================

function authenticateToken(req, res, next) {
  const authHeader =
    req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message:
        "Authorization token is required",
    });
  }

  const parts =
    authHeader.split(" ");

  if (
    parts.length !== 2 ||
    parts[0] !== "Bearer"
  ) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid authorization format",
    });
  }

  const token = parts[1];

  try {
    const decoded =
      jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token",
    });
  }
}

// =====================================================
// REAL-TIME EVENT STREAM (SSE)
// =====================================================

function authenticateSse(req, res, next) {
  const token = req.query.token;

  if (!token) {
    return res.status(401).end();
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).end();
  }
}

app.get("/api/events", authenticateSse, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  realtimeClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
      realtimeClients.delete(res);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    realtimeClients.delete(res);
  });
});

// =====================================================
// AUTOMATIC DISPATCH
// =====================================================

async function autoDispatchIncident(incidentId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const incidentResult = await client.query(
      `SELECT * FROM sos_alerts WHERE id = $1 FOR UPDATE`,
      [incidentId]
    );
    if (!incidentResult.rows[0]) {
      await client.query("ROLLBACK");
      return { incident: null, team: null };
    }

    const incident = incidentResult.rows[0];
    if (incident.status !== "ACTIVE" || incident.assigned_team_id) {
      await client.query("ROLLBACK");
      return { incident, team: null };
    }

    const teamResult = await client.query(
      `SELECT rt.*
       FROM rescue_teams rt
       WHERE rt.status = 'AVAILABLE'
         AND NOT EXISTS (
           SELECT 1 FROM sos_alerts sa
           WHERE sa.assigned_team_id = rt.id
             AND sa.status IN ('ACTIVE', 'DISPATCHED')
         )
       ORDER BY rt.id ASC
       LIMIT 1
       FOR UPDATE OF rt`
    );

    if (!teamResult.rows[0]) {
      await client.query("ROLLBACK");
      return { incident, team: null };
    }

    const team = teamResult.rows[0];
    const updatedIncident = await client.query(
      `UPDATE sos_alerts
       SET assigned_team_id = $1, status = 'DISPATCHED'
       WHERE id = $2
       RETURNING *`,
      [team.id, incidentId]
    );
    const updatedTeam = await client.query(
      `UPDATE rescue_teams SET status = 'DISPATCHED' WHERE id = $1 RETURNING *`,
      [team.id]
    );

    await client.query("COMMIT");

    const finalIncident = updatedIncident.rows[0];
    const finalTeam = updatedTeam.rows[0];
    broadcastRealtime("incident.dispatched", {
      incident: finalIncident,
      team: finalTeam,
      automatic: true,
    });
    return { incident: finalIncident, team: finalTeam };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("AUTO DISPATCH ERROR:", error);
    return { incident: null, team: null, error };
  } finally {
    client.release();
  }
}

// =====================================================
// CREATE SOS
// =====================================================

app.post("/api/sos", async (req, res) => {
  try {
    await ensureSosTable();

    const {
      name,
      phone,
      latitude,
      longitude,
      location,
      userId,
      emergency_type,
      people_affected,
      children,
      elderly,
      severity,
      battery,
      message,
    } = req.body;

    console.log(
      "===================================="
    );

    console.log("🚨 SOS REQUEST RECEIVED:");
    console.log(req.body);

    let priority = "P1";

    if (severity === "CRITICAL") {
      priority = "P1";
    } else if (severity === "HIGH") {
      priority = "P1";
    } else if (severity === "MEDIUM") {
      priority = "P2";
    } else {
      priority = "P3";
    }

    const result = await pool.query(
      `
      INSERT INTO sos_alerts
      (
        user_id,
        name,
        phone,
        latitude,
        longitude,
        location,
        status,
        emergency_type,
        people_affected,
        children,
        elderly,
        severity,
        battery,
        message,
        priority
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'ACTIVE',
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14
      )
      RETURNING *
      `,
      [
        userId || null,
        name || null,
        phone || null,
        latitude ?? null,
        longitude ?? null,
        location || null,
        emergency_type ||
          "GENERAL EMERGENCY",
        Number(
          people_affected || 1
        ),
        Number(children || 0),
        Number(elderly || 0),
        severity || "HIGH",
        Number(battery ?? 100),
        message || null,
        priority,
      ]
    );

    const alert = result.rows[0];

    console.log(
      `🚨 SOS ALERT CREATED: #${alert.id}`
    );

    broadcastRealtime("incident.created", { incident: alert });

    const autoDispatch = String(process.env.AUTO_DISPATCH ?? "true").toLowerCase() !== "false";
    let dispatchResult = { incident: alert, team: null };
    if (autoDispatch) {
      dispatchResult = await autoDispatchIncident(alert.id);
    }

    console.log(
      "===================================="
    );

    res.status(201).json({
      success: true,
      message: dispatchResult.team
        ? "SOS alert created and rescue team dispatched automatically"
        : "SOS alert created successfully",
      priority,
      alert: dispatchResult.incident || alert,
      team: dispatchResult.team,
      auto_dispatched: Boolean(dispatchResult.team),
    });
  } catch (error) {
    console.error("SOS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "SOS request failed",
      error: error.message,
    });
  }
});

// =====================================================
// UPDATE SOS / INCIDENT GPS LOCATION
// =====================================================

app.patch("/api/sos/:id/location", async (req, res) => {
  try {
    await ensureSosTable();
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    const result = await pool.query(
      `UPDATE sos_alerts
       SET latitude = $1, longitude = $2, location = $3
       WHERE id = $4
       RETURNING *`,
      [Number(latitude), Number(longitude), `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    broadcastRealtime("incident.updated", {
      incident: result.rows[0],
      action: "location",
    });

    res.json({ success: true, message: "Incident location updated", incident: result.rows[0] });
  } catch (error) {
    console.error("INCIDENT LOCATION ERROR:", error);
    res.status(500).json({ success: false, message: "Could not update incident location", error: error.message });
  }
});

// =====================================================
// GET SOS ALERTS
// =====================================================

app.get("/api/sos", async (req, res) => {
  try {
    await ensureSosTable();

    const result =
      await pool.query(`
        SELECT *
        FROM sos_alerts
        ORDER BY created_at DESC
      `);

    res.json({
      success: true,
      alerts: result.rows,
    });
  } catch (error) {
    console.error(
      "GET SOS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Could not fetch SOS alerts",
      error: error.message,
    });
  }
});

// =====================================================
// GET INCIDENTS
// =====================================================

app.get(
  "/api/incidents",
  async (req, res) => {
    try {
      await ensureSosTable();

      const result =
        await pool.query(`
          SELECT
            id,
            latitude,
            longitude,
            location,
            status,

            COALESCE(
              emergency_type,
              'GENERAL EMERGENCY'
            ) AS emergency_type,

            COALESCE(
              emergency_type,
              'Emergency Alert'
            ) AS title,

            COALESCE(
              people_affected,
              1
            ) AS people_affected,

            COALESCE(
              children,
              0
            ) AS children,

            COALESCE(
              elderly,
              0
            ) AS elderly,

            COALESCE(
              severity,
              'HIGH'
            ) AS severity,

            COALESCE(
              priority,
              'P1'
            ) AS priority,

            battery,
            message,
            assigned_team_id,
            created_at

          FROM sos_alerts

          ORDER BY
            created_at DESC
        `);

      res.json({
        success: true,
        incidents: result.rows,
      });
    } catch (error) {
      console.error(
        "GET INCIDENTS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not fetch incidents",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET SINGLE INCIDENT
// =====================================================

app.get(
  "/api/incidents/:id",
  async (req, res) => {
    try {
      await ensureSosTable();

      const { id } = req.params;

      const result =
        await pool.query(
          `
          SELECT *
          FROM sos_alerts
          WHERE id = $1
          `,
          [id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Incident not found",
        });
      }

      res.json({
        success: true,
        incident:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "GET INCIDENT ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not fetch incident",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET RESCUE TEAMS
// =====================================================

app.get(
  "/api/rescue-teams",
  async (req, res) => {
    try {
      await ensureRescueTeamsTable();

      const result =
        await pool.query(`
          SELECT
            rt.*,
            (
              SELECT sa.id
              FROM sos_alerts sa
              WHERE sa.assigned_team_id = rt.id
                AND sa.status IN ('ACTIVE', 'DISPATCHED')
              ORDER BY sa.created_at DESC
              LIMIT 1
            ) AS assigned_incident_id
          FROM rescue_teams rt
          ORDER BY rt.id ASC
        `);

      res.json({
        success: true,
        teams: result.rows,
      });
    } catch (error) {
      console.error(
        "GET TEAMS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not fetch rescue teams",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET SINGLE RESCUE TEAM
// =====================================================

app.get(
  "/api/rescue-teams/:id",
  async (req, res) => {
    try {
      await ensureRescueTeamsTable();

      const { id } = req.params;

      const result =
        await pool.query(
          `
          SELECT *
          FROM rescue_teams
          WHERE id = $1
          `,
          [id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Rescue team not found",
        });
      }

      res.json({
        success: true,
        team: result.rows[0],
      });
    } catch (error) {
      console.error(
        "GET TEAM ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not fetch rescue team",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CREATE RESCUE TEAM
// =====================================================

app.post(
  "/api/rescue-teams",
  async (req, res) => {
    try {
      await ensureRescueTeamsTable();

      const {
        name,
        status,
        vehicle,
        capacity,
        latitude,
        longitude,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message:
            "Team name is required",
        });
      }

      const result =
        await pool.query(
          `
          INSERT INTO rescue_teams
          (
            name,
            status,
            vehicle,
            capacity,
            latitude,
            longitude
          )
          VALUES
          ($1, $2, $3, $4, $5, $6)
          RETURNING *
          `,
          [
            name,
            status || "AVAILABLE",
            vehicle || null,
            Number(capacity || 4),
            latitude ?? null,
            longitude ?? null,
          ]
        );

      broadcastRealtime("team.updated", {
        team: result.rows[0],
        action: "created",
      });

      res.status(201).json({
        success: true,
        message:
          "Rescue team created",
        team:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "CREATE TEAM ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not create rescue team",
        error: error.message,
      });
    }
  }
);

async function autoDispatchOldestWaitingIncident() {
  const waiting = await pool.query(
    `SELECT id FROM sos_alerts
     WHERE status = 'ACTIVE' AND assigned_team_id IS NULL
     ORDER BY CASE priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END, created_at ASC
     LIMIT 1`
  );
  if (!waiting.rows[0]) return null;
  return autoDispatchIncident(waiting.rows[0].id);
}

// =====================================================
// UPDATE RESCUE TEAM
// =====================================================

app.patch(
  "/api/rescue-teams/:id",
  async (req, res) => {
    try {
      await ensureRescueTeamsTable();
      await ensureSosTable();

      const { id } = req.params;

      const {
        name,
        status,
        vehicle,
        capacity,
        latitude,
        longitude,
      } = req.body;

      const existing =
        await pool.query(
          `
          SELECT *
          FROM rescue_teams
          WHERE id = $1
          `,
          [id]
        );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Rescue team not found",
        });
      }

      const oldTeam =
        existing.rows[0];

      // -------------------------------------------------
      // IMPORTANT:
      // Do not allow a team with active assignments
      // to be manually changed to AVAILABLE.
      // -------------------------------------------------

      if (status === "AVAILABLE") {
        const activeAssignment =
          await pool.query(
            `
            SELECT id, status
            FROM sos_alerts
            WHERE assigned_team_id = $1
              AND status IN ('ACTIVE', 'DISPATCHED')
            LIMIT 1
            `,
            [id]
          );

        if (activeAssignment.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message:
              "This team is assigned to an active incident. Resolve the incident first.",
            incident_id:
              activeAssignment.rows[0].id,
            incident_status:
              activeAssignment.rows[0].status,
          });
        }
      }

      const result =
        await pool.query(
          `
          UPDATE rescue_teams
          SET
            name = $1,
            status = $2,
            vehicle = $3,
            capacity = $4,
            latitude = $5,
            longitude = $6
          WHERE id = $7
          RETURNING *
          `,
          [
            name ?? oldTeam.name,

            status ?? oldTeam.status,

            vehicle ?? oldTeam.vehicle,

            capacity !== undefined
              ? Number(capacity)
              : oldTeam.capacity,

            latitude !== undefined
              ? latitude
              : oldTeam.latitude,

            longitude !== undefined
              ? longitude
              : oldTeam.longitude,

            id,
          ]
        );

      console.log(
        `🚑 RESCUE TEAM #${id} UPDATED: ${result.rows[0].status}`
      );

      broadcastRealtime("team.updated", {
        team: result.rows[0],
        action: "updated",
      });

      if (String(result.rows[0].status).toUpperCase() === "AVAILABLE") {
        await autoDispatchOldestWaitingIncident();
      }

      res.json({
        success: true,
        message:
          "Rescue team updated successfully",
        team:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "UPDATE TEAM ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not update rescue team",
        error: error.message,
      });
    }
  }
);

// =====================================================
// UPDATE RESCUE TEAM GPS LOCATION
// =====================================================

app.patch("/api/rescue-teams/:id/location", async (req, res) => {
  try {
    await ensureRescueTeamsTable();
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    const result = await pool.query(
      `UPDATE rescue_teams
       SET latitude = $1, longitude = $2
       WHERE id = $3
       RETURNING *`,
      [Number(latitude), Number(longitude), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Rescue team not found",
      });
    }

    broadcastRealtime("team.location", {
      team: result.rows[0],
    });

    res.json({
      success: true,
      message: "Rescue team location updated",
      team: result.rows[0],
    });
  } catch (error) {
    console.error("TEAM LOCATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Could not update rescue team location",
      error: error.message,
    });
  }
});

// =====================================================
// DELETE RESCUE TEAM
// =====================================================

app.delete(
  "/api/rescue-teams/:id",
  async (req, res) => {
    try {
      await ensureRescueTeamsTable();
      await ensureSosTable();

      const { id } = req.params;

      const activeAssignment =
        await pool.query(
          `
          SELECT id
          FROM sos_alerts
          WHERE assigned_team_id = $1
            AND status IN ('ACTIVE', 'DISPATCHED')
          LIMIT 1
          `,
          [id]
        );

      if (activeAssignment.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            "Cannot delete a team assigned to an active incident",
          incident_id:
            activeAssignment.rows[0].id,
        });
      }

      const result =
        await pool.query(
          `
          DELETE FROM rescue_teams
          WHERE id = $1
          RETURNING *
          `,
          [id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Rescue team not found",
        });
      }

      broadcastRealtime("team.updated", {
        team: result.rows[0],
        action: "deleted",
      });

      res.json({
        success: true,
        message:
          "Rescue team deleted",
        team:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "DELETE TEAM ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not delete rescue team",
        error: error.message,
      });
    }
  }
);

// =====================================================
// DISPATCH TEAM TO INCIDENT
// =====================================================

app.post(
  "/api/incidents/:id/dispatch",
  async (req, res) => {
    const client = await pool.connect();

    try {
      await ensureSosTable();
      await ensureRescueTeamsTable();

      const { id } = req.params;

      await client.query("BEGIN");

      // -------------------------------------------------
      // LOCK INCIDENT
      // -------------------------------------------------

      const incidentResult =
        await client.query(
          `
          SELECT *
          FROM sos_alerts
          WHERE id = $1
          FOR UPDATE
          `,
          [id]
        );

      if (
        incidentResult.rows.length === 0
      ) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message:
            "Incident not found",
        });
      }

      const incident =
        incidentResult.rows[0];

      // -------------------------------------------------
      // INCIDENT ALREADY HAS TEAM
      // -------------------------------------------------

      if (
        incident.assigned_team_id !== null &&
        incident.assigned_team_id !== undefined
      ) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            "A rescue team is already assigned to this incident",
          assigned_team_id:
            incident.assigned_team_id,
        });
      }

      // -------------------------------------------------
      // ONLY ACTIVE INCIDENT CAN BE DISPATCHED
      // -------------------------------------------------

      if (incident.status !== "ACTIVE") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            `Incident cannot be dispatched because its status is ${incident.status}`,
        });
      }

      // -------------------------------------------------
      // FIND AVAILABLE TEAM
      // IMPORTANT:
      // NOT currently assigned to another ACTIVE/DISPATCHED
      // incident.
      // -------------------------------------------------

      const teamResult =
        await client.query(
          `
          SELECT rt.*
          FROM rescue_teams rt
          WHERE rt.status = 'AVAILABLE'
            AND NOT EXISTS (
              SELECT 1
              FROM sos_alerts sa
              WHERE sa.assigned_team_id = rt.id
                AND sa.status IN ('ACTIVE', 'DISPATCHED')
            )
          ORDER BY rt.id ASC
          LIMIT 1
          FOR UPDATE OF rt
          `
        );

      if (
        teamResult.rows.length === 0
      ) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            "No available rescue team",
        });
      }

      const team =
        teamResult.rows[0];

      // -------------------------------------------------
      // ASSIGN TEAM TO INCIDENT
      // -------------------------------------------------

      const updatedIncident =
        await client.query(
          `
          UPDATE sos_alerts
          SET
            assigned_team_id = $1,
            status = 'DISPATCHED'
          WHERE id = $2
          RETURNING *
          `,
          [
            team.id,
            id,
          ]
        );

      // -------------------------------------------------
      // MARK TEAM DISPATCHED
      // -------------------------------------------------

      const updatedTeam =
        await client.query(
          `
          UPDATE rescue_teams
          SET status = 'DISPATCHED'
          WHERE id = $1
          RETURNING *
          `,
          [team.id]
        );

      await client.query("COMMIT");

      const finalIncident =
        updatedIncident.rows[0];

      const finalTeam =
        updatedTeam.rows[0];

      console.log(
        `🚑 TEAM #${finalTeam.id} DISPATCHED TO INCIDENT #${id}`
      );

      broadcastRealtime("incident.dispatched", {
        incident: finalIncident,
        team: finalTeam,
      });

      res.json({
        success: true,
        message:
          "Rescue team dispatched successfully",
        team: finalTeam,
        incident: finalIncident,
      });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "ROLLBACK ERROR:",
          rollbackError
        );
      }

      console.error(
        "DISPATCH ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not dispatch rescue team",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// =====================================================
// UPDATE SOS / INCIDENT STATUS
// =====================================================

app.patch(
  "/api/sos/:id",
  async (req, res) => {
    const client = await pool.connect();

    try {
      await ensureSosTable();
      await ensureRescueTeamsTable();

      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message:
            "Status is required",
        });
      }

      const allowedStatuses = [
        "ACTIVE",
        "DISPATCHED",
        "RESOLVED",
      ];

      if (
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Use ACTIVE, DISPATCHED or RESOLVED.",
        });
      }

      await client.query("BEGIN");

      // -------------------------------------------------
      // LOCK INCIDENT
      // -------------------------------------------------

      const incidentResult =
        await client.query(
          `
          SELECT *
          FROM sos_alerts
          WHERE id = $1
          FOR UPDATE
          `,
          [id]
        );

      if (
        incidentResult.rows.length === 0
      ) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message:
            "SOS alert not found",
        });
      }

      const incident =
        incidentResult.rows[0];

      // -------------------------------------------------
      // UPDATE INCIDENT
      // -------------------------------------------------

      const result =
        await client.query(
          `
          UPDATE sos_alerts
          SET status = $1
          WHERE id = $2
          RETURNING *
          `,
          [
            status,
            id,
          ]
        );

      // -------------------------------------------------
      // RESOLVE INCIDENT
      // AUTOMATICALLY FREE TEAM
      // -------------------------------------------------

      if (
        status === "RESOLVED" &&
        incident.assigned_team_id !== null
      ) {
        await client.query(
          `
          UPDATE rescue_teams
          SET status = 'AVAILABLE'
          WHERE id = $1
          `,
          [
            incident.assigned_team_id,
          ]
        );

        console.log(
          `✅ INCIDENT #${id} RESOLVED`
        );

        console.log(
          `✅ TEAM #${incident.assigned_team_id} IS NOW AVAILABLE`
        );
      }

      await client.query("COMMIT");

      broadcastRealtime("incident.updated", {
        incident: result.rows[0],
      });

      if (status === "RESOLVED" && incident.assigned_team_id !== null) {
        const freedTeam = await pool.query(
          "SELECT * FROM rescue_teams WHERE id = $1",
          [incident.assigned_team_id]
        );
        if (freedTeam.rows[0]) {
          broadcastRealtime("team.updated", {
            team: freedTeam.rows[0],
            action: "freed",
          });
        }
      }

      res.json({
        success: true,
        message:
          "SOS status updated",
        alert:
          result.rows[0],
      });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "ROLLBACK ERROR:",
          rollbackError
        );
      }

      console.error(
        "UPDATE SOS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not update SOS status",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// =====================================================
// GET SHELTERS
// =====================================================

app.get(
  "/api/shelters",
  async (req, res) => {
    try {
      await ensureSheltersTable();

      const result =
        await pool.query(`
          SELECT *
          FROM shelters
          ORDER BY id ASC
        `);

      res.json({
        success: true,
        shelters:
          result.rows,
      });
    } catch (error) {
      console.error(
        "GET SHELTERS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not fetch shelters",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CREATE SHELTER
// =====================================================

app.post(
  "/api/shelters",
  async (req, res) => {
    try {
      await ensureSheltersTable();

      const {
        name,
        latitude,
        longitude,
        capacity,
        available_capacity,
        status,
        medical_support,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message:
            "Shelter name is required",
        });
      }

      const result =
        await pool.query(
          `
          INSERT INTO shelters
          (
            name,
            latitude,
            longitude,
            capacity,
            available_capacity,
            status,
            medical_support
          )
          VALUES
          ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
          `,
          [
            name,
            latitude ?? null,
            longitude ?? null,
            Number(capacity || 0),
            Number(
              available_capacity || 0
            ),
            status || "AVAILABLE",
            Boolean(
              medical_support
            ),
          ]
        );

      res.status(201).json({
        success: true,
        message:
          "Shelter created",
        shelter:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "CREATE SHELTER ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not create shelter",
        error: error.message,
      });
    }
  }
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
  "/api/health",
  async (req, res) => {
    try {
      await pool.query("SELECT 1");

      res.json({
        success: true,
        backend: "ONLINE",
        database: "CONNECTED",
        port: PORT,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        backend: "ONLINE",
        database: "DISCONNECTED",
        error: error.message,
      });
    }
  }
);

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message:
      "API route not found",
    path: req.originalUrl,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Internal server error",
      error: error.message,
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

httpServer.listen(
  PORT,
  () => {
    console.log(
      "===================================="
    );

    console.log(
      `🚨 RESQFLOW backend running on http://localhost:${PORT}`
    );

    console.log(
      "===================================="
    );
  }
);