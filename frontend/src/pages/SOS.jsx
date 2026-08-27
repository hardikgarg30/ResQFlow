import { useEffect, useRef, useState } from "react";
import { connectRealtime } from "../lib/realtime";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function SOS() {
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

  const [sending, setSending] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [message, setMessage] = useState("");
  const [activeIncidentId, setActiveIncidentId] = useState(null);
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);

  // =====================================================
  // DETECT GPS LOCATION
  // =====================================================

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setMessage("GPS is not supported by this browser.");
      return;
    }

    setDetecting(true);
    setMessage("Detecting GPS location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setDetecting(false);
        setMessage("GPS location detected successfully.");
      },
      (error) => {
        console.error("GPS ERROR:", error);

        setDetecting(false);
        setMessage(
          "Unable to detect GPS location. Please allow location access."
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

  const sendSOS = async (event) => {
    event.preventDefault();

    if (
      location.latitude === null ||
      location.longitude === null
    ) {
      setMessage("Please detect your GPS location first.");
      return;
    }

    try {
      setSending(true);
      setMessage("Sending emergency SOS...");

      const response = await fetch(`${API}/api/sos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          location: `${location.latitude.toFixed(
            6
          )}, ${location.longitude.toFixed(6)}`,
          emergency_type: form.emergency_type,
          people_affected: Number(form.people_affected),
          children: Number(form.children),
          elderly: Number(form.elderly),
          severity: form.severity,
          battery: Number(form.battery),
          message: form.message,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "SOS request failed"
        );
      }

      setActiveIncidentId(data.alert?.id || null);
      setMessage(
        data.auto_dispatched && data.team
          ? `SOS SENT — ${data.priority || "P1"} PRIORITY — Team #${data.team.id} DISPATCHED`
          : `SOS SENT SUCCESSFULLY — ${data.priority || "P1"} PRIORITY`
      );

      setForm({
        emergency_type: "HOUSE FLOODED",
        people_affected: 1,
        children: 0,
        elderly: 0,
        severity: "HIGH",
        battery: 80,
        message: "",
      });
    } catch (error) {
      console.error("SOS ERROR:", error);

      setMessage(
        error.message || "Could not send SOS request."
      );
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!activeIncidentId) return undefined;
    const cleanup = connectRealtime(({ type, data }) => {
      const incident = data?.incident;
      if (type === "incident.updated" && incident?.id === activeIncidentId && incident.status === "RESOLVED") {
        setActiveIncidentId(null);
        setMessage("Emergency resolved. Live GPS tracking stopped.");
      }
    });
    return cleanup;
  }, [activeIncidentId]);

  // =====================================================
  // LIVE SOS GPS TRACKING
  // =====================================================

  useEffect(() => {
    if (!activeIncidentId || !navigator.geolocation) return undefined;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        if (now - lastSentRef.current < 5000) return;
        lastSentRef.current = now;

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLocation({ latitude, longitude });

        try {
          await fetch(`${API}/api/sos/${activeIncidentId}/location`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }),
          });
        } catch (error) {
          console.error("LIVE GPS UPDATE ERROR:", error);
        }
      },
      (error) => console.error("LIVE GPS WATCH ERROR:", error),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeIncidentId]);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="page-container">

      {/* PAGE HEADER */}

      <div className="page-header">
        <div>
          <span className="section-label">
            EMERGENCY RESPONSE
          </span>

          <h1>Emergency SOS</h1>

          <p>
            Send an emergency request with your current
            location and incident details.
          </p>
        </div>

        <div className="live-indicator">
          <span className="live-dot"></span>
          LIVE
        </div>
      </div>

      {/* MAIN GRID */}

      <div className="sos-page-grid">

        {/* =================================================
            SOS FORM
        ================================================= */}

        <section className="panel">

          <div className="panel-title">
            <div>
              <span className="section-label">
                EMERGENCY REQUEST
              </span>

              <h2>Send SOS</h2>
            </div>
          </div>

          <form onSubmit={sendSOS}>

            {/* EMERGENCY TYPE */}

            <label>
              Emergency Type
            </label>

            <select
              value={form.emergency_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  emergency_type: e.target.value,
                })
              }
            >
              <option>HOUSE FLOODED</option>
              <option>MEDICAL EMERGENCY</option>
              <option>FIRE</option>
              <option>EARTHQUAKE</option>
              <option>TRAPPED PERSON</option>
              <option>OTHER</option>
            </select>

            {/* PEOPLE */}

            <div className="form-grid">

              <div>
                <label>People</label>

                <input
                  type="number"
                  min="1"
                  value={form.people_affected}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      people_affected: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label>Children</label>

                <input
                  type="number"
                  min="0"
                  value={form.children}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      children: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label>Elderly</label>

                <input
                  type="number"
                  min="0"
                  value={form.elderly}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      elderly: e.target.value,
                    })
                  }
                />
              </div>

            </div>

            {/* SEVERITY */}

            <label>
              Severity
            </label>

            <select
              value={form.severity}
              onChange={(e) =>
                setForm({
                  ...form,
                  severity: e.target.value,
                })
              }
            >
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
              <option>CRITICAL</option>
            </select>

            {/* BATTERY */}

            <label>
              Battery %
            </label>

            <input
              type="number"
              min="0"
              max="100"
              value={form.battery}
              onChange={(e) =>
                setForm({
                  ...form,
                  battery: e.target.value,
                })
              }
            />

            {/* MESSAGE */}

            <label>
              Emergency Message
            </label>

            <textarea
              placeholder="Describe the emergency..."
              value={form.message}
              onChange={(e) =>
                setForm({
                  ...form,
                  message: e.target.value,
                })
              }
            />

            {/* GPS */}

            <div className="gps-box">

              <div>

                <strong>
                  GPS LOCATION
                </strong>

                {location.latitude !== null &&
                location.longitude !== null ? (
                  <>
                    <p>
                      Latitude:{" "}
                      {location.latitude.toFixed(6)}
                    </p>

                    <p>
                      Longitude:{" "}
                      {location.longitude.toFixed(6)}
                    </p>
                  </>
                ) : (
                  <p>
                    Location not detected
                  </p>
                )}

              </div>

              <button
                type="button"
                className="gps-button"
                onClick={detectLocation}
                disabled={detecting}
              >
                {detecting
                  ? "DETECTING..."
                  : "DETECT GPS"}
              </button>

            </div>

            {/* SEND */}

            <button
              className="sos-button"
              type="submit"
              disabled={sending}
            >
              {sending
                ? "SENDING SOS..."
                : "SEND EMERGENCY SOS"}
            </button>

          </form>

          {/* MESSAGE */}

          {message && (
            <div className="message">
              {message}
            </div>
          )}

        </section>

        {/* =================================================
            RESPONSE SYSTEM
        ================================================= */}

        <section className="panel sos-info">

          <span className="section-label">
            RESPONSE SYSTEM
          </span>

          <h2>
            What happens after SOS?
          </h2>

          <div className="response-step">
            <strong>01</strong>

            <div>
              <b>GPS Location</b>

              <p>
                Your current location is captured
                and attached to the emergency.
              </p>
            </div>
          </div>

          <div className="response-step">
            <strong>02</strong>

            <div>
              <b>Priority Analysis</b>

              <p>
                The emergency is assigned a priority
                based on severity.
              </p>
            </div>
          </div>

          <div className="response-step">
            <strong>03</strong>

            <div>
              <b>Rescue Dispatch</b>

              <p>
                An available rescue team is selected automatically
                and dispatched when one is free.
              </p>
            </div>
          </div>

          <div className="response-step">
            <strong>04</strong>

            <div>
              <b>Command Center</b>

              <p>
                Responders receive the live incident
                and can coordinate the rescue.
              </p>
            </div>
          </div>

        </section>

      </div>

    </div>
  );
}

export default SOS;