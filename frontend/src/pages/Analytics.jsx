import { useEffect, useState } from "react";
import { connectRealtime } from "../lib/realtime";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Analytics() {
  const [incidents, setIncidents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // =========================================
  // LOAD ALL ANALYTICS DATA
  // =========================================

  const loadData = async () => {
    try {
      const [
        incidentsRes,
        teamsRes,
        sheltersRes,
      ] = await Promise.all([
        fetch(`${API}/api/incidents`),
        fetch(`${API}/api/rescue-teams`),
        fetch(`${API}/api/shelters`),
      ]);

      if (
        !incidentsRes.ok ||
        !teamsRes.ok ||
        !sheltersRes.ok
      ) {
        throw new Error(
          "Failed to load analytics data"
        );
      }

      const incidentsData =
        await incidentsRes.json();

      const teamsData =
        await teamsRes.json();

      const sheltersData =
        await sheltersRes.json();

      setIncidents(
        incidentsData.incidents || []
      );

      setTeams(
        teamsData.teams || []
      );

      setShelters(
        sheltersData.shelters || []
      );

      setMessage("");
    } catch (error) {
      console.error(
        "ANALYTICS ERROR:",
        error
      );

      setMessage(
        "❌ Unable to load analytics. Make sure backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // LIVE AUTO REFRESH
  // =========================================

  useEffect(() => {
    loadData();

    const cleanupRealtime = connectRealtime(() => loadData());

    const interval = setInterval(
      loadData,
      5000
    );

    return () => {
      clearInterval(interval);
      cleanupRealtime();
    };
  }, []);

  // =========================================
  // INCIDENT STATISTICS
  // =========================================

  const active =
    incidents.filter(
      (item) =>
        item.status === "ACTIVE"
    ).length;

  const critical =
    incidents.filter(
      (item) =>
        item.priority === "P1"
    ).length;

  const resolved =
    incidents.filter(
      (item) =>
        item.status === "RESOLVED"
    ).length;

  const dispatched =
    incidents.filter(
      (item) =>
        item.assigned_team_id
    ).length;

  const waiting =
    incidents.filter(
      (item) =>
        !item.assigned_team_id &&
        item.status !== "RESOLVED"
    ).length;

  // =========================================
  // TEAM STATISTICS
  // =========================================

  const availableTeams =
    teams.filter(
      (team) =>
        team.status === "AVAILABLE"
    ).length;

  const busyTeams =
    teams.filter(
      (team) =>
        team.status !== "AVAILABLE"
    ).length;

  // =========================================
  // SHELTER STATISTICS
  // =========================================

  const totalCapacity =
    shelters.reduce(
      (sum, shelter) =>
        sum +
        Number(
          shelter.capacity || 0
        ),
      0
    );

  const availableCapacity =
    shelters.reduce(
      (sum, shelter) =>
        sum +
        Number(
          shelter.available_capacity ||
            0
        ),
      0
    );

  const occupiedCapacity =
    Math.max(
      0,
      totalCapacity -
        availableCapacity
    );

  const occupancy =
    totalCapacity > 0
      ? Math.round(
          (occupiedCapacity /
            totalCapacity) *
            100
        )
      : 0;

  // =========================================
  // RESPONSE RATE
  // =========================================

  const responseRate =
    incidents.length > 0
      ? Math.round(
          (dispatched /
            incidents.length) *
            100
        )
      : 0;

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="page analytics-page">

      {/* ===================================== */}
      {/* HEADER */}
      {/* ===================================== */}

      <div className="page-header">

        <div>

          <span className="section-label">
            RESQFLOW INTELLIGENCE
          </span>

          <h1>
            📊 Disaster Analytics
          </h1>

          <p>
            Real-time emergency response
            statistics and operational insights.
          </p>

        </div>

        <div className="analytics-header-actions">

          <span className="live-badge">
            ● LIVE DATA
          </span>

          <button
            className="refresh"
            onClick={loadData}
          >
            ↻ Refresh
          </button>

        </div>

      </div>

      {/* ===================================== */}
      {/* ERROR */}
      {/* ===================================== */}

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      {/* ===================================== */}
      {/* MAIN STATISTICS */}
      {/* ===================================== */}

      <div className="analytics-grid">

        <div className="analytics-card">

          <span>
            ACTIVE INCIDENTS
          </span>

          <strong>
            {loading ? "..." : active}
          </strong>

          <small>
            Currently active
          </small>

        </div>

        <div className="analytics-card danger">

          <span>
            CRITICAL ALERTS
          </span>

          <strong>
            {loading ? "..." : critical}
          </strong>

          <small>
            P1 priority incidents
          </small>

        </div>

        <div className="analytics-card success">

          <span>
            AVAILABLE TEAMS
          </span>

          <strong>
            {loading
              ? "..."
              : availableTeams}
          </strong>

          <small>
            Ready for dispatch
          </small>

        </div>

        <div className="analytics-card">

          <span>
            RESOLVED INCIDENTS
          </span>

          <strong>
            {loading ? "..." : resolved}
          </strong>

          <small>
            Successfully handled
          </small>

        </div>

        <div className="analytics-card">

          <span>
            TOTAL INCIDENTS
          </span>

          <strong>
            {loading
              ? "..."
              : incidents.length}
          </strong>

          <small>
            Recorded in system
          </small>

        </div>

        <div className="analytics-card">

          <span>
            EMERGENCY SHELTERS
          </span>

          <strong>
            {loading
              ? "..."
              : shelters.length}
          </strong>

          <small>
            Safe locations
          </small>

        </div>

      </div>

      {/* ===================================== */}
      {/* RESPONSE OVERVIEW */}
      {/* ===================================== */}

      <div className="analytics-panel">

        <div className="panel-title">

          <div>

            <span className="section-label">
              RESPONSE OVERVIEW
            </span>

            <h2>
              System Performance
            </h2>

          </div>

          <span className="live-badge">
            ● LIVE
          </span>

        </div>

        <div className="performance-list">

          <div className="performance-row">

            <span>
              🚨 Emergency incidents
            </span>

            <strong>
              {incidents.length}
            </strong>

          </div>

          <div className="performance-row">

            <span>
              🔴 Critical incidents
            </span>

            <strong>
              {critical}
            </strong>

          </div>

          <div className="performance-row">

            <span>
              🚑 Available rescue teams
            </span>

            <strong>
              {availableTeams}
            </strong>

          </div>

          <div className="performance-row">

            <span>
              🚑 Busy rescue teams
            </span>

            <strong>
              {busyTeams}
            </strong>

          </div>

          <div className="performance-row">

            <span>
              ✅ Dispatched incidents
            </span>

            <strong>
              {dispatched}
            </strong>

          </div>

          <div className="performance-row">

            <span>
              ⏳ Awaiting dispatch
            </span>

            <strong>
              {waiting}
            </strong>

          </div>

          <div className="performance-row">

            <span>
              🏠 Emergency shelters
            </span>

            <strong>
              {shelters.length}
            </strong>

          </div>

        </div>

      </div>

      {/* ===================================== */}
      {/* CAPACITY & RESPONSE */}
      {/* ===================================== */}

      <div className="analytics-grid">

        <div className="analytics-card">

          <span>
            SHELTER CAPACITY
          </span>

          <strong>
            {availableCapacity}
          </strong>

          <small>
            People can still be accommodated
          </small>

        </div>

        <div className="analytics-card danger">

          <span>
            OCCUPIED SHELTER SPACES
          </span>

          <strong>
            {occupiedCapacity}
          </strong>

          <small>
            {occupancy}% network occupancy
          </small>

        </div>

        <div className="analytics-card success">

          <span>
            RESPONSE RATE
          </span>

          <strong>
            {responseRate}%
          </strong>

          <small>
            Incidents with teams assigned
          </small>

        </div>

      </div>

      {/* ===================================== */}
      {/* LIVE STATUS */}
      {/* ===================================== */}

      <div className="analytics-panel">

        <div className="panel-title">

          <div>

            <span className="section-label">
              NETWORK STATUS
            </span>

            <h2>
              RESQFLOW Operational Status
            </h2>

          </div>

        </div>

        <div className="performance-list">

          <div className="performance-row">

            <span>
              🟢 Emergency monitoring
            </span>

            <strong>
              ONLINE
            </strong>

          </div>

          <div className="performance-row">

            <span>
              🚑 Rescue network
            </span>

            <strong>
              {teams.length > 0
                ? "ONLINE"
                : "NO TEAMS"}
            </strong>

          </div>

          <div className="performance-row">

            <span>
              🏠 Shelter network
            </span>

            <strong>
              {shelters.length > 0
                ? "ONLINE"
                : "NO SHELTERS"}
            </strong>

          </div>

          <div className="performance-row">

            <span>
              🔄 Data synchronization
            </span>

            <strong>
              LIVE
            </strong>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Analytics;