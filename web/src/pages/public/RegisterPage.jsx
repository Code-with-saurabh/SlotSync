import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";

import { useRegisterMutation } from "../../features/auth/authApi";

import { useCapsLock } from "../../hooks/useCapsLock";

function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [register, { isLoading, error }] =
    useRegisterMutation();

  const isCapsLock = useCapsLock();

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await register(form).unwrap();

      navigate("/login", {
        replace: true,
      });
    } catch {
      // Error is displayed below.
    }
  };

  const errorMessage =
    error?.data?.message ||
    error?.data?.error?.message ||
    "Unable to create your account.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <UserPlus size={28} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Create your account
          </h1>

          <p className="mt-2 text-slate-500">
            Register as a SlotSync student.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full name
            </label>

            <input
              type="text"
              name="name"
              required
              minLength="2"
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
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
              name="password"
              required
              minLength="8"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {isCapsLock && form.password.length > 0 && (
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
            <UserPlus size={18} />

            {isLoading
              ? "Creating account..."
              : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}

          <button
            type="button"
            onClick={() =>
              navigate("/login")
            }
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;