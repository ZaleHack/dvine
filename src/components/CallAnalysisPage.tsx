import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PhoneIncoming, RefreshCw, Activity, Clock, BarChart3, Sparkles, Phone } from 'lucide-react';
import PageHeader from './PageHeader';
import { useNotifications } from './NotificationProvider';

interface CallRecord {
  calling_id: string;
  called_id: string;
  duration: number;
  start_time: string;
  end_time: string;
  org_pcip: string;
  dst_pcip: string;
  release_cause: string;
  client: string;
  provider: string;
}

interface BreakdownEntry {
  label: string;
  count: number;
  averageDuration?: number;
}

interface CallSearchSummary {
  totalDuration: number;
  averageDuration: number;
  maxDuration: number;
  asCaller: number;
  asCallee: number;
  providerBreakdown: BreakdownEntry[];
  releaseCauses: BreakdownEntry[];
}

interface CallSearchResponse {
  number: string;
  total: number;
  limit: number;
  calls: CallRecord[];
  summary: CallSearchSummary;
}

interface CallGlobalStats {
  overview: {
    totalCalls: number;
    totalDuration: number;
    averageDuration: number;
    maxDuration: number;
    lastCallAt: string | null;
  };
  providers: BreakdownEntry[];
  clients: BreakdownEntry[];
  releaseCauses: BreakdownEntry[];
  hourlyDistribution: { hour: string; count: number; averageDuration: number }[];
  recentVolume: { day: string; count: number; duration: number }[];
}

const formatDuration = (seconds?: number) => {
  const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}s`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).format(date);
};

const ProgressPill = ({ value, max, label }: { value: number; max: number; label: string }) => {
  const percentage = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
        <span>{label}</span>
        <span className="text-slate-600">{percentage}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const BreakdownList = ({
  title,
  data,
  accent
}: {
  title: string;
  data: BreakdownEntry[];
  accent?: 'indigo' | 'rose' | 'amber';
}) => {
  const maxValue = useMemo(() => (data.length ? Math.max(...data.map((item) => item.count)) : 0), [data]);

  const accentStyles = useMemo(() => {
    switch (accent) {
      case 'rose':
        return {
          container: 'from-rose-600/12 via-orange-500/12 to-amber-500/12 border-rose-200/80',
          bar: 'from-rose-500 via-orange-500 to-amber-400'
        };
      case 'amber':
        return {
          container: 'from-amber-500/12 via-lime-500/12 to-emerald-500/12 border-amber-200/80',
          bar: 'from-amber-500 via-lime-500 to-emerald-500'
        };
      default:
        return {
          container: 'from-indigo-600/12 via-blue-500/12 to-cyan-500/12 border-indigo-200/80',
          bar: 'from-indigo-500 via-blue-500 to-cyan-400'
        };
    }
  }, [accent]);

  return (
    <div
      className={`rounded-3xl border bg-gradient-to-br ${accentStyles.container} p-6 shadow-[0_20px_60px_-25px_rgba(79,70,229,0.35)] backdrop-blur`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-700">{title}</h3>
        <Sparkles className="h-4 w-4 text-slate-500" />
      </div>
      <div className="space-y-3">
        {data.length === 0 && <p className="text-sm text-slate-500">Aucune donnée disponible</p>}
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-12 text-xs font-semibold text-slate-700">{item.count}</div>
            <div className="flex-1 rounded-full bg-white/70">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${accentStyles.bar}`}
                style={{ width: `${maxValue === 0 ? 0 : Math.max(10, Math.round((item.count / maxValue) * 100))}%` }}
              />
            </div>
            <div className="w-36 text-xs font-semibold text-slate-700 text-right truncate" title={item.label}>
              {item.label || 'Non renseigné'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon,
  hint
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}) => (
  <div className="relative overflow-hidden rounded-3xl border border-slate-100/70 bg-white/80 p-6 shadow-xl">
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-rose-50/60 to-indigo-50/70" />
    <div className="relative flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-indigo-500 text-white shadow-lg shadow-fuchsia-300/30">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  </div>
);

const CallAnalysisPage: React.FC = () => {
  const { notifyError, notifyInfo } = useNotifications();
  const [number, setNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [result, setResult] = useState<CallSearchResponse | null>(null);
  const [globalStats, setGlobalStats] = useState<CallGlobalStats | null>(null);

  const fetchGlobalStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/call-analysis/stats', {
        credentials: 'include',
        headers
      });
      if (!response.ok) {
        throw new Error('Impossible de charger les statistiques');
      }
      const data: CallGlobalStats = await response.json();
      setGlobalStats(data);
    } catch (error) {
      console.error(error);
      notifyError("Erreur lors du chargement des statistiques d'appels");
    } finally {
      setStatsLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  const handleSearch = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!number.trim()) {
        setSearchError('Veuillez renseigner un numéro à analyser.');
        notifyInfo('Ajoutez un numéro pour lancer la recherche.');
        return;
      }

      setSearchError('');
      setSearchLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const params = new URLSearchParams();
        params.set('number', number.trim());
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (startTime) params.set('startTime', startTime);
        if (endTime) params.set('endTime', endTime);

        const response = await fetch(`/api/call-analysis/search?${params.toString()}`, {
          credentials: 'include',
          headers
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message = payload.error || "Impossible d'exécuter la recherche";
          throw new Error(message);
        }

        const data: CallSearchResponse = await response.json();
        setResult(data);
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "Erreur lors de la recherche";
        setSearchError(message);
        notifyError(message);
      } finally {
        setSearchLoading(false);
      }
    },
    [number, startDate, endDate, startTime, endTime, notifyError, notifyInfo]
  );

  const totalCalls = (result?.summary?.asCaller || 0) + (result?.summary?.asCallee || 0);
  const inboundRatio = totalCalls === 0 ? 0 : Math.round(((result?.summary?.asCallee || 0) / totalCalls) * 100);

  const maxRecentVolume = useMemo(
    () => (globalStats?.recentVolume?.length ? Math.max(...globalStats.recentVolume.map((day) => day.count || 0)) : 0),
    [globalStats]
  );

  const maxHourlyDistribution = useMemo(
    () =>
      globalStats?.hourlyDistribution?.length
        ? Math.max(...globalStats.hourlyDistribution.map((entry) => entry.count || 0))
        : 0,
    [globalStats]
  );

  const busiestHour = useMemo(() => {
    if (!globalStats?.hourlyDistribution?.length) return null;
    return [...globalStats.hourlyDistribution].sort((a, b) => b.count - a.count)[0];
  }, [globalStats]);

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<PhoneIncoming className="h-6 w-6" />}
        title="Analyse des appels"
        subtitle="Surveillez les communications MTN / Airtel avec un tableau de bord temps réel et des statistiques éclairées"
      />

      <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 p-8 shadow-[0_30px_80px_-30px_rgba(79,70,229,0.35)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-500/15 via-fuchsia-500/10 to-indigo-500/20" />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-rose-600 shadow-lg shadow-rose-200">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Recherche ciblée</h2>
                <p className="text-sm text-slate-600">
                  Filtrez par numéro, plage de dates et horaires pour isoler des séquences d'appels précises.
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="grid gap-4 rounded-2xl border border-white/60 bg-white/80 p-6 shadow-inner">
              <div className="grid gap-4 md:grid-cols-[1.3fr_1fr] md:items-end">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Numéro à analyser</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500" />
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="Ex. 242065110522"
                      className="w-full rounded-xl border border-slate-200 bg-white/70 px-10 py-3 text-sm font-semibold text-slate-800 shadow-sm transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Date début</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Heure début</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Date fin</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Heure fin</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                </div>
              </div>

              {searchError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  {searchError}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-300/30 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {searchLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PhoneIncoming className="h-4 w-4" />}
                  Lancer l'analyse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNumber('');
                    setStartDate('');
                    setEndDate('');
                    setStartTime('');
                    setEndTime('');
                    setResult(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:text-rose-600"
                >
                  Réinitialiser
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600">Instantané</h3>
              <BarChart3 className="h-5 w-5 text-rose-500" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                title="Appels total"
                value={result ? result.total.toString() : '--'}
                hint={result ? `Limite ${result.limit} résultats affichés` : 'En attente de lancement'}
                icon={<Activity className="h-5 w-5" />}
              />
              <StatCard
                title="Durée moyenne"
                value={result ? formatDuration(result.summary?.averageDuration) : '--'}
                hint={result ? `Max observé ${formatDuration(result.summary?.maxDuration)}` : ''}
                icon={<Clock className="h-5 w-5" />}
              />
            </div>
            <ProgressPill value={result?.summary?.asCallee || 0} max={totalCalls} label="Appels entrants" />
            <ProgressPill value={result?.summary?.asCaller || 0} max={totalCalls} label="Appels sortants" />
            <p className="text-xs text-slate-500">
              {totalCalls === 0
                ? 'Lancez une recherche pour visualiser le trafic entrant/sortant'
                : `${inboundRatio}% des appels identifiés sont entrants`}
            </p>
          </div>
        </div>
      </section>

      {result && (
        <section className="space-y-6 rounded-3xl border border-slate-200/70 bg-white/90 p-8 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Chronologie filtrée</h3>
              <p className="text-sm text-slate-500">{result.total} enregistrements trouvés</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600">
                {result.summary.asCaller} appels sortants
              </div>
              <div className="rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600">
                {result.summary.asCallee} appels entrants
              </div>
              <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-600">
                {formatDuration(result.summary.totalDuration)} cumulés
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Durée cumulée"
              value={formatDuration(result.summary.totalDuration)}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              title="Durée max"
              value={formatDuration(result.summary.maxDuration)}
              icon={<Activity className="h-5 w-5" />}
            />
            <StatCard
              title="Entrants"
              value={`${result.summary.asCallee}`}
              icon={<PhoneIncoming className="h-5 w-5" />}
            />
            <StatCard
              title="Sortants"
              value={`${result.summary.asCaller}`}
              icon={<Phone className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-inner">
              <div className="grid grid-cols-12 bg-gradient-to-r from-slate-50 to-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                <div className="col-span-3">Horodatage</div>
                <div className="col-span-2">Appelant</div>
                <div className="col-span-2">Appelé</div>
                <div className="col-span-1 text-right">Durée</div>
                <div className="col-span-2">Troncs</div>
                <div className="col-span-2 text-right">Réseau</div>
              </div>
              <div className="divide-y divide-slate-100">
                {result.calls.map((call) => (
                  <div
                    key={`${call.calling_id}-${call.called_id}-${call.start_time}-${call.end_time}`}
                    className="grid grid-cols-12 items-center px-4 py-3 text-sm text-slate-800 hover:bg-slate-50"
                  >
                    <div className="col-span-3 font-semibold text-slate-900">{formatDateTime(call.start_time)}</div>
                    <div className="col-span-2">
                      <p className="font-semibold text-rose-600">{call.calling_id}</p>
                      <p className="text-xs text-slate-500">{call.client || 'Client inconnu'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-semibold text-indigo-600">{call.called_id}</p>
                      <p className="text-xs text-slate-500">{call.provider || 'Provider inconnu'}</p>
                    </div>
                    <div className="col-span-1 text-right font-semibold text-slate-700">{formatDuration(call.duration)}</div>
                    <div className="col-span-2 text-xs text-slate-600">
                      <div className="font-semibold">Origine {call.org_pcip || 'N/A'}</div>
                      <div className="text-slate-500">Destination {call.dst_pcip || 'N/A'}</div>
                    </div>
                    <div className="col-span-2 text-right text-xs font-semibold text-slate-600">
                      Cause {call.release_cause || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <BreakdownList title="Top opérateurs" data={result.summary.providerBreakdown} accent="indigo" />
              <BreakdownList title="Causes de libération" data={result.summary.releaseCauses} accent="rose" />
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-3xl border border-slate-200/70 bg-slate-900/95 p-8 text-white shadow-[0_40px_80px_-40px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-bold">Statistiques globales</h3>
            <p className="text-sm text-slate-300">Vue consolidée sur toutes les données disponibles.</p>
          </div>
          <button
            type="button"
            onClick={fetchGlobalStats}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {globalStats ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-800/80 p-4 shadow-lg shadow-black/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Volume total</p>
                <p className="text-3xl font-bold text-white">{globalStats.overview.totalCalls?.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-slate-300">{globalStats.overview.lastCallAt ? `Dernier: ${formatDateTime(globalStats.overview.lastCallAt)}` : 'En attente de données'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-800/80 p-4 shadow-lg shadow-black/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Durée cumulée</p>
                <p className="text-3xl font-bold text-white">{formatDuration(globalStats.overview.totalDuration)}</p>
                <p className="text-xs text-slate-300">Moyenne {formatDuration(globalStats.overview.averageDuration)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-800/80 p-4 shadow-lg shadow-black/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Durée maximale</p>
                <p className="text-3xl font-bold text-white">{formatDuration(globalStats.overview.maxDuration)}</p>
                <p className="text-xs text-slate-300">Observation la plus longue</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-800/80 p-4 shadow-lg shadow-black/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Horaires actifs</p>
                <p className="text-3xl font-bold text-white">{busiestHour ? `${busiestHour.hour}h` : '--'}</p>
                <p className="text-xs text-slate-300">
                  {busiestHour ? `${busiestHour.count} appels sur l'heure la plus dense` : 'Volume par heure'}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-800/80 p-4 shadow-lg shadow-black/40">
                  <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-100">
                    <span>Volume des 14 derniers jours</span>
                    <span className="text-slate-300">Chronologie</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-xs">
                    {globalStats.recentVolume.map((day) => (
                      <div key={day.day} className="space-y-1 rounded-xl border border-white/5 bg-slate-900/70 p-2">
                        <div className="h-16 w-full overflow-hidden rounded-lg bg-slate-800">
                          <div
                            className="w-full bg-gradient-to-t from-cyan-400 via-blue-500 to-indigo-600"
                            style={{ height: `${maxRecentVolume === 0 ? 0 : Math.min(100, Math.max(12, (day.count / maxRecentVolume) * 100))}%` }}
                          />
                        </div>
                        <div className="text-[10px] font-semibold text-slate-100">{formatDate(day.day)}</div>
                        <div className="text-[10px] text-slate-300">{day.count} appels</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-800/80 p-4 shadow-lg shadow-black/40">
                  <div className="mb-4 flex items-center justify-between text-sm font-semibold text-slate-100">
                    <span>Distribution horaire</span>
                    <span className="text-slate-300">24h</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    {globalStats.hourlyDistribution.map((hour) => (
                      <div key={hour.hour} className="rounded-xl border border-white/5 bg-slate-900/70 p-3">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-100">
                          <span>{hour.hour}h</span>
                          <span>{hour.count}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-slate-700">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-300"
                            style={{ width: `${maxHourlyDistribution === 0 ? 0 : Math.min(100, (hour.count / maxHourlyDistribution) * 100)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[10px] text-slate-300">{formatDuration(hour.averageDuration)} en moyenne</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            
              <div className="space-y-4">
                <BreakdownList title="Opérateurs" data={globalStats.providers} accent="indigo" />
                <BreakdownList title="Clients" data={globalStats.clients} accent="amber" />
                <BreakdownList title="Causes de libération" data={globalStats.releaseCauses} accent="rose" />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 text-sm text-slate-200">
            <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Préparation des statistiques globales...
          </div>
        )}
      </section>
    </div>
  );
};

export default CallAnalysisPage;
