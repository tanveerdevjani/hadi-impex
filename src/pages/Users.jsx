import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Field, Modal, inputClass } from "../components/ui.jsx";
import { api } from "../lib/api.js";
import { useStore } from "../store.jsx";

const empty = { displayName: "", username: "", password: "", role: "read" };

export default function Users() {
  const { user } = useStore();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [password, setPassword] = useState({ currentPassword: "", password: "", confirm: "" });

  async function load() {
    const data = await api("/api/users");
    setUsers(data.users);
  }

  useEffect(() => {
    if (user?.role !== "admin") return;
    load().catch((err) => setError(err.message));
  }, [user]);

  if (user && user.role !== "admin") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-xl font-bold">Users</h1>
        <p className="mt-2 text-sm text-slate-500">Only an admin can manage users.</p>
        <Link to="/containers" className="mt-3 inline-block text-sm font-semibold text-blue-700">Back to containers</Link>
      </div>
    );
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function create(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await api("/api/users", { method: "POST", body: form });
      setForm(empty);
      setNotice("User created.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    setError("");
    try {
      const body = { displayName: editing.displayName, role: editing.role };
      if (editing.password) body.password = editing.password;
      await api(`/api/users/${editing.id}`, { method: "PATCH", body });
      setEditing(null);
      setNotice("User updated.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(account) {
    if (!window.confirm(`Delete ${account.displayName}? They will no longer be able to sign in.`)) return;
    setError("");
    try {
      await api(`/api/users/${account.id}`, { method: "DELETE" });
      setNotice("User deleted.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    if (password.password !== password.confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    try {
      await api("/api/me/password", { method: "POST", body: { currentPassword: password.currentPassword, password: password.password } });
      window.top.location.assign("/login");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          User management
          <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Admin</span>
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{users.length} of 10 accounts in use</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Administrator", "Everything, including user management."],
          ["Can edit (Write)", "View, add, edit, and delete records and files."],
          ["View only (Read)", "View, download, and merge. No changes."],
        ].map(([title, text]) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-0.5 text-xs text-slate-500">{text}</div>
          </div>
        ))}
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div> : null}

      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-bold text-slate-900">New user</h2>
        <Field label="Name"><input className={inputClass} value={form.displayName} onChange={(event) => setField("displayName", event.target.value)} /></Field>
        <Field label="Username"><input className={inputClass} value={form.username} onChange={(event) => setField("username", event.target.value)} autoComplete="off" /></Field>
        <Field label="Password"><input type="password" className={inputClass} value={form.password} onChange={(event) => setField("password", event.target.value)} autoComplete="new-password" /></Field>
        <Field label="Access">
          <select className={inputClass} value={form.role} onChange={(event) => setField("role", event.target.value)}>
            <option value="read">View only (Read)</option>
            <option value="write">Can edit (Write)</option>
          </select>
        </Field>
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Create user</button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              {["Name", "Username", "Access", "Action"].map((heading) => <th key={heading} className="px-3 py-3 font-bold">{heading}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((account) => (
              <tr key={account.id}>
                <td className="px-3 py-3 font-semibold text-slate-800">{account.displayName}</td>
                <td className="px-3 py-3 font-mono text-slate-600">{account.username}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${account.role === "admin" ? "border-slate-300 bg-slate-900 text-white" : account.role === "write" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    {account.role === "admin" ? "Administrator" : account.role === "write" ? "Can edit" : "View only"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-blue-700" onClick={() => setEditing({ ...account, password: "" })}>Edit</button>
                    {account.role === "admin" ? null : <button type="button" className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600" onClick={() => remove(account)}>Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={changePassword} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <h2 className="sm:col-span-3 text-sm font-bold text-slate-900">Change admin password</h2>
        <p className="sm:col-span-3 text-xs text-slate-500">After this change you sign in again with the new password. Do this before the site is public.</p>
        <Field label="Current password"><input type="password" className={inputClass} value={password.currentPassword} onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))} /></Field>
        <Field label="New password"><input type="password" className={inputClass} value={password.password} onChange={(event) => setPassword((current) => ({ ...current, password: event.target.value }))} /></Field>
        <Field label="Confirm new password"><input type="password" className={inputClass} value={password.confirm} onChange={(event) => setPassword((current) => ({ ...current, confirm: event.target.value }))} /></Field>
        <div className="sm:col-span-3 flex justify-end">
          <button type="submit" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">Update password</button>
        </div>
      </form>

      {editing ? (
        <Modal title={`Edit ${editing.username}`} onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="space-y-3">
            <Field label="Name"><input className={inputClass} value={editing.displayName} onChange={(event) => setEditing((current) => ({ ...current, displayName: event.target.value }))} /></Field>
            {editing.role === "admin" ? <p className="text-xs text-slate-500">The admin account keeps admin access.</p> : (
              <Field label="Access">
                <select className={inputClass} value={editing.role} onChange={(event) => setEditing((current) => ({ ...current, role: event.target.value }))}>
                  <option value="read">View only (Read)</option>
                  <option value="write">Can edit (Write)</option>
                </select>
              </Field>
            )}
            <Field label="New password (optional)"><input type="password" className={inputClass} value={editing.password} onChange={(event) => setEditing((current) => ({ ...current, password: event.target.value }))} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Save</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
