import { useCallback, useEffect, useRef, useState } from "react";
import { connectRealtime } from "../lib/realtime";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function RescueTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [trackingTeamId, setTrackingTeamId] = useState(null);
  const watchIdRef = useRef(null);
  const lastGpsUpdateRef = useRef(0);

  // =====================================================
  // LOAD RESCUE TEAMS
  // =====================================================

  const loadTeams = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `${API}/api/rescue-teams`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load rescue teams (${response.status})`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message || "Could not load rescue teams"
        );
      }

      setTeams(
        Array.isArray(data.teams)
          ? data.teams
          : []
      );

      setMessage("");
    } catch (error) {
      console.error(
        "RESCUE TEAMS ERROR:",
        error
      );

      setMessage(
        error.message ||
          "Could not load rescue teams"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setTrackingTeamId(null);
  }, []);

  const startTracking = useCallback((teamId) => {
    if (!navigator.geolocation) {
      setMessage("This device/browser does not support GPS tracking.");
      return;
    }

    stopTracking();
    setMessage(`Requesting live GPS permission for Team #${teamId}...`);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        if (now - lastGpsUpdateRef.current < 3000) return;
        lastGpsUpdateRef.current = now;

        try {
          const response = await fetch(`${API}/api/rescue-teams/${teamId}/location`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "GPS update failed");
          setMessage(`LIVE GPS: Team #${teamId} location updated.`);
          setTeams((current) => current.map((team) =>
            team.id === teamId ? { ...team, latitude: data.team.latitude, longitude: data.team.longitude } : team
          ));
        } catch (error) {
          console.error("TEAM GPS ERROR:", error);
        }
      },
      (error) => {
        console.error("TEAM GPS WATCH ERROR:", error);
        setMessage("GPS permission is required for live team tracking.");
        stopTracking();
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    setTrackingTeamId(teamId);
  }, [stopTracking]);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadTeams();

    // Refresh every 5 seconds
    const cleanupRealtime = connectRealtime(() => loadTeams(false));

    const interval = setInterval(() => {
      loadTeams(true);
    }, 5000);

    return () => {
      clearInterval(interval);
      cleanupRealtime();
      stopTracking();
    };
  }, [loadTeams, stopTracking]);

  // =====================================================
  // COUNTS
  // =====================================================

  const availableTeams = teams.filter(
    (team) =>
      String(team.status || "").toUpperCase() ===
      "AVAILABLE"
  );

  const busyTeams = teams.filter(
    (team) =>
      String(team.status || "").toUpperCase() !==
      "AVAILABLE"
  );

  const totalTeams = teams.length;

  // =====================================================
  // STATUS CLASS
  // =====================================================

  const getStatusClass = (status) => {
    const normalized = String(
      status || ""
    ).toUpperCase();

    if (normalized === "AVAILABLE") {
      return "available";
    }

    if (normalized === "DISPATCHED") {
      return "dispatched";
    }

    return "busy";
  };

  // =====================================================
  // STATUS TEXT
  // =====================================================

  const getStatusText = (status) => {
    if (!status) {
      return "UNKNOWN";
    }

    return String(status).toUpperCase();
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="page-container">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="page-header">

        <div>
          <h1>
            🚑 Rescue Teams
          </h1>

          <p>
            Monitor rescue teams and their current
            deployment status.
          </p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={() => loadTeams(true)}
          disabled={refreshing}
        >
          {refreshing
            ? "↻ Refreshing..."
            : "↻ Refresh"}
        </button>

      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="stats-grid">

        {/* AVAILABLE */}

        <div className="stat-card">

          <div className="stat-icon">
            🟢
          </div>

          <div className="stat-content">

            <div className="stat-label">
              AVAILABLE TEAMS
            </div>

            <div className="stat-value">
              {availableTeams.length}
            </div>

            <div className="stat-description">
              Ready for dispatch
            </div>

          </div>

        </div>

        {/* BUSY */}

        <div className="stat-card">

          <div className="stat-icon">
            🔴
          </div>

          <div className="stat-content">

            <div className="stat-label">
              BUSY TEAMS
            </div>

            <div className="stat-value">
              {busyTeams.length}
            </div>

            <div className="stat-description">
              Currently deployed
            </div>

          </div>

        </div>

        {/* TOTAL */}

        <div className="stat-card">

          <div className="stat-icon">
            🚑
          </div>

          <div className="stat-content">

            <div className="stat-label">
              TOTAL TEAMS
            </div>

            <div className="stat-value">
              {totalTeams}
            </div>

            <div className="stat-description">
              Registered teams
            </div>

          </div>

        </div>

        {/* NETWORK */}

        <div className="stat-card">

          <div className="stat-icon">
            📡
          </div>

          <div className="stat-content">

            <div className="stat-label">
              NETWORK STATUS
            </div>

            <div className="stat-value network-live">
              LIVE
            </div>

            <div className="stat-description">
              Updates every 5 seconds
            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          NETWORK HEADER
      ================================================= */}

      <div className="section-header">

        <div>
          <h2>
            RESCUE NETWORK
          </h2>

          <span className="live-indicator">
            <span className="live-dot"></span>
            LIVE
          </span>
        </div>

      </div>

      {/* =================================================
          ERROR MESSAGE
      ================================================= */}

      {message && (
        <div className="message error-message">
          ⚠️ {message}
        </div>
      )}

      {/* =================================================
          LOADING
      ================================================= */}

      {loading ? (

        <div className="empty-state">

          <div className="loading-icon">
            🚑
          </div>

          <h3>
            Loading rescue teams...
          </h3>

          <p>
            Connecting to RESQFLOW rescue network.
          </p>

        </div>

      ) : teams.length === 0 ? (

        /* =================================================
           NO TEAMS
        ================================================= */

        <div className="empty-state">

          <div className="empty-icon">
            🚑
          </div>

          <h3>
            No rescue teams found
          </h3>

          <p>
            There are currently no registered
            rescue teams.
          </p>

        </div>

      ) : (

        /* =================================================
           TEAM GRID
        ================================================= */

        <div className="team-grid">

          {teams.map((team) => {

            const status =
              getStatusText(team.status);

            const statusClass =
              getStatusClass(team.status);

            const hasAssignment =
              team.assigned_incident_id !==
                null &&
              team.assigned_incident_id !==
                undefined;

            return (

              <div
                className="team-card"
                key={team.id}
              >

                {/* =======================================
                    TEAM ICON
                ======================================= */}

                <div className="team-icon">
                  🚑
                </div>

                {/* =======================================
                    TEAM CONTENT
                ======================================= */}

                <div className="team-content">

                  {/* TEAM NAME */}

                  <div className="team-title-row">

                    <h3>
                      {team.name ||
                        "Unnamed Rescue Team"}
                    </h3>

                    <span
                      className={`team-status ${statusClass}`}
                    >
                      <span className="status-dot">
                        ●
                      </span>

                      {status}
                    </span>

                  </div>

                  {/* VEHICLE */}

                  <div className="team-detail">

                    <span className="detail-icon">
                      🚑
                    </span>

                    <span>
                      <strong>
                        Vehicle:
                      </strong>{" "}
                      {team.vehicle ||
                        "Not specified"}
                    </span>

                  </div>

                  {/* CAPACITY */}

                  <div className="team-detail">

                    <span className="detail-icon">
                      👥
                    </span>

                    <span>
                      <strong>
                        Capacity:
                      </strong>{" "}
                      {team.capacity ??
                        "N/A"}
                    </span>

                  </div>

                  {/* TEAM ID */}

                  <div className="team-detail">

                    <span className="detail-icon">
                      🆔
                    </span>

                    <span>
                      <strong>
                        Team ID:
                      </strong>{" "}
                      #{team.id}
                    </span>

                  </div>

                  {/* LOCATION */}

                  {(team.latitude !== null ||
                    team.longitude !== null) && (

                    <div className="team-detail">

                      <span className="detail-icon">
                        📍
                      </span>

                      <span>
                        <strong>
                          Location:
                        </strong>{" "}
                        {team.latitude},{" "}
                        {team.longitude}
                      </span>

                    </div>

                  )}

                  {/* ASSIGNMENT */}

                  <div
                    className={`incident-details ${
                      hasAssignment
                        ? "assigned"
                        : "not-assigned"
                    }`}
                  >

                    {hasAssignment ? (

                      <span>
                        🚨 Assigned Incident #
                        {team.assigned_incident_id}
                      </span>

                    ) : (

                      <span>
                        ✓ No active assignment
                      </span>

                    )}

                  </div>

                  <button
                    type="button"
                    className="refresh-button"
                    onClick={() =>
                      trackingTeamId === team.id
                        ? stopTracking()
                        : startTracking(team.id)
                    }
                  >
                    {trackingTeamId === team.id
                      ? "⏹ STOP LIVE GPS"
                      : "📍 START LIVE GPS"}
                  </button>

                </div>

              </div>

            );
          })}

        </div>

      )}

    </div>
  );
}

export default RescueTeams;