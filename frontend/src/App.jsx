import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Home from "./pages/Home";
import SOS from "./pages/SOS";
import CommandCenter from "./pages/CommandCenter";
import RescueTeams from "./pages/RescueTeams";
import Shelters from "./pages/Shelters";
import Analytics from "./pages/Analytics";
import LiveMap from "./pages/LiveMap";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Navbar from "./components/Navbar";

import "./App.css";


function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


function Layout() {
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register";

  return (
    <div className="app">

      {!isAuthPage && <Navbar />}

      <Routes>

        {/* Authentication */}

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />


        {/* Protected Dashboard */}

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sos"
          element={
            <ProtectedRoute>
              <SOS />
            </ProtectedRoute>
          }
        />

        <Route
          path="/command-center"
          element={
            <ProtectedRoute>
              <CommandCenter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rescue-teams"
          element={
            <ProtectedRoute>
              <RescueTeams />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shelters"
          element={
            <ProtectedRoute>
              <Shelters />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/live-map"
          element={
            <ProtectedRoute>
              <LiveMap />
            </ProtectedRoute>
          }
        />


        {/* Unknown URL */}

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>

    </div>
  );
}


function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}


export default App;