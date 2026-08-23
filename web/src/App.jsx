import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";



import LoginPage from "./pages/public/LoginPage";
import RegisterPage from "./pages/public/RegisterPage";

import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

import StudentSlotsPage from "./pages/student/StudentSlotsPage";
import CounsellorDashboard from "./pages/counsellor/CounsellorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AuthInitializer from "./features/auth/AuthInitializer";

function App() {
  return (
    <AuthInitializer>
      <BrowserRouter>
        <Routes>

          {/* Public routes */}

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />

          {/* Protected routes */}

          <Route
            element={<ProtectedRoute />}
          >

            {/* Student */}

            <Route
              element={
                <RoleRoute
                  allowedRoles={[
                    "student",
                  ]}
                />
              }
            >
              <Route
                path="/student/slots"
                element={
                  <StudentSlotsPage />
                }
              />
            </Route>

            {/* Counsellor */}

            <Route
              element={
                <RoleRoute
                  allowedRoles={[
                    "counsellor",
                  ]}
                />
              }
            >
              <Route
                path="/counsellor/dashboard"
                element={
                  <CounsellorDashboard />
                }
              />
            </Route>

            {/* Admin */}

            <Route
              element={
                <RoleRoute
                  allowedRoles={[
                    "admin",
                  ]}
                />
              }
            >
              <Route
                path="/admin/dashboard"
                element={
                  <AdminDashboard />
                }
              />
            </Route>

          </Route>

          {/* Default */}

          <Route
            path="/"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthInitializer>
  );
}

export default App;