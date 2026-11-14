"use client";

import { ChangeEvent, useState } from "react";

interface ExtractionResult {
  amount: number;
  category: string;
  merchant: string;
  confidence_score: number;
}

const API_URL = "http://localhost:8000/api/v1/expenses/extract";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      const response = await fetch(API_URL, { method: "POST", body: formData });
      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }
      const data: ExtractionResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Zero-Click Expense</h1>
        <p className="text-gray-600">Scan de reçus et suivi des dépenses de flotte</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Colonne gauche : Mobile Scanner */}
        <section className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-4 self-start">Mobile Scanner</h2>
          <div className="w-72 rounded-[2.5rem] border-8 border-gray-800 bg-gray-100 p-5 shadow-lg">
            <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-gray-800" />
            <div className="flex flex-col gap-4 min-h-96 justify-center">
              <label className="text-sm font-medium text-gray-700">
                Photo du reçu
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-200 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-300"
                />
              </label>
              {file && (
                <p className="truncate text-xs text-gray-500">{file.name}</p>
              )}
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading ? "Envoi..." : "Envoyer le reçu"}
              </button>
              {loading && (
                <p className="animate-pulse text-center text-sm text-blue-700">
                  Analyse IA en cours...
                </p>
              )}
              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}
            </div>
          </div>
        </section>

        {/* Colonne droite : Dashboard Admin */}
        <section className="bg-white shadow-md rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard Admin</h2>
          {result ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase text-xs">
                    <th className="py-3 pr-4">Montant</th>
                    <th className="py-3 pr-4">Catégorie</th>
                    <th className="py-3 pr-4">Marchand</th>
                    <th className="py-3">Score de confiance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-semibold">
                      {result.amount.toFixed(2)} €
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        {result.category}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{result.merchant}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        {(result.confidence_score * 100).toFixed(0)} %
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">
              Aucune donnée extraite pour le moment. Envoyez un reçu depuis le scanner.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
