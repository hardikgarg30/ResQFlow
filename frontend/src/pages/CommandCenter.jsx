import { useEffect, useState } from "react";
import { connectRealtime } from "../lib/realtime";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function CommandCenter() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(null);
  const [message, setMessage] = useState("");

  // =========================================
  // LOAD INCIDENTS
  // =========================================

  const loadIncidents = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API}/api/incidents`);

      if (!response.ok) {
        throw new Error("Failed to load incidents");
      }

      const data = await response.json();

      setIncidents(
        Array.isArray(data.incidents)
          ? data.incidents
          : []
      );
    } catch (error) {
      console.error("INCIDENT LOAD ERROR:", error);

      setMessage(
        "Could not connect to RESQFLOW backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // DISPATCH TEAM
  // =========================================

  const dispatchTeam = async (incidentId) => {
    try {
      setDispatching(incidentId);
      setMessage("");

      const response = await fetch(
        `${API}/api/incidents/${incidentId}/dispatch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Dispatch failed"
        );
      }

      setMessage(
        `Rescue Team #${data.team.id} dispatched to Incident #${incidentId}.`
      );

      await loadIncidents();
    } catch (error) {
      console.error("DISPATCH ERROR:", error);

      setMessage(
        error.message || "Could not dispatch rescue team."
      );
    } finally {
      setDispatching(null);
    }
  };

  // =========================================
  // INITIAL LOAD
  // =========================================

  useEffect(() => {
    loadIncidents();

    const cleanupRealtime = connectRealtime(() => loadIncidents());

    const interval = setInterval(
      loadIncidents,
      10000
    );

    return () => {
      clearInterval(interval);
      cleanupRealtime();
    };
  }, []);

  // =========================================
  // HELPERS
  // =========================================

  const getStatus = (incident) =>
    String(
      incident?.status || "ACTIVE"
    ).toUpperCase();

  // =========================================
  // ACTIVE INCIDENTS
  // =========================================

  const activeIncidents = incidents.filter(
    (incident) =>
      getStatus(incident) !== "RESOLVED"
  );

  // =========================================
  // CRITICAL / P1
  // =========================================

  const criticalIncidents =
    activeIncidents.filter(
      (incident) =>
        String(
          incident?.priority || ""
        ).toUpperCase() === "P1"
    );

  // =========================================
  // DISPATCHED
  // =========================================

  const dispatchedIncidents =
    incidents.filter(
      (incident) =>
        getStatus(incident) === "DISPATCHED" &&
        incident?.assigned_team_id !== null &&
        incident?.assigned_team_id !== undefined
    );

  // =========================================
  // WAITING
  // =========================================

  const waitingIncidents =
    incidents.filter(
      (incident) =>
        getStatus(incident) === "ACTIVE" &&
        !incident?.assigned_team_id
    );

  // =========================================
  // VISIBLE INCIDENTS
  // =========================================

  const visibleIncidents =
    incidents.filter(
      (incident) =>
        getStatus(incident) !== "RESOLVED"
    );

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="page">

      {/* HEADER */}

      <div className="page-header">

        <div>
          <span className="section-label">
            LIVE OPERATIONS
          </span>

          <h1>
            Command Center
          </h1>

          <p>
            Monitor active emergencies and
            coordinate rescue operations.
          </p>
        </div>

        <button
          className="refresh"
          onClick={loadIncidents}
          disabled={loading}
        >
          Refresh
        </button>

      </div>

      {/* STATISTICS */}

      <div className="analytics-grid">

        <div className="analytics-card">
          <span>
            ACTIVE INCIDENTS
          </span>

          <strong>
            {activeIncidents.length}
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
            {criticalIncidents.length}
          </strong>

          <small>
            P1 priority
          </small>
        </div>

        <div className="analytics-card success">
          <span>
            DISPATCHED
          </span>

          <strong>
            {dispatchedIncidents.length}
          </strong>

          <small>
            Rescue teams assigned
          </small>
        </div>

        <div className="analytics-card">
          <span>
            AWAITING DISPATCH
          </span>

          <strong>
            {waitingIncidents.length}
          </strong>

          <small>
            Need rescue team
          </small>
        </div>

      </div>

      {/* INCIDENT PANEL */}

      <div className="analytics-panel">

        <div className="panel-title">

          <div>
            <span className="section-label">
              EMERGENCY DATABASE
            </span>

            <h2>
              Active Incidents
            </h2>
          </div>

          <span className="live-badge">
            LIVE
          </span>

        </div>

        {/* MESSAGE */}

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {/* LOADING */}

        {loading ? (

          <div className="empty">
            Loading live incidents...
          </div>

        ) : visibleIncidents.length === 0 ? (

          <div className="empty">
            No active incidents.

            <p>
              New SOS requests will appear here
              automatically.
            </p>
          </div>

        ) : (

          <div className="incident-list">

            {visibleIncidents.map(
              (incident) => {

                const status =
                  getStatus(incident);

                const hasTeam =
                  incident?.assigned_team_id !==
                    null &&
                  incident?.assigned_team_id !==
                    undefined;

                const isDispatching =
                  dispatching === incident.id;

                return (
                  <div
                    className="incident"
                    key={incident.id}
                  >

                    {/* TOP */}

                    <div className="incident-top">

                      <span
                        className={`priority ${String(
                          incident.priority || "P3"
                        ).toLowerCase()}`}
                      >
                        {incident.priority || "P3"}
                      </span>

                      <span className="incident-status">
                        {status}
                      </span>

                    </div>

                    {/* TITLE */}

                    <h3>
                      {incident.title ||
                        incident.emergency_type ||
                        "Emergency Incident"}
                    </h3>

                    {/* DETAILS */}

                    <div className="incident-details">

                      <span>
                        Emergency:{" "}
                        {incident.emergency_type ||
                          "GENERAL EMERGENCY"}
                      </span>

                      <span>
                        Severity:{" "}
                        {incident.severity || "HIGH"}
                      </span>

                      {Number(
                        incident.children || 0
                      ) > 0 && (
                        <span>
                          Children:{" "}
                          {incident.children}
                        </span>
                      )}

                      {Number(
                        incident.elderly || 0
                      ) > 0 && (
                        <span>
                          Elderly:{" "}
                          {incident.elderly}
                        </span>
                      )}

                      {incident.battery !== null &&
                        incident.battery !==
                          undefined && (
                          <span>
                            Battery:{" "}
                            {incident.battery}%
                          </span>
                        )}

                    </div>

                    {/* MESSAGE */}

                    {incident.message && (
                      <div className="incident-message">

                        <span>
                          MESSAGE
                        </span>

                        <p>
                          {incident.message}
                        </p>

                      </div>
                    )}

                    {/* INFORMATION */}

                    <div className="incident-info">

                      <div>
                        <span>
                          LOCATION
                        </span>

                        <strong>
                          {incident.latitude !==
                            undefined &&
                          incident.latitude !== null
                            ? Number(
                                incident.latitude
                              ).toFixed(6)
                            : "N/A"}

                          {" , "}

                          {incident.longitude !==
                            undefined &&
                          incident.longitude !== null
                            ? Number(
                                incident.longitude
                              ).toFixed(6)
                            : "N/A"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          PEOPLE AFFECTED
                        </span>

                        <strong>
                          {incident.people_affected ||
                            0}
                        </strong>
                      </div>

                      <div>
                        <span>
                          INCIDENT ID
                        </span>

                        <strong>
                          #{incident.id}
                        </strong>
                      </div>

                    </div>

                    {/* BOTTOM */}

                    <div className="incident-bottom">

                      <span>
                        {hasTeam
                          ? `Team #${incident.assigned_team_id}`
                          : "Awaiting dispatch"}
                      </span>

                      <span>
                        Status: {status}
                      </span>

                      {/* DISPATCH BUTTON */}

                      {!hasTeam &&
                        status === "ACTIVE" && (

                          <button
                            className="dispatch-button"
                            disabled={isDispatching}
                            onClick={() =>
                              dispatchTeam(
                                incident.id
                              )
                            }
                          >
                            {isDispatching
                              ? "DISPATCHING..."
                              : "DISPATCH TEAM"}
                          </button>

                        )}

                      {/* DISPATCHED */}

                      {hasTeam &&
                        status === "DISPATCHED" && (

                          <span className="safe">
                            TEAM DISPATCHED
                          </span>

                        )}

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

    </div>
  );
}

export default CommandCenter;