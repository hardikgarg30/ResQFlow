import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function connectRealtime(onUpdate) {
  const token = sessionStorage.getItem("token");
  if (!token) return () => {};

  let socket;
  let source;
  let closed = false;

  try {
    socket = io(API, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    const events = [
      "incident.created",
      "incident.updated",
      "incident.dispatched",
      "team.updated",
      "team.location",
    ];

    events.forEach((eventName) => {
      socket.on(eventName, (data) => {
        onUpdate({ type: eventName, data });
      });
    });

    socket.on("connect_error", () => {
      if (closed || source) return;

      // SSE fallback keeps real-time updates working if WebSockets are blocked.
      try {
        source = new EventSource(
          `${API}/api/events?token=${encodeURIComponent(token)}`
        );
        events.forEach((eventName) => {
          source.addEventListener(eventName, (event) => {
            try {
              onUpdate({
                type: event.type,
                data: JSON.parse(event.data),
              });
            } catch {}
          });
        });
      } catch {}
    });
  } catch {
    // SSE fallback below.
  }

  if (!socket) {
    try {
      source = new EventSource(
        `${API}/api/events?token=${encodeURIComponent(token)}`
      );
      [
        "incident.created",
        "incident.updated",
        "incident.dispatched",
        "team.updated",
        "team.location",
      ].forEach((eventName) => {
        source.addEventListener(eventName, (event) => {
          try {
            onUpdate({ type: event.type, data: JSON.parse(event.data) });
          } catch {}
        });
      });
    } catch {}
  }

  return () => {
    closed = true;
    socket?.disconnect();
    source?.close();
  };
}
