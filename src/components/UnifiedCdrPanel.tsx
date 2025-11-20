import React, { useState } from 'react';

interface TimelineEntry {
  id?: number;
  calling_id?: string | null;
  called_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration?: number | null;
  type_flux?: string | null;
  operator?: string | null;
  direction?: string | null;
  client?: string | null;
  provider?: string | null;
  release_cause?: string | null;
  raw_payload?: Record<string, unknown> | null;
}

interface StatsResponse {
  volumeByOperator: { operator: string | null; total: number }[];
  volumeByFlux: { type_flux: string | null; total: number }[];
  releaseCauses: { release_cause: string | null; total: number }[];
  topCalling: { number: string | null; total: number }[];
  topCalled: { number: string | null; total: number }[];
  money: { operator: string | null; type_flux: string | null; total: number; amount: number | null }[];
}

const formatDuration = (value?: number | null) => {
  if (value == null) return 'N/A';
  if (value >= 60) {
    return `${Math.floor(value / 60)} min ${value % 60}s`;
  }
  return `${value}s`;
};

const UnifiedCdrPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [operator, setOperator] = useState('');
  const [direction, setDirection] = useState('');
  const [typeFlux, setTypeFlux] = useState('');
  const [msisdn, setMsisdn] = useState('');
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [ingestMessage, setIngestMessage] = useState('');
  const [searchResults, setSearchResults] = useState<TimelineEntry[]>([]);
  const [filters, setFilters] = useState({ start: '', end: '', provider: '', client: '', release: '' });
  const [loadingSearch, setLoadingSearch] = useState(false);

  const uploadFile = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('cdrFile', file);
    if (operator) form.append('operator', operator);
    if (direction) form.append('direction', direction);
    if (typeFlux) form.append('type_flux', typeFlux);

    const response = await fetch('/api/cdr/unified/ingest', {
      method: 'POST',
      body: form,
      credentials: 'include'
    });
    const data = await response.json();
    if (response.ok) {
      setIngestMessage(`Ingestion: ${data.inserted || 0} lignes intégrées`);
    } else {
      setIngestMessage(data.error || 'Erreur lors de l\'ingestion');
    }
  };

  const loadTimeline = async () => {
    if (!msisdn) return;
    setTimelineLoading(true);
    try {
      const params = new URLSearchParams({ msisdn });
      if (filters.start) params.append('start_date', filters.start);
      if (filters.end) params.append('end_date', filters.end);
      const response = await fetch(`/api/cdr/unified/timeline?${params.toString()}`, { credentials: 'include' });
      const data = await response.json();
      setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
    } catch (error) {
      console.error(error);
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  const loadStats = async () => {
    const response = await fetch('/api/cdr/unified/stats', { credentials: 'include' });
    const data = await response.json();
    if (response.ok) {
      setStats(data);
    }
  };

  const runSearch = async () => {
    setLoadingSearch(true);
    try {
      const params = new URLSearchParams();
      if (msisdn) params.append('number', msisdn);
      if (filters.start) params.append('start_date', filters.start);
      if (filters.end) params.append('end_date', filters.end);
      if (filters.provider) params.append('provider', filters.provider);
      if (filters.client) params.append('client', filters.client);
      if (filters.release) params.append('release_cause', filters.release);
      const response = await fetch(`/api/cdr/unified/search?${params.toString()}`, { credentials: 'include' });
      const data = await response.json();
      setSearchResults(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      console.error(error);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/60 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-black/30">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">CDR unifiés (voix, SMS, MM)</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Ingestion multi-format et recherche chronologique en conservant toutes les colonnes sources.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ingestion fichier</h4>
          <input type="file" accept=".csv,.txt,.xls,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              placeholder="Opérateur"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              placeholder="Direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              placeholder="Type flux"
              value={typeFlux}
              onChange={(e) => setTypeFlux(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={uploadFile}
            disabled={!file}
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
          >
            Charger
          </button>
          {ingestMessage && <p className="text-xs text-emerald-600 dark:text-emerald-300">{ingestMessage}</p>}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Recherche chronologique</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              placeholder="MSISDN"
              value={msisdn}
              onChange={(e) => setMsisdn(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              type="date"
              value={filters.start}
              onChange={(e) => setFilters((prev) => ({ ...prev, start: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              type="date"
              value={filters.end}
              onChange={(e) => setFilters((prev) => ({ ...prev, end: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              placeholder="Provider"
              value={filters.provider}
              onChange={(e) => setFilters((prev) => ({ ...prev, provider: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              placeholder="Client"
              value={filters.client}
              onChange={(e) => setFilters((prev) => ({ ...prev, client: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              placeholder="Release cause"
              value={filters.release}
              onChange={(e) => setFilters((prev) => ({ ...prev, release: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadTimeline}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Voir la timeline
            </button>
            <button
              type="button"
              onClick={runSearch}
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100"
            >
              Recherche avancée
            </button>
            <button
              type="button"
              onClick={loadStats}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Stats
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Timeline</h4>
        {timelineLoading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : timeline.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune donnée disponible.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Appelant</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Appelé</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Durée</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Flux</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Opérateur</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cause</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {timeline.map((item, index) => (
                  <tr key={`${item.id || 'row'}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200">
                      {item.start_time ? new Date(item.start_time).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200">{item.calling_id || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200">{item.called_id || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200">{formatDuration(item.duration)}</td>
                    <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200">{item.type_flux || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200">{item.operator || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200">{item.release_cause || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Résultats détaillés</h4>
        {loadingSearch ? (
          <p className="text-sm text-slate-500">Recherche...</p>
        ) : searchResults.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune correspondance.</p>
        ) : (
          <div className="space-y-3">
            {searchResults.map((item, index) => (
              <div key={`${item.id || 'detail'}-${index}`} className="rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex flex-wrap gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-semibold">{item.calling_id || 'N/A'}</span>
                  <span>→ {item.called_id || 'N/A'}</span>
                  <span>{item.start_time ? new Date(item.start_time).toLocaleString() : 'N/A'}</span>
                  <span>{formatDuration(item.duration)}</span>
                  <span>{item.type_flux || 'flux inconnu'}</span>
                  <span>{item.operator || 'opérateur ?'}</span>
                  {item.client && <span>Client: {item.client}</span>}
                  {item.provider && <span>Fournisseur: {item.provider}</span>}
                  {item.release_cause && <span>Cause: {item.release_cause}</span>}
                </div>
                {item.raw_payload && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {JSON.stringify(item.raw_payload, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Volumes par opérateur</h4>
            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
              {stats.volumeByOperator.map((row, idx) => (
                <li key={`${row.operator}-${idx}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <span>{row.operator || 'Inconnu'}</span>
                  <span className="font-semibold">{row.total}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Flux & transactions</h4>
            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
              {stats.volumeByFlux.map((row, idx) => (
                <li key={`${row.type_flux}-${idx}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <span>{row.type_flux || 'Non défini'}</span>
                  <span className="font-semibold">{row.total}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Top numéros appelants/appelés</h4>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-200">
              <div>
                <p className="text-xs uppercase text-slate-500">Appelants</p>
                <ul className="space-y-1">
                  {stats.topCalling.map((row, idx) => (
                    <li key={`${row.number}-${idx}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <span>{row.number || 'N/A'}</span>
                      <span className="font-semibold">{row.total}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Appelés</p>
                <ul className="space-y-1">
                  {stats.topCalled.map((row, idx) => (
                    <li key={`${row.number}-${idx}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      <span>{row.number || 'N/A'}</span>
                      <span className="font-semibold">{row.total}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Montants Mobile Money</h4>
            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
              {stats.money.map((row, idx) => (
                <li key={`${row.operator}-${row.type_flux}-${idx}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <span>{row.operator || 'Opérateur ?'} / {row.type_flux || 'flux ?'}</span>
                  <span className="font-semibold">{row.amount ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedCdrPanel;
