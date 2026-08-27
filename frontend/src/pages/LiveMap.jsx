import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { connectRealtime } from "../lib/realtime";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const incidentIcon = new L.Icon({
  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/564/564619.png",
  iconSize: [35, 35],
});

const teamIcon = new L.Icon({
  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/1995/1995574.png",
  iconSize: [35, 35],
});

const shelterIcon = new L.Icon({
  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/619/619153.png",
  iconSize: [35, 35],
});

function LiveMap() {
  const [incidents, setIncidents] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [teams, setTeams] = useState([]);

  const loadData = async () => {
    try {
      const [incidentResponse, shelterResponse, teamResponse] =
        await Promise.all([
          fetch(`${API}/api/incidents`),
          fetch(`${API}/api/shelters`),
          fetch(`${API}/api/rescue-teams`),
        ]);

      const incidentData =
        await incidentResponse.json();

      const shelterData =
        await shelterResponse.json();

      const teamData =
        await teamResponse.json();

      setIncidents(
        incidentData.incidents || []
      );

      setShelters(
        shelterData.shelters || []
      );

      setTeams(
        teamData.teams || []
      );
    } catch (error) {
      console.error(
        "Map data error:",
        error
      );
    }
  };

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

  return (
    <div className="page">

      <div className="page-header">

        <div>
          <span className="section-label">
            GEOSPATIAL RESPONSE
          </span>

          <h1>🗺️ Live Disaster Map</h1>

          <p>
            Real-time incidents and emergency shelters.
          </p>
        </div>

        <span className="live-badge">
          ● LIVE
        </span>

      </div>

      <div className="analytics-grid">

        <div className="analytics-card danger">
          <span>ACTIVE INCIDENTS</span>

          <strong>
            {incidents.length}
          </strong>

          <small>
            Live emergencies
          </small>
        </div>

        <div className="analytics-card success">
          <span>EMERGENCY SHELTERS</span>

          <strong>
            {shelters.length}
          </strong>

          <small>
            Safe locations
          </small>
        </div>

      </div>

      <div className="analytics-panel">

        <div className="panel-title">

          <div>
            <span className="section-label">
              LIVE MONITORING
            </span>

            <h2>
              Disaster Response Map
            </h2>
          </div>

        </div>

        <div
          style={{
            height: "550px",
            width: "100%",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >

          <MapContainer
            center={[28.6139, 77.2090]}
            zoom={11}
            style={{
              height: "100%",
              width: "100%",
            }}
          >

            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* INCIDENTS */}

            {incidents.map((incident) => {

              const lat =
                Number(incident.latitude);

              const lng =
                Number(incident.longitude);

              if (
                Number.isNaN(lat) ||
                Number.isNaN(lng)
              ) {
                return null;
              }

              return (
                <Marker
                  key={`incident-${incident.id}`}
                  position={[lat, lng]}
                  icon={incidentIcon}
                >

                  <Popup>

                    <strong>
                      🚨 Emergency
                    </strong>

                    <br />

                    Incident #
                    {incident.id}

                    <br />

                    {incident.title}

                    <br />

                    Priority:
                    {" "}
                    {incident.priority}

                    <br />

                    People affected:
                    {" "}
                    {incident.people_affected}

                  </Popup>

                </Marker>
              );
            })}

            {/* RESCUE TEAMS */}

            {teams.map((team) => {
              const lat = Number(team.latitude);
              const lng = Number(team.longitude);
              if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

              const status = String(team.status || "UNKNOWN").toUpperCase();
              return (
                <Marker
                  key={`team-${team.id}`}
                  position={[lat, lng]}
                  icon={teamIcon}
                >
                  <Tooltip permanent direction="top">
                    🚑 Team #{team.id} — {status}
                  </Tooltip>
                  <Popup>
                    <strong>🚑 {team.name}</strong>
                    <br />
                    Status: {status}
                    <br />
                    Vehicle: {team.vehicle || "Not specified"}
                    <br />
                    Location: {lat.toFixed(6)}, {lng.toFixed(6)}
                  </Popup>
                </Marker>
              );
            })}

            {/* SHELTERS */}

            {shelters.map((shelter) => {

              const lat =
                Number(shelter.latitude);

              const lng =
                Number(shelter.longitude);

              if (
                Number.isNaN(lat) ||
                Number.isNaN(lng)
              ) {
                return null;
              }

              return (
                <Marker
                  key={`shelter-${shelter.id}`}
                  position={[lat, lng]}
                  icon={shelterIcon}
                >

                  <Popup>

                    <strong>
                      🏠 {shelter.name}
                    </strong>

                    <br />

                    Status:
                    {" "}
                    {shelter.status}

                    <br />

                    Available:
                    {" "}
                    {shelter.available_capacity}
                    /
                    {shelter.capacity}

                    <br />

                    {shelter.medical_support
                      ? "🏥 Medical Support Available"
                      : "No Medical Support"}

                  </Popup>

                </Marker>
              );
            })}

          </MapContainer>

        </div>

      </div>

    </div>
  );
}

export default LiveMap;