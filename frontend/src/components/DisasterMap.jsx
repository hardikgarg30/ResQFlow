import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// =========================================
// MARKER ICONS
// =========================================

const incidentIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #ef4444;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      box-shadow: 0 3px 12px rgba(0,0,0,.35);
    ">
      🚨
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const criticalIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #b91c1c;
      border: 4px solid #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 0 6px rgba(239,68,68,.25),
                  0 4px 14px rgba(0,0,0,.4);
    ">
      🚨
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const teamIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #2563eb;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      box-shadow: 0 3px 12px rgba(0,0,0,.35);
    ">
      🚑
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const shelterIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #16a34a;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      box-shadow: 0 3px 12px rgba(0,0,0,.35);
    ">
      🏠
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// =========================================
// COMPONENT
// =========================================

function DisasterMap() {
  const [incidents, setIncidents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================================
  // LOAD MAP DATA
  // =========================================

  const loadMapData = async () => {
    try {
      const [
        incidentsResponse,
        teamsResponse,
        sheltersResponse,
      ] = await Promise.all([
        fetch(`${API}/api/incidents`),
        fetch(`${API}/api/rescue-teams`),
        fetch(`${API}/api/shelters`),
      ]);

      const incidentsData =
        await incidentsResponse.json();

      const teamsData =
        await teamsResponse.json();

      const sheltersData =
        await sheltersResponse.json();

      setIncidents(
        incidentsData.incidents || []
      );

      setTeams(
        teamsData.teams || []
      );

      setShelters(
        sheltersData.shelters || []
      );
    } catch (error) {
      console.error(
        "MAP DATA ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // LIVE REFRESH
  // =========================================

  useEffect(() => {
    loadMapData();

    const interval = setInterval(
      loadMapData,
      5000
    );

    return () =>
      clearInterval(interval);
  }, []);

  // =========================================
  // DEFAULT MAP CENTER
  // =========================================

  const defaultCenter = [
    28.6139,
    77.2090,
  ];

  return (
    <div className="map-panel">

      {/* HEADER */}

      <div className="map-header">

        <div>

          <span className="section-label">
            LIVE GEO INTELLIGENCE
          </span>

          <h2>
            🗺️ Disaster Response Map
          </h2>

        </div>

        <span className="live-badge">
          ● LIVE
        </span>

      </div>

      {/* MAP */}

      <div className="map-wrapper">

        <MapContainer
          center={defaultCenter}
          zoom={10}
          scrollWheelZoom={true}
          style={{
            height: "520px",
            width: "100%",
          }}
        >

          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* ================================= */}
          {/* INCIDENTS */}
          {/* ================================= */}

          {incidents.map(
            (incident) => {

              const lat = Number(
                incident.latitude
              );

              const lng = Number(
                incident.longitude
              );

              if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng)
              ) {
                return null;
              }

              const isCritical =
                incident.priority ===
                "P1";

              return (
                <Marker
                  key={`incident-${incident.id}`}
                  position={[
                    lat,
                    lng,
                  ]}
                  icon={
                    isCritical
                      ? criticalIcon
                      : incidentIcon
                  }
                >

                  <Popup>

                    <div>

                      <strong>
                        🚨{" "}
                        {incident.title ||
                          "Emergency"}
                      </strong>

                      <br />

                      <b>
                        Priority:
                      </b>{" "}
                      {incident.priority ||
                        "P3"}

                      <br />

                      <b>
                        Status:
                      </b>{" "}
                      {incident.status ||
                        "ACTIVE"}

                      <br />

                      <b>
                        People:
                      </b>{" "}
                      {incident.people_affected ||
                        0}

                      <br />

                      <b>
                        Incident:
                      </b>{" "}
                      #{incident.id}

                    </div>

                  </Popup>

                </Marker>
              );
            }
          )}

          {/* ================================= */}
          {/* RESCUE TEAMS */}
          {/* ================================= */}

          {teams.map(
            (team) => {

              const lat = Number(
                team.latitude
              );

              const lng = Number(
                team.longitude
              );

              if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng)
              ) {
                return null;
              }

              return (
                <Marker
                  key={`team-${team.id}`}
                  position={[
                    lat,
                    lng,
                  ]}
                  icon={teamIcon}
                >

                  <Popup>

                    <strong>
                      🚑 {team.name}
                    </strong>

                    <br />

                    <b>
                      Status:
                    </b>{" "}
                    {team.status}

                    <br />

                    <b>
                      Vehicle:
                    </b>{" "}
                    {team.vehicle ||
                      "N/A"}

                    <br />

                    <b>
                      Capacity:
                    </b>{" "}
                    {team.capacity ||
                      "N/A"}

                  </Popup>

                </Marker>
              );
            }
          )}

          {/* ================================= */}
          {/* SHELTERS */}
          {/* ================================= */}

          {shelters.map(
            (shelter) => {

              const lat = Number(
                shelter.latitude
              );

              const lng = Number(
                shelter.longitude
              );

              if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng)
              ) {
                return null;
              }

              return (
                <Marker
                  key={`shelter-${shelter.id}`}
                  position={[
                    lat,
                    lng,
                  ]}
                  icon={shelterIcon}
                >

                  <Popup>

                    <strong>
                      🏠 {shelter.name}
                    </strong>

                    <br />

                    <b>
                      Status:
                    </b>{" "}
                    {shelter.status}

                    <br />

                    <b>
                      Available:
                    </b>{" "}
                    {
                      shelter.available_capacity
                    }
                    /
                    {shelter.capacity}

                    <br />

                    {shelter.medical_support && (
                      <>
                        🏥 Medical Support
                        <br />
                      </>
                    )}

                  </Popup>

                </Marker>
              );
            }
          )}

        </MapContainer>

        {/* ================================= */}
        {/* LEGEND */}
        {/* ================================= */}

        <div className="map-legend">

          <div>
            <span className="legend-dot incident">
              🚨
            </span>
            Incidents
          </div>

          <div>
            <span className="legend-dot critical">
              🔴
            </span>
            P1 Critical
          </div>

          <div>
            <span className="legend-dot team">
              🚑
            </span>
            Rescue Teams
          </div>

          <div>
            <span className="legend-dot shelter">
              🏠
            </span>
            Shelters
          </div>

        </div>

        {loading && (
          <div className="map-loading">
            Loading live map data...
          </div>
        )}

      </div>

    </div>
  );
}

export default DisasterMap;