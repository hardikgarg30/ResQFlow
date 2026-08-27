import { useEffect, useState } from "react";
import "../App.css";
import DisasterMap from "../components/DisasterMap";
import { connectRealtime } from "../lib/realtime";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Home() {
  const [incidents, setIncidents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [sendingSOS, setSendingSOS] = useState(false);
  const [dispatching, setDispatching] = useState(null);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    emergency_type: "HOUSE FLOODED",
    people_affected: 1,
    children: 0,
    elderly: 0,
    severity: "HIGH",
    battery: 80,
    message: "",
  });

  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
  });

  // =====================================================
  // LOAD INCIDENTS
  // =====================================================

  const loadIncidents = async () => {
    try {
      const response = await fetch(`${API}/api/incidents`);

      if (!response.ok) {
        throw new Error("Incidents API failed");
      }

      const data = await response.json();

      setIncidents(data.incidents || []);
    } catch (error) {
      console.error("Incidents error:", error);
    }
  };

  // =====================================================
  // LOAD RESCUE TEAMS
  // =====================================================

  const loadTeams = async () => {
    try {
      const response = await fetch(`${API}/api/rescue-teams`);

      if (!response.ok) {
        throw new Error("Teams API failed");
      }

      const data = await response.json();

      setTeams(data.teams || []);
    } catch (error) {
      console.error("Teams error:", error);
    }
  };

  // =====================================================
  // LOAD SHELTERS
  // =====================================================

  const loadShelters = async () => {
    try {
      const response = await fetch(`${API}/api/shelters`);

      if (!response.ok) {
        throw new Error("Shelters API failed");
      }

      const data = await response.json();

      setShelters(data.shelters || []);
    } catch (error) {
      console.error("Shelters error:", error);
    }
  };

  // =====================================================
  // LOAD SOS ALERTS
  // =====================================================

  const loadSOSAlerts = async () => {
    try {
      const response = await fetch(`${API}/api/sos`);

      if (!response.ok) {
        throw new Error("SOS API failed");
      }

      const data = await response.json();

      setSosAlerts(data.alerts || []);
    } catch (error) {
      console.error("SOS alerts error:", error);
    }
  };

  // =====================================================
  // LOAD ALL DATA
  // =====================================================

  const loadData = async () => {
    setLoading(true);

    await Promise.allSettled([
      loadIncidents(),
      loadTeams(),
      loadShelters(),
      loadSOSAlerts(),
    ]);

    setLoading(false);
  };

  // =====================================================
  // GPS LOCATION
  // =====================================================

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setMessage(
        "GPS is not supported by this browser."
      );
      return;
    }

    setMessage(
      "Detecting GPS location... 📍"
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        setLocation({
          latitude,
          longitude,
        });

        setMessage(
          `GPS location detected 📍 ${latitude.toFixed(
            5
          )}, ${longitude.toFixed(5)}`
        );
      },

      (error) => {
        console.error(
          "GPS error:",
          error
        );

        setMessage(
          "GPS permission denied. Please allow location access."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // =====================================================
  // SEND SOS
  // =====================================================

  const sendSOS = async (e) => {
    e.preventDefault();

    if (
      location.latitude === null ||
      location.longitude === null
    ) {
      setMessage(
        "Please click Detect GPS first 📍"
      );
      return;
    }

    try {
      setSendingSOS(true);

      setMessage(
        "Sending emergency SOS... ??"
      );

      // -----------------------------------------------
      // Get logged-in user information if available
      // -----------------------------------------------

      let user = null;

      try {
        const savedUser =
          localStorage.getItem("user");

        if (savedUser) {
          user = JSON.parse(savedUser);
        }
      } catch (error) {
        console.warn(
          "Could not read saved user:",
          error
        );
      }

      // -----------------------------------------------
      // Prepare SOS request
      // -----------------------------------------------

      const sosPayload = {
        name:
          user?.name ||
          "RESQFLOW USER",

        phone:
          user?.phone ||
          "",

        userId:
          user?.id ||
          null,

        latitude:
          location.latitude,

        longitude:
          location.longitude,

        location:
          `${location.latitude.toFixed(
            6
          )}, ${location.longitude.toFixed(6)}`,

        emergency_type:
          form.emergency_type,

        people_affected:
          Number(
            form.people_affected
          ),

        children:
          Number(
            form.children
          ),

        elderly:
          Number(
            form.elderly
          ),

        severity:
          form.severity,

        battery:
          Number(
            form.battery
          ),

        message:
          form.message,
      };

      console.log(
        "SENDING SOS:",
        sosPayload
      );

      // -----------------------------------------------
      // API REQUEST
      // -----------------------------------------------

      const response = await fetch(
        `${API}/api/sos`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              sosPayload
            ),
        }
      );

      // -----------------------------------------------
      // SAFE JSON PARSING
      // Prevents:
      // Unexpected token '<'
      // -----------------------------------------------

      const responseText =
        await response.text();

      console.log(
        "RAW SOS RESPONSE:",
        responseText
      );

      let data;

      try {
        data =
          JSON.parse(
            responseText
          );
      } catch (jsonError) {
        throw new Error(
          `Server returned non-JSON response (${response.status}).`
        );
      }

      console.log(
        "SOS RESPONSE:",
        data
      );

      // -----------------------------------------------
      // API ERROR
      // -----------------------------------------------

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "SOS request failed"
        );
      }

      // -----------------------------------------------
      // SUCCESS
      // -----------------------------------------------

      const priority =
        data.priority ||
        data.alert?.priority ||
        "P1";

      setMessage(
        `?? SOS SENT SUCCESSFULLY — ${priority} PRIORITY`
      );

      // -----------------------------------------------
      // RESET FORM
      // -----------------------------------------------

      setForm({
        emergency_type:
          "HOUSE FLOODED",

        people_affected: 1,

        children: 0,

        elderly: 0,

        severity: "HIGH",

        battery: 80,

        message: "",
      });

      // -----------------------------------------------
      // REFRESH DASHBOARD
      // -----------------------------------------------

      await loadData();

    } catch (error) {
      console.error(
        "SOS ERROR:",
        error
      );

      setMessage(
        `❌ SOS failed: ${error.message}`
      );
    } finally {
      setSendingSOS(false);
    }
  };

  // =====================================================
  // MANUAL DISPATCH
  // =====================================================

  const dispatchTeam = async (
    incidentId
  ) => {
    try {
      setDispatching(
        incidentId
      );

      setMessage(
        `🚑 Finding available rescue team for Incident #${incidentId}...`
      );

      const response =
        await fetch(
          `${API}/api/incidents/${incidentId}/dispatch`,
          {
            method: "POST",
          }
        );

      const responseText =
        await response.text();

      let data;

      try {
        data =
          JSON.parse(
            responseText
          );
      } catch {
        throw new Error(
          `Server returned non-JSON response (${response.status})`
        );
      }

      console.log(
        "DISPATCH RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "Dispatch failed"
        );
      }

      setMessage(
        `🚑 ${
          data.team?.name ||
          "Rescue team"
        } dispatched successfully to Incident #${incidentId}`
      );

      await loadData();

    } catch (error) {
      console.error(
        "DISPATCH ERROR:",
        error
      );

      setMessage(
        `❌ ${error.message}`
      );
    } finally {
      setDispatching(null);
    }
  };

  // =====================================================
  // START APP
  // =====================================================

  useEffect(() => {
    detectLocation();
    loadData();

    const cleanupRealtime = connectRealtime(() => loadData());

    const interval =
      setInterval(() => {
        loadData();
      }, 5000);

    return () => {
      clearInterval(interval);
      cleanupRealtime();
    };
  }, []);

  // =====================================================
  // STATISTICS
  // =====================================================

  const activeIncidents =
    incidents.filter(
      (item) =>
        item.status ===
        "ACTIVE"
    );

  const criticalIncidents =
    incidents.filter(
      (item) =>
        item.priority ===
        "P1"
    );

  const availableTeams =
    teams.filter(
      (team) =>
        team.status ===
        "AVAILABLE"
    );

  const activeSOS =
    sosAlerts.filter(
      (alert) =>
        alert.status ===
        "ACTIVE"
    );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="app">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="header">

        <div className="brand">

          <div className="logo">
            ??
          </div>

          <div>
            <h1>
              RESQFLOW
            </h1>

            <p>
              Emergency Response Network
            </p>
          </div>

        </div>

        <div className="system-status">

          <span className="status-dot"></span>

          SYSTEM ONLINE

        </div>

      </header>

      {/* ================================================= */}
      {/* HERO */}
      {/* ================================================= */}

      <section className="hero">

        <div>

          <span className="eyebrow">
            REAL-TIME DISASTER RESPONSE
          </span>

          <h2>
            When every second
            <span> matters.</span>
          </h2>

          <p>
            RESQFLOW connects citizens,
            rescue teams and emergency
            responders through one
            intelligent disaster management
            platform.
          </p>

        </div>

        <div className="hero-badge">

          <div>
            ??
          </div>

          <strong>
            24/7
          </strong>

          <span>
            EMERGENCY CHANNEL
          </span>

        </div>

      </section>

      {/* ================================================= */}
      {/* STATS */}
      {/* ================================================= */}

      <section className="stats">

        <div className="stat-card">

          <span>
            ACTIVE INCIDENTS
          </span>

          <strong>
            {activeIncidents.length}
          </strong>

          <small>
            Live database
          </small>

        </div>

        <div className="stat-card danger">

          <span>
            CRITICAL ALERTS
          </span>

          <strong>
            {criticalIncidents.length}
          </strong>

          <small>
            P1 priority
          </small>

        </div>

        <div className="stat-card success">

          <span>
            AVAILABLE TEAMS
          </span>

          <strong>
            {availableTeams.length}
          </strong>

          <small>
            Ready for dispatch
          </small>

        </div>

        <div className="stat-card">

          <span>
            ACTIVE SOS
          </span>

          <strong>
            {activeSOS.length}
          </strong>

          <small>
            Emergency alerts
          </small>

        </div>

        <div className="stat-card">

          <span>
            SHELTERS
          </span>

          <strong>
            {shelters.length}
          </strong>

          <small>
            Emergency locations
          </small>

        </div>

      </section>

      {/* ================================================= */}
      {/* MAIN */}
      {/* ================================================= */}

      <main className="dashboard">

        {/* ================================================= */}
        {/* SOS PANEL */}
        {/* ================================================= */}

        <section className="panel sos-panel">

          <div className="panel-title">

            <div>

              <span className="section-label">
                EMERGENCY CHANNEL
              </span>

              <h2>
                Send SOS
              </h2>

            </div>

            <span className="live-badge">
              ● LIVE
            </span>

          </div>

          <form
            onSubmit={sendSOS}
          >

            <label>
              Emergency Type
            </label>

            <select
              value={
                form.emergency_type
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  emergency_type:
                    e.target.value,
                })
              }
            >

              <option>
                HOUSE FLOODED
              </option>

              <option>
                MEDICAL EMERGENCY
              </option>

              <option>
                FIRE
              </option>

              <option>
                EARTHQUAKE
              </option>

              <option>
                TRAPPED PERSON
              </option>

              <option>
                OTHER
              </option>

            </select>

            <div className="form-grid">

              <div>

                <label>
                  People
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    form.people_affected
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      people_affected:
                        e.target.value,
                    })
                  }
                />

              </div>

              <div>

                <label>
                  Children
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.children
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      children:
                        e.target.value,
                    })
                  }
                />

              </div>

              <div>

                <label>
                  Elderly
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.elderly
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      elderly:
                        e.target.value,
                    })
                  }
                />

              </div>

            </div>

            <label>
              Severity
            </label>

            <select
              value={
                form.severity
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  severity:
                    e.target.value,
                })
              }
            >

              <option>
                LOW
              </option>

              <option>
                MEDIUM
              </option>

              <option>
                HIGH
              </option>

              <option>
                CRITICAL
              </option>

            </select>

            <label>
              Battery %
            </label>

            <input
              type="number"
              min="0"
              max="100"
              value={
                form.battery
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  battery:
                    e.target.value,
                })
              }
            />

            <label>
              Emergency Message
            </label>

            <textarea
              placeholder="Describe the emergency..."
              value={
                form.message
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  message:
                    e.target.value,
                })
              }
            />

            {/* GPS */}

            <div className="gps-box">

              <div>

                <strong>
                  📍 GPS LOCATION
                </strong>

                <p>
                  {location.latitude !==
                  null
                    ? `Latitude: ${location.latitude}`
                    : "Location not detected"}
                </p>

                <p>
                  {location.longitude !==
                  null
                    ? `Longitude: ${location.longitude}`
                    : ""}
                </p>

              </div>

              <button
                type="button"
                className="gps-button"
                onClick={
                  detectLocation
                }
              >
                Detect GPS
              </button>

            </div>

            {/* SOS BUTTON */}

            <button
              className="sos-button"
              type="submit"
              disabled={
                sendingSOS
              }
            >

              {sendingSOS
                ? "?? SENDING SOS..."
                : "?? SEND EMERGENCY SOS"}

            </button>

          </form>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

        </section>

        {/* ================================================= */}
        {/* COMMAND CENTER */}
        {/* ================================================= */}

        <section className="panel command-panel">

          <div className="panel-title">

            <div>

              <span className="section-label">
                LIVE COMMAND CENTER
              </span>

              <h2>
                Active Incidents
              </h2>

            </div>

            <button
              className="refresh"
              onClick={
                loadData
              }
            >
              ↻ Refresh
            </button>

          </div>

          {loading ? (

            <div className="empty">
              Loading live incidents...
            </div>

          ) : incidents.length === 0 ? (

            <div className="empty">
              No active incidents 🎉
            </div>

          ) : (

            <div className="incident-list">

              {incidents.map(
                (incident) => (

                  <div
                    className="incident"
                    key={
                      incident.id
                    }
                  >

                    <div className="incident-top">

                      <span
                        className={`priority ${String(
                          incident.priority ||
                          "P1"
                        ).toLowerCase()}`}
                      >
                        {incident.priority ||
                          "P1"}
                      </span>

                      <span className="incident-status">
                        ●{" "}
                        {incident.status ||
                          "ACTIVE"}
                      </span>

                    </div>

                    <h3>
                      {incident.title ||
                        incident.emergency_type ||
                        "Emergency Incident"}
                    </h3>

                    <div className="incident-info">

                      <div>

                        <span>
                          LOCATION
                        </span>

                        <strong>
                          {incident.latitude},{" "}
                          {incident.longitude}
                        </strong>

                      </div>

                      <div>

                        <span>
                          PEOPLE AFFECTED
                        </span>

                        <strong>
                          {
                            incident.people_affected
                          }
                        </strong>

                      </div>

                    </div>

                    <div className="incident-bottom">

                      <span>
                        🚑{" "}
                        {incident.assigned_team_id
                          ? `Team #${incident.assigned_team_id}`
                          : "Awaiting dispatch"}
                      </span>

                      <span>
                        Incident #
                        {incident.id}
                      </span>

                      {!incident.assigned_team_id &&
                        incident.status !==
                          "RESOLVED" && (

                          <button
                            className="dispatch-button"
                            disabled={
                              dispatching ===
                              incident.id
                            }
                            onClick={() =>
                              dispatchTeam(
                                incident.id
                              )
                            }
                          >

                            {dispatching ===
                            incident.id
                              ? "🚑 DISPATCHING..."
                              : "🚑 DISPATCH TEAM"}

                          </button>

                        )}

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

      {/* ================================================= */}
      {/* LIVE DISASTER MAP */}
      {/* ================================================= */}

      <section className="lower-section">

        <DisasterMap />

      </section>

      {/* ================================================= */}
      {/* RESCUE TEAMS */}
      {/* ================================================= */}

      <section className="lower-section">

        <div className="panel">

          <div className="panel-title">

            <div>

              <span className="section-label">
                FIELD OPERATIONS
              </span>

              <h2>
                Rescue Teams
              </h2>

            </div>

            <span className="live-badge">
              ● LIVE
            </span>

          </div>

          <div className="team-grid">

            {teams.length === 0 ? (

              <div className="empty">
                No rescue teams found.
              </div>

            ) : (

              teams.map(
                (team) => (

                  <div
                    className="team-card"
                    key={
                      team.id
                    }
                  >

                    <div className="team-icon">
                      🚑
                    </div>

                    <div className="team-content">

                      <h3>
                        {team.name}
                      </h3>

                      <span
                        className={
                          team.status ===
                          "AVAILABLE"
                            ? "available"
                            : "busy"
                        }
                      >
                        ● {team.status}
                      </span>

                      <p>
                        Vehicle:{" "}
                        {team.vehicle ||
                          "N/A"}
                      </p>

                      <p>
                        Capacity:{" "}
                        {team.capacity ||
                          "N/A"}
                      </p>

                      <p>
                        Team ID: #
                        {team.id}
                      </p>

                    </div>

                  </div>

                )
              )

            )}

          </div>

        </div>

      </section>

      {/* ================================================= */}
      {/* SHELTERS */}
      {/* ================================================= */}

      <section className="lower-section">

        <div className="panel">

          <div className="panel-title">

            <div>

              <span className="section-label">
                EVACUATION NETWORK
              </span>

              <h2>
                Emergency Shelters
              </h2>

            </div>

            <span className="live-badge">
              ● LIVE
            </span>

          </div>

          <div className="shelter-grid">

            {shelters.length === 0 ? (

              <div className="empty">
                No emergency shelters found.
              </div>

            ) : (

              shelters.map(
                (shelter) => (

                  <div
                    className="shelter-card"
                    key={
                      shelter.id
                    }
                  >

                    <div className="shelter-icon">
                      🏠
                    </div>

                    <div>

                      <h3>
                        {shelter.name}
                      </h3>

                      <p>
                        📍{" "}
                        {shelter.latitude},{" "}
                        {shelter.longitude}
                      </p>

                      <div className="capacity">

                        <span>
                          Available
                        </span>

                        <strong>
                          {
                            shelter.available_capacity
                          }
                          /
                          {
                            shelter.capacity
                          }
                        </strong>

                      </div>

                      <span className="safe">
                        ●{" "}
                        {shelter.status ||
                          "AVAILABLE"}
                      </span>

                      {shelter.medical_support && (

                        <span className="medical">
                          🏥 Medical Support
                        </span>

                      )}

                    </div>

                  </div>

                )
              )

            )}

          </div>

        </div>

      </section>

      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <footer>

        <strong>
          RESQFLOW
        </strong>

        <span>
          Emergency Response Network
        </span>

        <span>
          Backend: localhost:5000 • PostgreSQL Connected
        </span>

      </footer>

    </div>
  );
}

export default Home;

