import { useEffect, useState } from "react";
import { connectRealtime } from "../lib/realtime";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Shelters() {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // =========================================
  // LOAD SHELTERS
  // =========================================

  const loadShelters = async () => {
    try {
      const response = await fetch(
        `${API}/api/shelters`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load shelters"
        );
      }

      const data = await response.json();

      setShelters(data.shelters || []);
      setMessage("");
    } catch (error) {
      console.error(
        "SHELTERS ERROR:",
        error
      );

      setMessage(
        "❌ Unable to load shelters. Make sure backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // AUTO REFRESH
  // =========================================

  useEffect(() => {
    loadShelters();

    const cleanupRealtime = connectRealtime(() => loadShelters());

    const interval = setInterval(
      loadShelters,
      5000
    );

    return () => {
      clearInterval(interval);
      cleanupRealtime();
    };
  }, []);

  // =========================================
  // CALCULATIONS
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
          shelter.available_capacity || 0
        ),
      0
    );

  const occupied =
    Math.max(
      0,
      totalCapacity -
        availableCapacity
    );

  const occupancyPercentage =
    totalCapacity > 0
      ? Math.round(
          (occupied /
            totalCapacity) *
            100
        )
      : 0;

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="page">

      {/* ===================================== */}
      {/* HEADER */}
      {/* ===================================== */}

      <div className="page-header">

        <div>

          <span className="section-label">
            EVACUATION NETWORK
          </span>

          <h1>
            🏠 Emergency Shelters
          </h1>

          <p>
            Monitor emergency shelters,
            occupancy and available capacity.
          </p>

        </div>

        <button
          className="refresh"
          onClick={loadShelters}
        >
          ↻ Refresh
        </button>

      </div>

      {/* ===================================== */}
      {/* STATISTICS */}
      {/* ===================================== */}

      <div className="analytics-grid">

        <div className="analytics-card">

          <span>
            TOTAL SHELTERS
          </span>

          <strong>
            {shelters.length}
          </strong>

          <small>
            Emergency locations
          </small>

        </div>

        <div className="analytics-card success">

          <span>
            AVAILABLE CAPACITY
          </span>

          <strong>
            {availableCapacity}
          </strong>

          <small>
            People can be accommodated
          </small>

        </div>

        <div className="analytics-card danger">

          <span>
            OCCUPIED SPACES
          </span>

          <strong>
            {occupied}
          </strong>

          <small>
            Currently occupied
          </small>

        </div>

        <div className="analytics-card">

          <span>
            OCCUPANCY
          </span>

          <strong>
            {occupancyPercentage}%
          </strong>

          <small>
            Network utilization
          </small>

        </div>

      </div>

      {/* ===================================== */}
      {/* SHELTER PANEL */}
      {/* ===================================== */}

      <div className="analytics-panel">

        <div className="panel-title">

          <div>

            <span className="section-label">
              SAFE LOCATIONS
            </span>

            <h2>
              Shelter Network
            </h2>

          </div>

          <span className="live-badge">
            ● LIVE
          </span>

        </div>

        {/* ERROR */}

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {/* LOADING */}

        {loading ? (

          <div className="empty">
            Loading shelters...
          </div>

        ) : shelters.length === 0 ? (

          <div className="empty">
            🏠 No emergency shelters found.
          </div>

        ) : (

          <div className="shelter-grid">

            {shelters.map(
              (shelter) => {

                const capacity =
                  Number(
                    shelter.capacity ||
                      0
                  );

                const available =
                  Number(
                    shelter.available_capacity ||
                      0
                  );

                const shelterOccupied =
                  Math.max(
                    0,
                    capacity -
                      available
                  );

                const shelterOccupancy =
                  capacity > 0
                    ? Math.round(
                        (shelterOccupied /
                          capacity) *
                          100
                      )
                    : 0;

                return (

                  <div
                    className="shelter-card"
                    key={shelter.id}
                  >

                    {/* ICON */}

                    <div className="shelter-icon">
                      🏠
                    </div>

                    {/* CONTENT */}

                    <div>

                      <h3>
                        {shelter.name}
                      </h3>

                      {/* LOCATION */}

                      <p>
                        📍{" "}
                        {shelter.latitude},{" "}
                        {shelter.longitude}
                      </p>

                      {/* CAPACITY */}

                      <div className="capacity">

                        <span>
                          Available
                        </span>

                        <strong>
                          {available}
                          /
                          {capacity}
                        </strong>

                      </div>

                      {/* OCCUPANCY */}

                      <div className="capacity">

                        <span>
                          Occupied
                        </span>

                        <strong>
                          {shelterOccupied}
                        </strong>

                      </div>

                      <div className="capacity">

                        <span>
                          Occupancy
                        </span>

                        <strong>
                          {shelterOccupancy}%
                        </strong>

                      </div>

                      {/* STATUS */}

                      <span className="safe">
                        ●{" "}
                        {shelter.status ||
                          "AVAILABLE"}
                      </span>

                      {/* MEDICAL */}

                      {shelter.medical_support && (

                        <span className="medical">
                          🏥 Medical Support
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

export default Shelters;