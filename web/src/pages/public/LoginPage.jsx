import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { LogIn } from "lucide-react";

import { useLoginMutation } from "../../features/auth/authApi";
import {
  setCredentials,
  setInitialized,
} from "../../features/auth/authSlice";

import { useCapsLock } from "../../hooks/useCapsLock";

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [login, { isLoading, error }] =
    useLoginMutation();

  const isCapsLock = useCapsLock();

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await login({
        email,
        password,
      }).unwrap();

      const data =
        response.data || response;

      dispatch(
        setCredentials({
          user: data.user,
          accessToken: data.accessToken,
        })
      );

      dispatch(
        setInitialized(true)
      );

      if (data.user.role === "student") {
        navigate("/student/slots", { replace: true });
      }

      if (data.user.role === "counsellor") {
        navigate("/counsellor/dashboard", { replace: true });
      }

      if (data.user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      }
    } catch {
      // RTK Query error is shown below.
    }
  };

  const errorMessage =
    error?.data?.message ||
    error?.data?.error?.message ||
    "Unable to login. Please check your credentials.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <LogIn size={28} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Welcome to SlotSync
          </h1>

          <p className="mt-2 text-slate-500">
            Sign in to manage your bookings.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {isCapsLock && password.length > 0 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                Caps Lock is on
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={18} />

            {isLoading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}

          <button
            type="button"
            onClick={() =>
              navigate("/register")
            }
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
