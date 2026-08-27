import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">

      <div className="nav-brand">
        <div className="nav-logo">🚨</div>

        <div>
          <h2>RESQFLOW</h2>
          <span>Emergency Network</span>
        </div>
      </div>

      <div className="nav-links">

        <NavLink to="/" end>
          Dashboard
        </NavLink>

        <NavLink to="/sos">
          🚨 SOS
        </NavLink>

        <NavLink to="/command-center">
          Command Center
        </NavLink>

        <NavLink to="/rescue-teams">
          Rescue Teams
        </NavLink>

        <NavLink to="/shelters">
          Shelters
        </NavLink>

        <NavLink to="/analytics">
          Analytics
        </NavLink>

        <NavLink to="/live-map">
          🗺️ Live Map
        </NavLink>

      </div>

      <div className="nav-status">
        <span className="online-dot"></span>
        ONLINE
      </div>

    </nav>
  );
}

export default Navbar;