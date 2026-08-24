import { useMemo, useState } from "react";

import {
    useGetCounsellorsQuery,
    useCreateCounsellorMutation,
    useUpdateCounsellorMutation,
    useUpdateCounsellorStatusMutation,
} from "../../features/counsellor/counsellorApi";


function getErrorMessage(
    error,
    fallback
) {
    return (
        error?.data?.message ||
        error?.data?.error?.message ||
        error?.message ||
        fallback
    );
}


function getInitialForm() {
    return {
        name: "",
        email: "",
        password: "",
    };
}


export default function CounsellorManagement() {
    const [search, setSearch] =
        useState("");

    const [status, setStatus] =
        useState("all");

    const [
        isCreateOpen,
        setIsCreateOpen,
    ] = useState(false);

    const [
        editingCounsellor,
        setEditingCounsellor,
    ] = useState(null);

    const [
        form,
        setForm,
    ] = useState(getInitialForm);

    const [
        formError,
        setFormError,
    ] = useState("");


    const {
        data: counsellors = [],
        isLoading,
        isFetching,
        isError,
        error,
    } = useGetCounsellorsQuery({
        search: search || undefined,
        status,
    });


    const [
        createCounsellor,
        {
            isLoading:
            isCreating,
        },
    ] =
        useCreateCounsellorMutation();


    const [
        updateCounsellor,
        {
            isLoading:
            isUpdating,
        },
    ] =
        useUpdateCounsellorMutation();


    const [
        updateStatus,
        {
            isLoading:
            isUpdatingStatus,
        },
    ] =
        useUpdateCounsellorStatusMutation();


    const stats =
        useMemo(() => ({
            total:
                counsellors.length,

            active:
                counsellors.filter(
                    (item) =>
                        item.isActive
                ).length,

            inactive:
                counsellors.filter(
                    (item) =>
                        !item.isActive
                ).length,
        }), [counsellors]);


    function openCreate() {
        setEditingCounsellor(null);
        setForm(getInitialForm());
        setFormError("");
        setIsCreateOpen(true);
    }


    function openEdit(counsellor) {
        setEditingCounsellor(counsellor);

        setForm({
            name:
                counsellor.name || "",

            email:
                counsellor.email || "",

            password: "",
        });

        setFormError("");
        setIsCreateOpen(true);
    }


    function closeModal() {
        if (isCreating || isUpdating) {
            return;
        }

        setIsCreateOpen(false);
        setEditingCounsellor(null);
        setForm(getInitialForm());
        setFormError("");
    }


    function handleChange(event) {
        const {
            name,
            value,
        } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));

        if (formError) {
            setFormError("");
        }
    }


    async function handleSubmit(event) {
        event.preventDefault();

        setFormError("");

        if (!form.name.trim()) {
            setFormError(
                "Counsellor name is required."
            );
            return;
        }

        if (!form.email.trim()) {
            setFormError(
                "Counsellor email is required."
            );
            return;
        }


        try {
            if (editingCounsellor) {
                await updateCounsellor({
                    counsellorId:
                        editingCounsellor._id ||
                        editingCounsellor.id,

                    name:
                        form.name.trim(),

                    email:
                        form.email.trim(),
                }).unwrap();
            } else {
                if (!form.password) {
                    setFormError(
                        "Password is required."
                    );
                    return;
                }

                await createCounsellor({
                    name:
                        form.name.trim(),

                    email:
                        form.email.trim(),

                    password:
                        form.password,
                }).unwrap();
            }

            closeModal();
        } catch (err) {
            setFormError(
                getErrorMessage(
                    err,
                    editingCounsellor
                        ? "Failed to update counsellor."
                        : "Failed to create counsellor."
                )
            );
        }
    }


    async function handleStatusChange(
        counsellor
    ) {
        try {
            await updateStatus({
                counsellorId:
                    counsellor._id ||
                    counsellor.id,

                isActive:
                    !counsellor.isActive,
            }).unwrap();
        } catch (err) {
            setFormError(
                getErrorMessage(
                    err,
                    "Failed to update counsellor status."
                )
            );
        }
    }


    return (
        <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">

            {/* Header */}
            <div className="border-b border-slate-200 p-6">

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                            Counsellor Management
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Create and manage counselling staff accounts.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openCreate}
                        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        + Add Counsellor
                    </button>

                </div>


                {/* Stats */}
                <div className="mt-6 grid gap-3 sm:grid-cols-3">

                    <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Total
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900">
                            {isLoading ? "..." : stats.total}
                        </p>
                    </div>


                    <div className="rounded-xl bg-emerald-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                            Active
                        </p>

                        <p className="mt-1 text-2xl font-bold text-emerald-700">
                            {isLoading ? "..." : stats.active}
                        </p>
                    </div>


                    <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Inactive
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-700">
                            {isLoading ? "..." : stats.inactive}
                        </p>
                    </div>

                </div>


                {/* Filters */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Search by name or email..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 sm:max-w-md"
                    />


                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(
                                event.target.value
                            )
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                    >
                        <option value="all">
                            All counsellors
                        </option>

                        <option value="active">
                            Active
                        </option>

                        <option value="inactive">
                            Inactive
                        </option>
                    </select>


                    {isFetching &&
                        !isLoading && (
                            <span className="self-center text-xs text-slate-500">
                                Updating...
                            </span>
                        )}

                </div>

            </div>


            {/* Error */}
            {isError && (
                <div className="border-b border-red-100 bg-red-50 p-5">
                    <p className="font-medium text-red-700">
                        Failed to load counsellors.
                    </p>

                    <p className="mt-1 text-sm text-red-600">
                        {getErrorMessage(
                            error,
                            "Please try again."
                        )}
                    </p>
                </div>
            )}


            {/* Global action error */}
            {formError &&
                !isCreateOpen && (
                    <div className="border-b border-red-100 bg-red-50 px-6 py-4">
                        <p className="text-sm font-medium text-red-700">
                            {formError}
                        </p>
                    </div>
                )}


            {/* Loading */}
            {isLoading && (
                <div className="p-10 text-center text-sm text-slate-500">
                    Loading counsellors...
                </div>
            )}


            {/* Empty */}
            {!isLoading &&
                !isError &&
                counsellors.length === 0 && (
                    <div className="p-10 text-center">

                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                            👤
                        </div>

                        <p className="mt-4 font-medium text-slate-800">
                            No counsellors found
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Create a counsellor account to start assigning counselling slots.
                        </p>

                    </div>
                )}


            {/* Table */}
            {!isLoading &&
                !isError &&
                counsellors.length > 0 && (

                    <div className="overflow-x-auto">

                        <table className="min-w-full text-left text-sm">

                            <thead className="bg-slate-50">
                                <tr>

                                    <th className="px-6 py-4 font-semibold text-slate-600">
                                        Counsellor
                                    </th>

                                    <th className="px-6 py-4 font-semibold text-slate-600">
                                        Email
                                    </th>

                                    <th className="px-6 py-4 font-semibold text-slate-600">
                                        Status
                                    </th>

                                    <th className="px-6 py-4 font-semibold text-slate-600">
                                        Joined
                                    </th>

                                    <th className="px-6 py-4 text-right font-semibold text-slate-600">
                                        Actions
                                    </th>

                                </tr>
                            </thead>


                            <tbody className="divide-y divide-slate-100">

                                {counsellors.map(
                                    (counsellor) => (

                                        <tr
                                            key={
                                                counsellor._id ||
                                                counsellor.id
                                            }
                                            className="transition hover:bg-slate-50"
                                        >

                                            <td className="px-6 py-4">

                                                <div className="flex items-center gap-3">

                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                                                        {(
                                                            counsellor.name ||
                                                            "C"
                                                        )
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>

                                                    <div>
                                                        <p className="font-medium text-slate-900">
                                                            {counsellor.name}
                                                        </p>

                                                        <p className="text-xs text-slate-500">
                                                            Counsellor
                                                        </p>
                                                    </div>

                                                </div>

                                            </td>


                                            <td className="px-6 py-4 text-slate-600">
                                                {counsellor.email}
                                            </td>


                                            <td className="px-6 py-4">

                                                <span
                                                    className={
                                                        counsellor.isActive
                                                            ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                                                            : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                                                    }
                                                >
                                                    {counsellor.isActive
                                                        ? "Active"
                                                        : "Inactive"}
                                                </span>

                                            </td>


                                            <td className="px-6 py-4 text-slate-500">
                                                {counsellor.createdAt
                                                    ? new Date(
                                                        counsellor.createdAt
                                                    ).toLocaleDateString(
                                                        "en-IN"
                                                    )
                                                    : "—"}
                                            </td>


                                            <td className="px-6 py-4">

                                                <div className="flex justify-end gap-2">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(
                                                                counsellor
                                                            )
                                                        }
                                                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        Edit
                                                    </button>


                                                    <button
                                                        type="button"
                                                        disabled={
                                                            isUpdatingStatus
                                                        }
                                                        onClick={() =>
                                                            handleStatusChange(
                                                                counsellor
                                                            )
                                                        }
                                                        className={
                                                            counsellor.isActive
                                                                ? "rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                                                : "rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                                                        }
                                                    >
                                                        {counsellor.isActive
                                                            ? "Deactivate"
                                                            : "Activate"}
                                                    </button>

                                                </div>

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>
                )}


            {/* Modal */}
            {isCreateOpen && (

                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">

                    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

                        <div className="flex items-start justify-between border-b border-slate-200 p-6">

                            <div>
                                <h3 className="text-xl font-semibold text-slate-900">
                                    {editingCounsellor
                                        ? "Edit Counsellor"
                                        : "Create Counsellor"}
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    {editingCounsellor
                                        ? "Update counsellor account information."
                                        : "Create an account for a counselling staff member."}
                                </p>
                            </div>


                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={
                                    isCreating ||
                                    isUpdating
                                }
                                className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5 p-6"
                        >

                            {formError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                    <p className="text-sm font-medium text-red-700">
                                        {formError}
                                    </p>
                                </div>
                            )}


                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    Full Name
                                </label>

                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Dr. Priya Shah"
                                    disabled={
                                        isCreating ||
                                        isUpdating
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500 disabled:bg-slate-100"
                                />
                            </div>


                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="counsellor@example.com"
                                    disabled={
                                        isCreating ||
                                        isUpdating
                                    }
                                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500 disabled:bg-slate-100"
                                />
                            </div>


                            {!editingCounsellor && (
                                <div>
                                    <label className="text-sm font-medium text-slate-700">
                                        Initial Password
                                    </label>

                                    <input
                                        type="password"
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="Minimum 8 characters"
                                        disabled={
                                            isCreating
                                        }
                                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500 disabled:bg-slate-100"
                                    />

                                    <p className="mt-1 text-xs text-slate-500">
                                        The counsellor will use this password to sign in.
                                    </p>
                                </div>
                            )}


                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">

                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={
                                        isCreating ||
                                        isUpdating
                                    }
                                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    disabled={
                                        isCreating ||
                                        isUpdating
                                    }
                                    className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isCreating
                                        ? "Creating..."
                                        : isUpdating
                                            ? "Saving..."
                                            : editingCounsellor
                                                ? "Save Changes"
                                                : "Create Counsellor"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </section>
    );
}