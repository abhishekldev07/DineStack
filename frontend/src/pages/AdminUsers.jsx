import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import UserProfileModal from "../components/admin/UserProfileModal";

import {
  getAllUsers,
  searchUsers,
  updateUserRole
} from "../services/adminUserService";
import { getUserProfile } from "../services/profileService";

export default function AdminUsers() {
  const navigate = useNavigate();

  useEffect(() => {
    const current = JSON.parse(localStorage.getItem("user") || "null");

    if (!current || current.role !== "admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchField, setSearchField] = useState("id");
  const [searchValue, setSearchValue] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchSummary, setSearchSummary] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setSearchError("");
      setSearchSummary("");
      const data = await getAllUsers();
      setUsers(Array.isArray(data) ? data : data?.users || []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const reloadCurrentUsers = async () => {
    const trimmedValue = searchValue.trim();

    if (!isSearching || !trimmedValue) {
      await fetchUsers();
      return;
    }

    const params =
      searchField === "id"
        ? { id: trimmedValue }
        : searchField === "username"
          ? { username: trimmedValue }
          : { email: trimmedValue };

    const data = await searchUsers(params);
    setUsers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    const trimmedValue = searchValue.trim();

    if (!trimmedValue) {
      setIsSearching(false);
      setSearchSummary("");
      await fetchUsers();
      return;
    }

    if (searchField === "id" && !/^\d+$/.test(trimmedValue)) {
      setSearchError("User ID must be numeric");
      setSearchSummary("");
      setUsers([]);
      setIsSearching(true);
      return;
    }

    try {
      setLoading(true);
      setSearchError("");
      setIsSearching(true);

      const params =
        searchField === "id"
          ? { id: trimmedValue }
          : searchField === "username"
            ? { username: trimmedValue }
            : { email: trimmedValue };

      const data = await searchUsers(params);
      const nextUsers = Array.isArray(data) ? data : [];
      setUsers(nextUsers);
      setSearchSummary(
        nextUsers.length === 0
          ? `No users found for ${searchField} search.`
          : `${nextUsers.length} user${nextUsers.length === 1 ? "" : "s"} found`
      );
    } catch (err) {
      console.error(err);
      setUsers([]);
      setSearchSummary("");
      setSearchError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Search failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = async () => {
    setSearchValue("");
    setSearchField("id");
    setIsSearching(false);
    setSearchError("");
    setSearchSummary("");
    await fetchUsers();
  };

  const handleChangeRole = async (userId, role) => {
    try {
      await updateUserRole(userId, role);
      await reloadCurrentUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewProfile = async (user) => {
    if (!user?.id) return;

    try {
      setProfileLoading(true);
      setProfileError("");
      setIsProfileOpen(true);

      const data = await getUserProfile(user.id);
      setSelectedProfile(data);
    } catch (error) {
      console.error(error);
      setSelectedProfile(null);
      setProfileError(
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          "Unable to load user profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfileModal = () => {
    setIsProfileOpen(false);
    setSelectedProfile(null);
    setProfileError("");
    setProfileLoading(false);
  };

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-bold mb-6">Manage Users</h1>

        {/* Search Panel */}
        <form
          onSubmit={handleSearchSubmit}
          className="mx-auto mb-6 flex w-full max-w-md flex-col gap-3 rounded-3xl bg-slate-950/30 p-5 shadow-lg border border-white/5"
        >
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="id">Search by ID</option>
            <option value="username">Search by Username</option>
            <option value="email">Search by Email</option>
          </select>

          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={
              searchField === "id"
                ? "Enter User ID"
                : searchField === "username"
                  ? "Enter username"
                  : "Enter email"
            }
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 sm:flex-1"
            >
              Search
            </button>

            <button
              type="button"
              onClick={clearSearch}
              className="w-full rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 sm:flex-1"
            >
              Clear Search
            </button>
          </div>
        </form>

        {searchError && (
          <p className="text-red-500 mb-4 font-semibold text-center">{searchError}</p>
        )}

        {isSearching && !loading && searchSummary && (
          <p className="text-sm text-slate-400 mb-4 text-center">
            {searchSummary}
          </p>
        )}

        {loading ? (
          <p className="text-slate-400 text-center">Loading users...</p>
        ) : users.length === 0 ? (
          <div className="bg-slate-950/40 rounded-3xl shadow-lg p-6 text-center border border-white/5">
            <p className="text-slate-400">
              {isSearching ? "No users matched your search." : "No users found"}
            </p>
          </div>
        ) : (
          <>
            {/* 1. MOBILE SMART CARDS VIEW (< 640px) */}
            <div className="mx-auto grid w-full max-w-[95%] gap-4 sm:hidden">
              {users.map((u) => (
                <article
                  key={u.id}
                  className="rounded-3xl bg-slate-950/40 p-5 shadow-lg ring-1 ring-white/5 border border-white/5"
                >
                  <div className="grid grid-cols-[85px,1fr] gap-x-3 gap-y-3.5 text-sm">
                    <span className="text-slate-500 font-medium">ID</span>
                    <span className="min-w-0 break-words font-mono text-slate-300">{u.id}</span>

                    <span className="text-slate-500 font-medium">Username</span>
                    <span className="min-w-0 break-words font-semibold text-white">{u.username}</span>

                    <span className="text-slate-500 font-medium">Email</span>
                    <span className="min-w-0 break-all text-slate-300">{u.email}</span>

                    <span className="text-slate-500 font-medium">Created</span>
                    <span className="min-w-0 break-words text-slate-400 text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                    </span>

                    <span className="text-slate-500 font-medium">Role</span>
                    <div>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                        u.role === "admin" ? "bg-purple-500/10 text-purple-400 ring-purple-500/20" :
                        u.role === "staff" ? "bg-blue-500/10 text-blue-400 ring-blue-500/20" :
                        "bg-slate-400/10 text-slate-400 ring-slate-400/20"
                      }`}>
                        {u.role}
                      </span>
                    </div>

                    {/* Actions Row Split */}
                    <span className="text-slate-500 font-medium pt-1">Actions</span>
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleViewProfile(u)}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
                      >
                        View Profile
                      </button>

                      {u.role !== "customer" && (
                        <button
                          type="button"
                          onClick={() => handleChangeRole(u.id, "customer")}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 border border-white/5 transition hover:bg-slate-800 hover:text-white"
                        >
                          Make Customer
                        </button>
                      )}

                      {u.role !== "staff" && (
                        <button
                          type="button"
                          onClick={() => handleChangeRole(u.id, "staff")}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 border border-white/5 transition hover:bg-slate-800 hover:text-white"
                        >
                          Make Staff
                        </button>
                      )}

                      {u.role !== "admin" && (
                        <button
                          type="button"
                          onClick={() => handleChangeRole(u.id, "admin")}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 border border-white/5 transition hover:bg-slate-800 hover:text-white"
                        >
                          Make Admin
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* 2. DESKTOP SYSTEM TABLE VIEW (>= 640px) */}
            <div className="mx-auto hidden w-full rounded-3xl bg-slate-950/40 p-5 shadow-lg border border-white/5 sm:block sm:max-w-7xl sm:p-6">
              <div className="w-full overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-white/5 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3.5 font-semibold">ID</th>
                      <th className="px-4 py-3.5 font-semibold">Username</th>
                      <th className="px-4 py-3.5 font-semibold">Email</th>
                      <th className="px-4 py-3.5 font-semibold">Created At</th>
                      <th className="px-4 py-3.5 font-semibold">Role</th>
                      <th className="px-4 py-3.5 font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => (
                      <tr key={u.id} className="transition hover:bg-white/[0.01]">
                        <td className="break-words px-4 py-4 align-middle font-mono text-xs text-slate-400">
                          {u.id}
                        </td>

                        <td className="break-words px-4 py-4 align-middle font-semibold text-white">
                          {u.username}
                        </td>

                        <td className="break-all px-4 py-4 align-middle text-slate-300">
                          {u.email}
                        </td>

                        <td className="break-words px-4 py-4 align-middle text-xs text-slate-400">
                          {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                        </td>

                        <td className="break-words px-4 py-4 align-middle">
                          <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                            u.role === "admin" ? "bg-rose-500/10 text-rose-300 ring-red-500/20" :
                            u.role === "staff" ? "bg-blue-500/10 text-blue-400 ring-blue-500" :
                            "bg-slate-400/10 text-slate-400 ring-slate-400/20"
                          }`}>
                            {u.role}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewProfile(u)}
                              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
                            >
                              View Profile
                            </button>

                            {u.role !== "customer" && (
                              <button
                                type="button"
                                onClick={() => handleChangeRole(u.id, "customer")}
                                className="rounded-lg bg-slate-900 border border-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                              >
                                Make Customer
                              </button>
                            )}

                            {u.role !== "staff" && (
                              <button
                                type="button"
                                onClick={() => handleChangeRole(u.id, "staff")}
                                className="rounded-lg bg-slate-900 border border-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                              >
                                Make Staff
                              </button>
                            )}

                            {u.role !== "admin" && (
                              <button
                                type="button"
                                onClick={() => handleChangeRole(u.id, "admin")}
                                className="rounded-lg bg-slate-900 border border-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                              >
                                Make Admin
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <UserProfileModal
        open={isProfileOpen}
        profile={selectedProfile}
        loading={profileLoading}
        error={profileError}
        onClose={closeProfileModal}
      />
    </MainLayout>
  );
}