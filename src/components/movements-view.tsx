"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FilterX,
  Landmark,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import type { TransactionInput, TransactionRecord, TransactionsData, TransactionType } from "@/lib/notion";
import { apiFetch } from "@/lib/api";
import { captureClientError, notifySuccess } from "@/lib/client-errors";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const today = () => new Date().toISOString().slice(0, 10);

type EditorState = { mode: "create"; type: TransactionType } | { mode: "edit"; transaction: TransactionRecord };
type TransactionDraft = Omit<TransactionInput, "amount"> & { amount: string };

function money(value: number) {
  return currency.format(value);
}

function emptyDraft(type: TransactionType): TransactionDraft {
  return {
    type,
    description: "",
    date: today(),
    amount: "",
    account: "",
    category: "",
    division: type === "income" ? "Ingresos" : "",
  };
}

function draftFromTransaction(transaction: TransactionRecord): TransactionDraft {
  return { ...transaction, amount: String(transaction.amount) };
}

export function MovementsView({ initialData, initialDivision }: { initialData: TransactionsData; initialDivision?: string }) {
  const [transactions, setTransactions] = useState(initialData.transactions);
  const [category, setCategory] = useState("all");
  const [division, setDivision] = useState(initialDivision && initialData.divisions.includes(initialDivision) ? initialDivision : "all");
  const [type, setType] = useState<"all" | TransactionType>("all");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<TransactionRecord | null>(null);

  const categories = useMemo(() => [...new Set(transactions.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "es")), [transactions]);
  const divisions = useMemo(() => [...new Set(transactions.map((item) => item.division))].sort((a, b) => a.localeCompare(b, "es")), [transactions]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return transactions.filter((item) => {
      if (type !== "all" && item.type !== type) return false;
      if (category !== "all" && item.category !== category) return false;
      if (division !== "all" && item.division !== division) return false;
      if (query && ![item.description, item.account, item.category, item.division].some((value) => value.toLocaleLowerCase("es").includes(query))) return false;
      return true;
    });
  }, [transactions, type, category, division, search]);

  const totals = useMemo(() => {
    const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const filtersActive = category !== "all" || division !== "all" || type !== "all" || search.length > 0;
  const writable = initialData.source === "notion";

  function clearFilters() {
    setCategory("all");
    setDivision("all");
    setType("all");
    setSearch("");
  }

  function handleSaved(transaction: TransactionRecord) {
    setTransactions((current) => {
      const exists = current.some((item) => item.id === transaction.id);
      const next = exists ? current.map((item) => item.id === transaction.id ? transaction : item) : [transaction, ...current];
      return next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    setEditor(null);
  }

  function handleDeleted(id: string) {
    setTransactions((current) => current.filter((item) => item.id !== id));
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground"><WalletCards className="size-3" aria-hidden="true" />Centro de movimientos</span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${writable ? "text-emerald-700" : "text-amber-700"}`}><span className={`size-1.5 rounded-full ${writable ? "bg-emerald-500" : "bg-amber-500"}`} />{writable ? "Notion conectado" : "Datos de demostración"}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">Movimientos</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">Consulta, filtra y administra los ingresos y gastos sincronizados con tus bases de Notion.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditor({ mode: "create", type: "income" })} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100"><ArrowDownLeft className="size-4" aria-hidden="true" />Nuevo ingreso</button>
          <button type="button" onClick={() => setEditor({ mode: "create", type: "expense" })} className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface-dark px-4 text-xs font-bold text-surface-dark-foreground shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800"><Plus className="size-4" aria-hidden="true" />Nuevo gasto</button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de movimientos">
        <SummaryCard icon={ReceiptText} label="Movimientos" value={String(transactions.length)} helper="registros sincronizados" tone="neutral" />
        <SummaryCard icon={ArrowDownLeft} label="Ingresos" value={money(totals.income)} helper="total acumulado" tone="income" />
        <SummaryCard icon={ArrowUpRight} label="Gastos" value={money(totals.expense)} helper="total acumulado" tone="expense" />
        <SummaryCard icon={CircleDollarSign} label="Balance" value={money(totals.balance)} helper="ingresos menos gastos" tone="featured" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/90 bg-card shadow-[0_10px_35px_rgba(25,48,40,0.045)]">
        <div className="border-b border-border/80 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h2 className="text-base font-bold tracking-tight text-card-foreground">Todos los movimientos</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Los filtros de división y categoría son independientes.</p>
            </div>
            <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:max-w-4xl xl:grid-cols-[1.2fr_1fr_1fr_auto]">
              <label className="relative block">
                <span className="sr-only">Buscar movimientos</span>
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar movimiento…" className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20" />
              </label>
              <FilterSelect label="División" value={division} onChange={setDivision} options={divisions} />
              <FilterSelect label="Categoría" value={category} onChange={setCategory} options={categories} />
              <button type="button" onClick={clearFilters} disabled={!filtersActive} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35"><FilterX className="size-4" aria-hidden="true" /><span className="sm:hidden xl:inline">Limpiar</span></button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "income", "expense"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setType(value)} className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition ${type === value ? "bg-surface-dark text-surface-dark-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{value === "all" ? "Todos" : value === "income" ? "Ingresos" : "Gastos"}</button>
            ))}
            <span className="ml-auto text-[10px] font-semibold text-muted-foreground">{filtered.length} de {transactions.length}</span>
          </div>
        </div>

        <MovementList rows={filtered} writable={writable} onEdit={(transaction) => setEditor({ mode: "edit", transaction })} onDelete={setDeleting} />
      </section>

      {editor ? <TransactionEditor state={editor} categories={categories} divisions={divisions} writable={writable} onClose={() => setEditor(null)} onSaved={handleSaved} /> : null}
      {deleting ? <DeleteTransactionDialog transaction={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} /> : null}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, helper, tone }: { icon: typeof ReceiptText; label: string; value: string; helper: string; tone: "neutral" | "income" | "expense" | "featured" }) {
  const styles = {
    neutral: "border-border bg-card text-card-foreground",
    income: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
    expense: "border-orange-200 bg-orange-50/70 text-orange-950",
    featured: "border-slate-700 bg-surface-dark text-surface-dark-foreground",
  };
  const icons = {
    neutral: "bg-muted text-foreground",
    income: "bg-emerald-500/12 text-emerald-700",
    expense: "bg-orange-500/12 text-orange-700",
    featured: "bg-white/10 text-emerald-300",
  };
  return <article className={`rounded-2xl border p-5 shadow-[0_10px_30px_rgba(25,48,40,0.045)] ${styles[tone]}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-[10px] font-semibold ${tone === "featured" ? "text-white/45" : "text-muted-foreground"}`}>{label}</p><p className="mt-2 truncate text-xl font-bold tracking-tight">{value}</p></div><span className={`flex size-10 items-center justify-center rounded-xl ${icons[tone]}`}><Icon className="size-5" aria-hidden="true" /></span></div><p className={`mt-4 text-[9px] ${tone === "featured" ? "text-white/35" : "text-muted-foreground"}`}>{helper}</p></article>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="relative block"><span className="pointer-events-none absolute left-3 top-1.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 pb-1 pt-3 text-[11px] font-bold text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"><option value="all">Todas</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" aria-hidden="true" /></label>;
}

function MovementList({ rows, writable, onEdit, onDelete }: { rows: TransactionRecord[]; writable: boolean; onEdit: (row: TransactionRecord) => void; onDelete: (row: TransactionRecord) => void }) {
  if (!rows.length) return <div className="p-10 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Search className="size-5" aria-hidden="true" /></span><p className="mt-3 text-sm font-bold text-card-foreground">No encontramos movimientos</p><p className="mt-1 text-xs text-muted-foreground">Prueba otra combinación de división y categoría.</p></div>;
  return (
    <div className="border-t border-border/70">
      <div className="flex items-center justify-between px-4 py-2 text-[9px] font-semibold text-muted-foreground sm:hidden">
        <span>Tabla completa</span><span>Desliza horizontalmente →</span>
      </div>
      <div className="scrollbar-subtle overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Tabla completa de movimientos; desplázate horizontalmente para ver todas las columnas">
        <table className="w-full min-w-[940px] text-left text-[11px]">
          <thead><tr className="border-b border-border bg-muted/45 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground"><th className="sticky left-0 z-20 bg-muted px-4 py-3 sm:px-5">Movimiento</th><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">División</th><th className="px-3 py-3">Categoría</th><th className="px-3 py-3">Cuenta</th><th className="px-3 py-3 text-right">Monto</th><th className="sticky right-0 z-20 bg-muted px-4 py-3 text-right sm:px-5">Acciones</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="group border-b border-border/60 last:border-0 hover:bg-muted/25"><td className="sticky left-0 z-10 bg-card px-4 py-3 transition group-hover:bg-muted sm:px-5"><MovementIdentity row={row} /></td><td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{dateFormatter.format(new Date(`${row.date}T12:00:00`))}</td><td className="px-3 py-3"><span className="inline-flex rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">{row.division}</span></td><td className="px-3 py-3"><span className="inline-flex rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">{row.category}</span></td><td className="px-3 py-3"><span className="inline-flex rounded-full border border-border bg-card px-2.5 py-1 font-semibold text-muted-foreground">{row.account}</span></td><td className={`whitespace-nowrap px-3 py-3 text-right font-bold ${row.type === "income" ? "text-emerald-700" : "text-card-foreground"}`}>{row.type === "income" ? "+" : "−"}{money(row.amount)}</td><td className="sticky right-0 z-10 bg-card px-4 py-3 transition group-hover:bg-muted sm:px-5"><div className="flex justify-end gap-1"><button type="button" disabled={!writable} onClick={() => onEdit(row)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-30" title="Editar movimiento"><Pencil className="size-3.5" aria-hidden="true" /><span className="sr-only">Editar</span></button><button type="button" disabled={!writable} onClick={() => onDelete(row)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-30" title="Eliminar movimiento"><Trash2 className="size-3.5" aria-hidden="true" /><span className="sr-only">Eliminar</span></button></div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function MovementIdentity({ row }: { row: TransactionRecord }) {
  return <div className="flex items-center gap-3"><span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${row.type === "income" ? "bg-emerald-500/10 text-emerald-700" : "bg-orange-500/10 text-orange-700"}`}>{row.type === "income" ? <ArrowDownLeft className="size-4" aria-hidden="true" /> : <ArrowUpRight className="size-4" aria-hidden="true" />}</span><div className="min-w-0"><p className="truncate font-bold text-card-foreground">{row.description}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{row.type === "income" ? "Ingreso" : "Gasto"}</p></div></div>;
}

function TransactionEditor({ state, categories, divisions, writable, onClose, onSaved }: { state: EditorState; categories: string[]; divisions: string[]; writable: boolean; onClose: () => void; onSaved: (transaction: TransactionRecord) => void }) {
  const existing = state.mode === "edit" ? state.transaction : null;
  const [draft, setDraft] = useState<TransactionDraft>(state.mode === "edit" ? draftFromTransaction(state.transaction) : emptyDraft(state.type));
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writable) return;
    setSaving(true);
    try {
      const input: TransactionInput = { ...draft, amount: Number(draft.amount) };
      const response = existing
        ? await apiFetch<{ transaction: TransactionRecord }>(`/api/transactions/${existing.id}`, { method: "PATCH", body: JSON.stringify(input) })
        : await apiFetch<{ transaction: TransactionRecord }>("/api/transactions", { method: "POST", body: JSON.stringify(input) });
      onSaved(response.transaction);
      notifySuccess(existing ? "Movimiento actualizado en Notion." : `${draft.type === "income" ? "Ingreso" : "Gasto"} agregado a Notion.`);
    } catch (error) {
      captureClientError(error, { action: existing ? "update_transaction" : "create_transaction", transactionId: existing?.id });
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-55";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="transaction-editor-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card/95 px-5 py-5 backdrop-blur sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Sincronización con Notion</p><h2 id="transaction-editor-title" className="mt-1 text-xl font-bold tracking-tight text-card-foreground">{existing ? "Editar movimiento" : draft.type === "income" ? "Nuevo ingreso" : "Nuevo gasto"}</h2></div><button type="button" onClick={onClose} disabled={saving} className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"><X className="size-4" aria-hidden="true" /><span className="sr-only">Cerrar</span></button></div><form onSubmit={submit} className="space-y-5 p-5 sm:p-6"><fieldset disabled={Boolean(existing)}><legend className="text-xs font-bold text-card-foreground">Tipo de movimiento</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDraft((current) => ({ ...emptyDraft("income"), description: current.description, amount: current.amount, date: current.date, account: current.account }))} className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${draft.type === "income" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border text-muted-foreground hover:bg-muted"}`}><ArrowDownLeft className="size-4" aria-hidden="true" />Ingreso</button><button type="button" onClick={() => setDraft((current) => ({ ...emptyDraft("expense"), description: current.description, amount: current.amount, date: current.date, account: current.account }))} className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${draft.type === "expense" ? "border-orange-300 bg-orange-50 text-orange-700" : "border-border text-muted-foreground hover:bg-muted"}`}><ArrowUpRight className="size-4" aria-hidden="true" />Gasto</button></div></fieldset><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-bold text-card-foreground">Descripción</span><input required minLength={2} maxLength={160} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={fieldClass} placeholder="Ej. Mercado semanal" /></label><label className="space-y-1.5"><span className="text-xs font-bold text-card-foreground">Monto</span><input required type="number" min="1" step="any" inputMode="decimal" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} className={fieldClass} placeholder="0" /></label><label className="space-y-1.5"><span className="text-xs font-bold text-card-foreground">Fecha</span><input required type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className={fieldClass} /></label><label className="space-y-1.5"><span className="text-xs font-bold text-card-foreground">División</span><input required list="division-options" value={draft.division} onChange={(event) => setDraft({ ...draft, division: event.target.value })} className={fieldClass} placeholder="Ej. Hogar" /><datalist id="division-options">{divisions.map((value) => <option key={value} value={value} />)}</datalist></label><label className="space-y-1.5"><span className="text-xs font-bold text-card-foreground">Categoría</span><input required list="category-options" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={fieldClass} placeholder="Ej. Alimentación" /><datalist id="category-options">{categories.map((value) => <option key={value} value={value} />)}</datalist></label><label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-bold text-card-foreground">Cuenta</span><input required value={draft.account} onChange={(event) => setDraft({ ...draft, account: event.target.value })} className={fieldClass} placeholder="Ej. Bancolombia" /></label></div>{!writable ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Conecta las bases de ingresos y gastos de Notion para guardar movimientos reales.</div> : <div className="flex items-start gap-2 rounded-xl bg-secondary p-3 text-[11px] leading-5 text-secondary-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />El movimiento se guardará directamente en la base de {draft.type === "income" ? "ingresos" : "gastos"} configurada en Notion.</div>}<div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50">Cancelar</button><button type="submit" disabled={saving || !writable} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-surface-dark px-5 text-xs font-bold text-surface-dark-foreground transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50">{saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{saving ? "Guardando…" : !writable ? "Notion no conectado" : existing ? "Guardar cambios" : "Agregar movimiento"}</button></div></form></section></div>;
}

function DeleteTransactionDialog({ transaction, onClose, onDeleted }: { transaction: TransactionRecord; onClose: () => void; onDeleted: (id: string) => void }) {
  const [loading, setLoading] = useState(false);
  async function confirm() {
    setLoading(true);
    try {
      const response = await apiFetch<{ deletedId: string }>(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      onDeleted(response.deletedId);
      notifySuccess("Movimiento archivado en Notion.");
    } catch (error) {
      captureClientError(error, { action: "delete_transaction", transactionId: transaction.id });
    } finally {
      setLoading(false);
    }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-transaction-title" className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"><span className="flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 className="size-5" aria-hidden="true" /></span><h2 id="delete-transaction-title" className="mt-4 text-lg font-bold text-card-foreground">¿Eliminar este movimiento?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground"><strong className="text-card-foreground">{transaction.description}</strong> por {money(transaction.amount)} se archivará en Notion y dejará de aparecer en los totales.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={loading} className="h-10 rounded-xl border border-border px-4 text-xs font-bold hover:bg-muted disabled:opacity-50">Cancelar</button><button type="button" onClick={confirm} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">{loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{loading ? "Eliminando…" : "Eliminar"}</button></div></section></div>;
}
