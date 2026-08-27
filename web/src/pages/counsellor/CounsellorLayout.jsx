import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { LogOut, UserRound } from "lucide-react";

import { useLogoutMutation } from "../../features/auth/authApi";
import { clearCredentials } from "../../features/auth/authSlice";
import DarkModeToggle from "../../components/DarkModeToggle";
import RealtimeStatus from "../../components/RealtimeStatus";

const TABS = [
  { to: "/counsellor/dashboard", label: "Slots", end: true },
  { to: "/counsellor/dashboard/waitlist", label: "Waitlist" },
];

function CounsellorLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [logout, logoutState] = useLogoutMutation();

  const handleLogout = async () => {
    try { await logout().unwrap(); } catch { }
    dispatch(clearCredentials());
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-8">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white sm:text-xl">SlotSync</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Counsellor Portal</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <RealtimeStatus />
            <DarkModeToggle />
            <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 sm:flex dark:bg-slate-700">
              <UserRound size={17} className="text-slate-500 dark:text-slate-300" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {user?.name || user?.email || "Counsellor"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutState.isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
            >
              <LogOut size={14} />
              {logoutState.isLoading ? "Signing out..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-4 sm:pt-4 lg:px-8">
        <nav className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm dark:bg-slate-800">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-1 sm:px-4 sm:py-2.5 sm:text-sm ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default CounsellorLayout;
