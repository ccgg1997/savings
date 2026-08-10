"use client";

import { useState } from "react";
import { Check, KeyRound, Palette, Pencil, Plus, Save, Shield, Trash2, UserCheck, Users, UserX, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { captureClientError, notifySuccess } from "@/lib/client-errors";
import type { AppSettingsData } from "@/lib/settings";

type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  hasPassword: boolean;
  providers: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type UserDraft = { name: string; email: string; password: string; role: "USER" | "ADMIN"; status: "ACTIVE" | "SUSPENDED" };
const emptyUser: UserDraft = { name: "", email: "", password: "", role: "USER", status: "ACTIVE" };
const accents = [
  { value: "MINT", label: "Menta", color: "#287d63" },
  { value: "BLUE", label: "Azul", color: "#2877c8" },
  { value: "VIOLET", label: "Violeta", color: "#7c5bbd" },
  { value: "AMBER", label: "Ámbar", color: "#c47d16" },
] as const;

const fieldClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60";

export function AdminView({ initialUsers, initialSettings, currentUserId, googleConfigured }: { initialUsers: AdminUser[]; initialSettings: AppSettingsData; currentUserId: string; googleConfigured: boolean }) {
  const [users, setUsers] = useState(initialUsers);
  const [settings, setSettings] = useState(initialSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null | undefined>(undefined);
  const [draft, setDraft] = useState<UserDraft>(emptyUser);
  const [savingUser, setSavingUser] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingUser(null);
    setDraft(emptyUser);
  }

  function openEdit(user: AdminUser) {
    setEditingUser(user);
    setDraft({ name: user.name ?? "", email: user.email ?? "", password: "", role: user.role, status: user.status });
  }

  function closeEditor() {
    if (!savingUser) setEditingUser(undefined);
  }

  async function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUser(true);
    try {
      const body = { ...draft, password: draft.password || undefined };
      const response = editingUser
        ? await apiFetch<{ user: AdminUser }>(`/api/admin/users/${editingUser.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await apiFetch<{ user: AdminUser }>("/api/admin/users", { method: "POST", body: JSON.stringify(body) });
      setUsers((current) => editingUser ? current.map((user) => user.id === response.user.id ? response.user : user) : [response.user, ...current]);
      setEditingUser(undefined);
      notifySuccess(editingUser ? "Usuario actualizado." : googleConfigured && draft.status === "ACTIVE" ? "Usuario creado. Ya puede ingresar con Google." : "Usuario creado y autorizado.");
    } catch (error) {
      captureClientError(error, { action: editingUser ? "edit_user" : "create_user", userId: editingUser?.id });
    } finally {
      setSavingUser(false);
    }
  }

  async function updateAccess(user: AdminUser, field: "role" | "status", value: string) {
    setUpdatingId(user.id);
    try {
      const response = await apiFetch<{ user: AdminUser }>(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
      setUsers((current) => current.map((item) => item.id === user.id ? response.user : item));
      notifySuccess("Acceso actualizado.");
    } catch (error) {
      captureClientError(error, { action: "update_user_access", userId: user.id });
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmDelete() {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await apiFetch<{ deletedId: string }>(`/api/admin/users/${deletingUser.id}`, { method: "DELETE" });
      setUsers((current) => current.filter((user) => user.id !== deletingUser.id));
      setDeletingUser(null);
      notifySuccess("Usuario eliminado y acceso revocado.");
    } catch (error) {
      captureClientError(error, { action: "delete_user", userId: deletingUser.id });
    } finally {
      setDeleting(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const saved = await apiFetch<AppSettingsData>("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) });
      setSettings(saved);
      notifySuccess("Configuración guardada.");
    } catch (error) {
      captureClientError(error, { action: "save_front_settings" });
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Control operativo</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Administración</h1><p className="mt-1 text-sm text-muted-foreground">Decide quién puede entrar y cómo se presenta el dashboard.</p></div>
        <button type="button" onClick={openCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="size-4" aria-hidden="true" />Nuevo usuario</button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 className="text-sm font-bold text-card-foreground">Usuarios autorizados</h2><p className="mt-0.5 text-xs text-muted-foreground">{googleConfigured ? "Todo usuario activo puede entrar con Google desde el primer momento." : "Google aún no está configurado; una contraseña habilita el acceso local."}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{users.length}</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead><tr className="border-b border-border bg-muted/45 text-[10px] uppercase tracking-wide text-muted-foreground"><th className="px-4 py-2.5">Usuario</th><th className="py-2.5">Acceso</th><th className="py-2.5">Rol</th><th className="py-2.5">Estado</th><th className="px-4 py-2.5 text-right">Acciones</th></tr></thead>
              <tbody>{users.map((user) => (
                <tr key={user.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-bold text-primary">{user.image ? <img src={user.image} alt="" className="size-full object-cover" /> : (user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-semibold text-card-foreground">{user.name ?? "Sin nombre"}{user.id === currentUserId && <span className="ml-2 text-[10px] font-medium text-primary">Tú</span>}</p><p className="truncate text-muted-foreground">{user.email ?? "Sin correo"}</p></div></div></td>
                  <td><div className="flex flex-wrap gap-1">{googleConfigured && user.status === "ACTIVE" && <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{user.providers.includes("google") ? "Google vinculado" : "Google habilitado"}</span>}{user.hasPassword && <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">Contraseña</span>}{!googleConfigured && !user.hasPassword && <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">Sin método de acceso</span>}</div></td>
                  <td><select aria-label={`Rol de ${user.name ?? user.email}`} value={user.role} disabled={updatingId === user.id} onChange={(event) => updateAccess(user, "role", event.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 font-semibold text-card-foreground disabled:opacity-50"><option value="USER">Usuario</option><option value="ADMIN">Admin</option></select></td>
                  <td><select aria-label={`Estado de ${user.name ?? user.email}`} value={user.status} disabled={updatingId === user.id} onChange={(event) => updateAccess(user, "status", event.target.value)} className={`rounded-lg border px-2 py-1.5 font-semibold disabled:opacity-50 ${user.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}><option value="ACTIVE">Activo</option><option value="SUSPENDED">Suspendido</option></select></td>
                  <td className="px-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => openEdit(user)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" title={`Editar ${user.name ?? user.email}`}><Pencil className="size-4" aria-hidden="true" /><span className="sr-only">Editar usuario</span></button><button type="button" disabled={user.id === currentUserId} onClick={() => setDeletingUser(user)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35" title="Eliminar usuario"><Trash2 className="size-4" aria-hidden="true" /><span className="sr-only">Eliminar usuario</span></button></div></td>
                </tr>
              ))}</tbody>
            </table>
            {users.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">Aún no hay usuarios registrados.</div>}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Palette className="size-5" aria-hidden="true" /></div><div><h2 className="text-sm font-bold text-card-foreground">Apariencia</h2><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Personaliza textos, color y densidad.</p></div></div>
          <div className="mt-4 space-y-3">
            <label className="block space-y-1.5"><span className="text-xs font-semibold text-card-foreground">Nombre de marca</span><input value={settings.brandName} onChange={(event) => setSettings({ ...settings, brandName: event.target.value })} className={fieldClass} maxLength={60} /></label>
            <label className="block space-y-1.5"><span className="text-xs font-semibold text-card-foreground">Título del dashboard</span><input value={settings.dashboardTitle} onChange={(event) => setSettings({ ...settings, dashboardTitle: event.target.value })} className={fieldClass} maxLength={80} /></label>
            <fieldset><legend className="text-xs font-semibold text-card-foreground">Acento de color</legend><div className="mt-2 grid grid-cols-2 gap-2">{accents.map((accent) => <button type="button" key={accent.value} onClick={() => setSettings({ ...settings, accent: accent.value })} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition ${settings.accent === accent.value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}><span className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ backgroundColor: accent.color }} />{accent.label}</span>{settings.accent === accent.value && <Check className="size-4" aria-hidden="true" />}</button>)}</div></fieldset>
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3"><span><span className="block text-xs font-semibold text-card-foreground">Vista compacta</span><span className="mt-0.5 block text-[11px] text-muted-foreground">Reduce espacios de la interfaz</span></span><input type="checkbox" checked={settings.compactMode} onChange={(event) => setSettings({ ...settings, compactMode: event.target.checked })} className="size-4 accent-[var(--primary)]" /></label>
            <button type="button" onClick={saveSettings} disabled={savingSettings} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"><Save className="size-4" aria-hidden="true" />{savingSettings ? "Guardando…" : "Guardar configuración"}</button>
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-3"><Stat icon={Shield} value={users.filter((user) => user.role === "ADMIN").length} label="Administradores" /><Stat icon={UserCheck} value={users.filter((user) => user.status === "ACTIVE").length} label="Usuarios activos" /><Stat icon={UserX} value={users.filter((user) => user.status === "SUSPENDED").length} label="Usuarios suspendidos" /></div>

      {editingUser !== undefined && <UserEditor mode={editingUser ? "edit" : "create"} draft={draft} setDraft={setDraft} onClose={closeEditor} onSubmit={submitUser} saving={savingUser} googleConfigured={googleConfigured} />}
      {deletingUser && <DeleteDialog user={deletingUser} deleting={deleting} onCancel={() => !deleting && setDeletingUser(null)} onConfirm={confirmDelete} />}
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"><div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></div><div><p className="text-xl font-bold text-card-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>;
}

function UserEditor({ mode, draft, setDraft, onClose, onSubmit, saving, googleConfigured }: { mode: "create" | "edit"; draft: UserDraft; setDraft: React.Dispatch<React.SetStateAction<UserDraft>>; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; saving: boolean; googleConfigured: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="user-editor-title" className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Control de acceso</p><h2 id="user-editor-title" className="mt-1 text-xl font-bold text-card-foreground">{mode === "create" ? "Nuevo usuario" : "Editar usuario"}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" title="Cerrar"><X className="size-4" aria-hidden="true" /><span className="sr-only">Cerrar</span></button></div><form onSubmit={onSubmit} className="mt-5 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-semibold">Nombre</span><input required minLength={2} maxLength={80} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className={fieldClass} /></label><label className="space-y-1.5"><span className="text-xs font-semibold">Correo</span><input required type="email" maxLength={190} value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} className={fieldClass} /></label></div>{googleConfigured && draft.status === "ACTIVE" ? <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white font-bold text-blue-600 shadow-sm">G</span><span><strong className="block">Acceso con Google incluido</strong>Podrá ingresar de inmediato con este correo; la cuenta se vinculará en su primer inicio de sesión.</span></div> : null}<label className="block space-y-1.5"><span className="flex items-center gap-2 text-xs font-semibold"><KeyRound className="size-3.5 text-primary" aria-hidden="true" />{mode === "create" ? "Contraseña inicial" : "Nueva contraseña"} <span className="font-normal text-muted-foreground">(opcional)</span></span><input type="password" minLength={12} maxLength={128} autoComplete="new-password" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} className={fieldClass} placeholder="Mínimo 12 caracteres" /><p className="text-[11px] text-muted-foreground">{googleConfigured ? "La contraseña solo es necesaria si también quieres habilitar el acceso local." : "Configura una contraseña para habilitar el acceso local."}</p></label><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-semibold">Rol</span><select value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as UserDraft["role"] }))} className={fieldClass}><option value="USER">Usuario</option><option value="ADMIN">Administrador</option></select></label><label className="space-y-1.5"><span className="text-xs font-semibold">Estado</span><select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as UserDraft["status"] }))} className={fieldClass}><option value="ACTIVE">Activo</option><option value="SUSPENDED">Suspendido</option></select></label></div><div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted">Cancelar</button><button type="submit" disabled={saving} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving ? "Guardando…" : mode === "create" ? googleConfigured && draft.status === "ACTIVE" ? "Crear y habilitar Google" : "Crear y autorizar" : "Guardar cambios"}</button></div></form></section></div>;
}

function DeleteDialog({ user, deleting, onCancel, onConfirm }: { user: AdminUser; deleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"><div className="flex size-10 items-center justify-center rounded-xl bg-red-50 text-red-600"><Trash2 className="size-5" aria-hidden="true" /></div><h2 id="delete-user-title" className="mt-4 text-lg font-bold text-card-foreground">¿Eliminar este usuario?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Se revocará inmediatamente el acceso de <strong className="text-card-foreground">{user.name ?? user.email}</strong> y se eliminarán sus sesiones vinculadas.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} disabled={deleting} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60">Cancelar</button><button type="button" onClick={onConfirm} disabled={deleting} className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleting ? "Eliminando…" : "Eliminar usuario"}</button></div></section></div>;
}
