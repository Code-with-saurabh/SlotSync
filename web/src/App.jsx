import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useSelector } from "react-redux";

import LoginPage from "./pages/public/LoginPage";
import RegisterPage from "./pages/public/RegisterPage";

import AuthInitializer from "./features/auth/AuthInitializer";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

import StudentSlotsPage from "./pages/student/StudentSlotsPage";
import CounsellorDashboard from "./pages/counsellor/CounsellorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

function LoadingScreen({ text = "Loading SlotSync..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

        <p className="text-sm font-medium text-slate-600">
          {text}
        </p>
      </div>
    </div>
  );
}

function RoleRedirect() {
  const {
    user,
    accessToken,
    initialized,
  } = useSelector((state) => state.auth);

  if (!initialized) {
    return (
      <LoadingScreen />
    );
  }

  if (!user || !accessToken) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  switch (user.role) {
    case "student":
      return (
        <Navigate
          to="/student/slots"
          replace
        />
      );

    case "counsellor":
      return (
        <Navigate
          to="/counsellor/dashboard"
          replace
        />
      );

    case "admin":
      return (
        <Navigate
          to="/admin/dashboard"
          replace
        />
      );

    default:
      return (
        <Navigate
          to="/login"
          replace
        />
      );
  }
}

function AppRoutes() {
  return (
    <Routes>
      {/* =========================
          Public Routes
      ========================== */}

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      {/* =========================
          Root Route
      ========================== */}

      <Route
        path="/"
        element={<RoleRedirect />}
      />

      {/* =========================
          Protected Routes
      ========================== */}

      <Route element={<ProtectedRoute />}>
        {/* Student */}

        <Route
          element={
            <RoleRoute
              allowedRoles={["student"]}
            />
          }
        >
          <Route
            path="/student/slots"
            element={<StudentSlotsPage />}
          />
        </Route>

        {/* Counsellor */}

        <Route
          element={
            <RoleRoute
              allowedRoles={["counsellor"]}
            />
          }
        >
          <Route
            path="/counsellor/dashboard"
            element={<CounsellorDashboard />}
          />
        </Route>

        {/* Admin */}

        <Route
          element={
            <RoleRoute
              allowedRoles={["admin"]}
            />
          }
        >
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />
        </Route>
      </Route>

      {/* =========================
          Unknown Routes
      ========================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <AppRoutes />
      </AuthInitializer>
    </BrowserRouter>
  );
}

export default App;
