"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";

interface ExtractionResult {
  amount: number;
  category: string;
  merchant: string;
  confidence_score: number;
}

type EntryStatus = "a_valider" | "comptabilise";

interface LedgerEntry {
  id: number;
  fileName: string;
  receivedAt: Date;
  data: ExtractionResult;
  status: EntryStatus;
}

type ApiState = "checking" | "online" | "offline";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const CONFIDENCE_THRESHOLD = 0.9;

const CATEGORIES: Record<string, { label: string; account: string }> = {
  fuel: { label: "Carburant", account: "6061" },
  toll: { label: "Péages", account: "6251" },
  maintenance: { label: "Entretien véhicule", account: "6155" },
  lodging: { label: "Hébergement", account: "6256" },
  meal: { label: "Frais de mission", account: "6257" },
};

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function describeCategory(raw: string) {
  return CATEGORIES[raw] ?? { label: raw, account: "6288" };
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)]">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [apiState, setApiState] = useState<ApiState>("checking");
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const checkApi = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
      setApiState(res.ok ? "online" : "offline");
    } catch {
      setApiState("offline");
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(checkApi, 0);
    const timer = setInterval(checkApi, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [checkApi]);

  const pickFile = (candidate: File | null) => {
    setFile(candidate);
    setError(null);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => pickFile(e.target.files?.[0] ?? null);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("image/")) pickFile(dropped);
  };

  const handleUpload = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      const response = await fetch(`${API_BASE}/api/v1/expenses/extract`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Le serveur a refusé le justificatif (code ${response.status}).`);
      }
      const data: ExtractionResult = await response.json();
      setResult(data);
      setEntries((prev) => [
        {
          id: nextId.current++,
          fileName: file.name,
          receivedAt: new Date(),
          data,
          status: "a_valider",
        },
        ...prev,
      ]);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setApiState("online");
    } catch (err) {
      if (err instanceof TypeError) {
        setApiState("offline");
        setError("Passerelle injoignable. Vérifiez que l'API de flotte répond sur le port 8000.");
      } else {
        setError(err instanceof Error ? err.message : "Échec de la saisie du justificatif.");
      }
    } finally {
      setLoading(false);
    }
  };

  const postEntry = (id: number) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: "comptabilise" } : e)));

  const pending = entries.filter((e) => e.status === "a_valider");
  const pendingTotal = pending.reduce((sum, e) => sum + e.data.amount, 0);
  const postedTotal = entries
    .filter((e) => e.status === "comptabilise")
    .reduce((sum, e) => sum + e.data.amount, 0);

  const apiBadge = {
    checking: { dot: "bg-slate-400", text: "Vérification…", cls: "text-slate-600" },
    online: { dot: "bg-emerald-500", text: "API de flotte connectée", cls: "text-emerald-700" },
    offline: { dot: "bg-rose-500", text: "API de flotte hors ligne", cls: "text-rose-700" },
  }[apiState];

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-xs font-bold tracking-tight text-white">
              ZC
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Zero-Click Expense</p>
              <p className="text-[11px] text-slate-500">Frais de flotte · Comptabilité fournisseurs</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium ${apiBadge.cls}`}>
            <span className={`h-2 w-2 rounded-full ${apiBadge.dot} ${apiState === "online" ? "shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" : ""}`} />
            {apiBadge.text}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Notes de frais véhicules</h1>
          <p className="mt-1 text-sm text-slate-500">
            Numérisez un justificatif : le fournisseur, la nature de la charge et le montant TTC sont
            lus puis imputés avant validation comptable.
          </p>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Pièces à valider" value={String(pending.length)} hint="En attente de contrôle" />
          <Kpi
            label="Montant à engager"
            value={pending.length ? eur.format(pendingTotal) : "—"}
            hint="Total TTC des pièces ouvertes"
          />
          <Kpi
            label="Comptabilisé"
            value={postedTotal ? eur.format(postedTotal) : "—"}
            hint="Pièces validées cette session"
          />
          <Kpi label="Seuil de lecture" value={`${CONFIDENCE_THRESHOLD * 100} %`} hint="Contrôle manuel en dessous" />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          {/* Saisie */}
          <section className="h-fit rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_8px_24px_-12px_rgba(16,24,40,0.12)]">
            <h2 className="text-sm font-semibold">Saisie d&apos;un justificatif</h2>
            <p className="mt-0.5 text-xs text-slate-500">Ticket carburant, facture atelier, reçu de péage.</p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !loading && inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !loading) inputRef.current?.click();
              }}
              className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 ${
                dragging
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/70"
              } ${loading ? "pointer-events-none opacity-60" : ""}`}
            >
              <svg className="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M7 3h7l5 5v13H7z" strokeLinejoin="round" />
                <path d="M14 3v5h5M10 13h6M10 17h6" strokeLinecap="round" />
              </svg>
              {file ? (
                <>
                  <p className="mt-3 max-w-full truncate text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} Ko · prêt à être transmis</p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm font-medium text-slate-800">Déposez le justificatif ici</p>
                  <p className="text-xs text-slate-500">ou cliquez pour parcourir · JPEG, PNG, HEIC</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={onInputChange}
                className="sr-only"
                aria-label="Sélectionner un justificatif"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-slate-800 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Spinner />
                  Lecture du justificatif…
                </>
              ) : (
                "Transmettre pour imputation"
              )}
            </button>

            {error && (
              <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            )}

            {result && !loading && (
              <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Dernière lecture</p>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Fournisseur</dt>
                  <dd className="font-medium">{result.merchant}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Montant TTC</dt>
                  <dd className="font-medium tabular-nums">{eur.format(result.amount)}</dd>
                </div>
              </dl>
            )}
          </section>

          {/* Journal */}
          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06),0_8px_24px_-12px_rgba(16,24,40,0.12)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Journal des justificatifs</h2>
                <p className="mt-0.5 text-xs text-slate-500">Imputation analytique par véhicule et nature de charge</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium tabular-nums text-slate-600">
                {entries.length} pièce{entries.length > 1 ? "s" : ""}
              </span>
            </div>

            {entries.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-20 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2z" strokeLinejoin="round" />
                    <path d="M9 9h6M9 13h4" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-800">Aucun justificatif au journal</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                  Les pièces transmises depuis le poste de saisie apparaîtront ici, prêtes pour le contrôle
                  et la comptabilisation.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-2.5 font-medium">Reçu le</th>
                      <th className="px-3 py-2.5 font-medium">Fournisseur</th>
                      <th className="px-3 py-2.5 font-medium">Nature · Compte</th>
                      <th className="px-3 py-2.5 text-right font-medium">Montant TTC</th>
                      <th className="px-3 py-2.5 font-medium">Fiabilité de lecture</th>
                      <th className="px-5 py-2.5 text-right font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((entry) => {
                      const cat = describeCategory(entry.data.category);
                      const pct = Math.round(entry.data.confidence_score * 100);
                      const low = entry.data.confidence_score < CONFIDENCE_THRESHOLD;
                      return (
                        <tr key={entry.id} className="row-in transition-colors duration-150 hover:bg-slate-50">
                          <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                            {dateTime.format(entry.receivedAt)}
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-slate-900">{entry.data.merchant}</p>
                            <p className="max-w-[180px] truncate text-xs text-slate-400">{entry.fileName}</p>
                          </td>
                          <td className="px-3 py-3">
                            <p>{cat.label}</p>
                            <p className="font-mono text-xs text-slate-400">Cpt {cat.account}</p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums">
                            {eur.format(entry.data.amount)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${low ? "bg-amber-500" : "bg-emerald-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs tabular-nums text-slate-600">{pct} %</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right">
                            {entry.status === "comptabilise" ? (
                              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                Comptabilisé
                              </span>
                            ) : (
                              <button
                                onClick={() => postEntry(entry.id)}
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-900 hover:bg-slate-900 hover:text-white active:scale-95"
                              >
                                Valider
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
