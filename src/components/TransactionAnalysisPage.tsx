import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  RefreshCw,
  Sparkles,
  ArrowDownToLine,
  ShieldCheck,
  Wallet,
  Clock,
  TrendingUp,
  Shield,
  PieChart,
  FileDown
} from 'lucide-react';
import PageHeader from './PageHeader';
import { useNotifications } from './NotificationProvider';

interface BreakdownEntry {
  label: string | null;
  count: number;
  totalAmount: number;
  averageAmount: number;
}

interface DailyVolumeEntry {
  day: string;
  count: number;
  totalAmount: number;
}

interface TransactionStats {
  totals: {
    totalTransactions: number;
    totalAmount: number;
    averageAmount: number;
    maxAmount: number;
  };
  currencyBreakdown: BreakdownEntry[];
  typeBreakdown: BreakdownEntry[];
  statusBreakdown: BreakdownEntry[];
  providerBreakdown: BreakdownEntry[];
  dailyVolume: DailyVolumeEntry[];
}

interface TransactionRecord {
  transactionId: string;
  financialTransactionId: string;
  externalTransactionId?: string;
  dateTime: string;
  initiatingUser: string;
  realUser: string;
  fromId: string;
  fromMsisdn: string;
  fromUsername: string;
  fromProfile: string;
  fromAccount: string;
  fromFee: number;
  fromLoyaltyReward: number;
  fromLoyaltyFee: number;
  fromBankDomain: string;
  toId: string;
  toMsisdn: string;
  toUsername: string;
  toProfile: string;
  toAccount: string;
  toFee: number;
  toLoyaltyReward: number;
  toLoyaltyFee: number;
  toBankDomain: string;
  transactionType: string;
  amount: number;
  currency: string;
  transactionStatus: string;
  context?: string;
  providerCategory: string;
  comment?: string;
  version?: string;
}

interface TransactionSearchResponse {
  filters: {
    msisdn: string;
    startDateTime?: string | null;
    endDateTime?: string | null;
  };
  total: number;
  limit: number;
  transactions: TransactionRecord[];
  stats: TransactionStats;
  globalStats: TransactionStats;
}

const formatAmount = (value?: number, currency?: string) => {
  const numeric = Number(value || 0);
  const formatted = numeric.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  return `${formatted} ${currency || ''}`.trim();
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

const GradientStatCard = ({
  icon,
  title,
  value,
  hint
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint?: string;
}) => (
  <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-indigo-600/10 via-blue-500/10 to-cyan-400/10 p-6 shadow-xl shadow-indigo-500/20 backdrop-blur">
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/20 via-white/5 to-transparent" />
    <div className="relative flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/30">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-800">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {hint && <p className="text-xs text-slate-600">{hint}</p>}
      </div>
    </div>
  </div>
);

const BreakdownCard = ({
  title,
  data,
  accent
}: {
  title: string;
  data: BreakdownEntry[];
  accent?: 'indigo' | 'emerald' | 'amber';
}) => {
  const maxValue = useMemo(() => (data.length ? Math.max(...data.map((item) => item.count)) : 0), [data]);

  const accentStyles = useMemo(() => {
    switch (accent) {
      case 'emerald':
        return {
          container: 'from-emerald-500/10 via-teal-400/10 to-cyan-400/10 border-emerald-200/70',
          bar: 'from-emerald-500 via-teal-500 to-cyan-400'
        };
      case 'amber':
        return {
          container: 'from-amber-500/10 via-orange-400/10 to-red-400/10 border-amber-200/70',
          bar: 'from-amber-500 via-orange-500 to-red-400'
        };
      default:
        return {
          container: 'from-indigo-600/10 via-blue-500/10 to-purple-500/10 border-indigo-200/70',
          bar: 'from-indigo-500 via-blue-500 to-purple-500'
        };
    }
  }, [accent]);

  return (
    <div className={`rounded-3xl border bg-gradient-to-br ${accentStyles.container} p-6 shadow-[0_18px_60px_-30px_rgba(79,70,229,0.55)] backdrop-blur`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">{title}</p>
          <p className="text-sm text-slate-500">Top catégories</p>
        </div>
        <Sparkles className="h-4 w-4 text-slate-500" />
      </div>
      <div className="space-y-3">
        {data.length === 0 && <p className="text-sm text-slate-500">Aucune donnée disponible</p>}
        {data.map((item, index) => (
          <div key={`${item.label ?? 'empty'}-${index}`} className="flex items-center gap-3">
            <div className="w-12 text-xs font-semibold text-slate-700">{item.count}</div>
            <div className="flex-1 rounded-full bg-white/70">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${accentStyles.bar}`}
                style={{ width: `${maxValue === 0 ? 0 : Math.max(10, Math.round((item.count / maxValue) * 100))}%` }}
              />
            </div>
            <div className="w-40 text-xs font-semibold text-slate-700 text-right truncate" title={item.label || 'Non renseigné'}>
              {item.label || 'Non renseigné'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TransactionAnalysisPage: React.FC = () => {
  const { notifyError, notifySuccess } = useNotifications();
  const [msisdn, setMsisdn] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [result, setResult] = useState<TransactionSearchResponse | null>(null);
  const [globalStats, setGlobalStats] = useState<TransactionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchGlobalStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/transactions/stats', {
        credentials: 'include',
        headers
      });
      if (!response.ok) {
        throw new Error('Impossible de charger les statistiques');
      }
      const data: TransactionStats = await response.json();
      setGlobalStats(data);
    } catch (error) {
      console.error(error);
      notifyError('Erreur lors du chargement des statistiques financières');
    } finally {
      setStatsLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('msisdn', msisdn.trim());
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (startTime) params.set('startTime', startTime);
    if (endTime) params.set('endTime', endTime);
    return params;
  }, [endDate, endTime, msisdn, startDate, startTime]);

  const handleSearch = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!msisdn.trim()) {
        setSearchError('Merci de renseigner un numéro MSISDN');
        return;
      }

      setSearchError('');
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const params = buildSearchParams();
        const response = await fetch(`/api/transactions/search?${params.toString()}`, {
          credentials: 'include',
          headers
        });

        if (!response.ok) {
          throw new Error("Impossible d'exécuter la recherche");
        }

        const data: TransactionSearchResponse = await response.json();
        setResult(data);
      } catch (error) {
        console.error(error);
        notifyError('Recherche impossible. Vérifiez le numéro et la période.');
      } finally {
        setLoading(false);
      }
    },
    [buildSearchParams, msisdn, notifyError]
  );

  const handleExport = useCallback(async () => {
    if (!result) return;
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const params = buildSearchParams();
      const response = await fetch(`/api/transactions/export?${params.toString()}`, {
        credentials: 'include',
        headers
      });

      if (!response.ok) {
        throw new Error('Export impossible');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'analyse-transactions.pdf';
      link.click();
      window.URL.revokeObjectURL(url);
      notifySuccess('Export PDF généré avec succès');
    } catch (error) {
      console.error(error);
      notifyError("Impossible de générer le PDF des transactions");
    } finally {
      setExporting(false);
    }
  }, [buildSearchParams, notifyError, notifySuccess, result]);

  const filteredStats = result?.stats;
  const overviewStats = result?.stats?.totals || globalStats?.totals;

  return (
    <div className="space-y-10">
      <PageHeader
        icon={<Banknote className="h-6 w-6" />}
        title="Analyse des Transactions"
        subtitle="Recherche avancée, visibilité immédiate et insights financiers en temps réel"
      />

      <form
        onSubmit={handleSearch}
        className="relative overflow-hidden rounded-3xl border border-red-300/50 bg-red-700 p-8 text-white shadow-2xl shadow-red-500/40"
      >
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-3">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-100">Numéro MSISDN</label>
            <div className="relative">
              <input
                type="text"
                value={msisdn}
                onChange={(e) => {
                  setMsisdn(e.target.value);
                  setSearchError('');
                }}
                placeholder="Ex: 242069793133"
                className="w-full rounded-2xl border border-white/20 bg-white/15 px-4 py-3 text-base font-semibold text-white placeholder:text-blue-100/70 shadow-inner focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
              />
              {searchError && <p className="mt-2 text-xs text-amber-200">{searchError}</p>}
            </div>
            <p className="text-xs text-blue-100/80">Filtre les transactions où le MSISDN apparaît en émetteur ou bénéficiaire.</p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">Date de début</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/15 px-3 py-2 text-sm font-medium text-white shadow-inner focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">Heure de début</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/15 px-3 py-2 text-sm font-medium text-white shadow-inner focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">Date de fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/15 px-3 py-2 text-sm font-medium text-white shadow-inner focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">Heure de fin</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/15 px-3 py-2 text-sm font-medium text-white shadow-inner focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
              />
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {loading ? 'Analyse en cours…' : 'Lancer la recherche'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!result || exporting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-cyan-200/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Export PDF sécurisé
            </button>
            <p className="text-[11px] text-blue-100/80">Le rapport inclut la signature « Dvine Intelligence » pour authenticité.</p>
          </div>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GradientStatCard
          icon={<Banknote className="h-5 w-5" />}
          title="Volume filtré"
          value={formatAmount(overviewStats?.totalAmount || 0, 'XAF')}
          hint={result ? `${result.total} transactions` : 'En attente de recherche'}
        />
        <GradientStatCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Montant moyen"
          value={formatAmount(overviewStats?.averageAmount || 0, 'XAF')}
          hint={result ? 'Calculé sur la sélection' : 'Statistiques globales'}
        />
        <GradientStatCard
          icon={<Shield className="h-5 w-5" />}
          title="Plus haut montant"
          value={formatAmount(overviewStats?.maxAmount || 0, 'XAF')}
          hint={result ? 'Dans le filtre actif' : 'Données globales'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <BreakdownCard
          title="Types de transactions"
          data={filteredStats?.typeBreakdown || globalStats?.typeBreakdown || []}
        />
        <BreakdownCard
          title="Statuts"
          data={filteredStats?.statusBreakdown || globalStats?.statusBreakdown || []}
          accent="emerald"
        />
        <BreakdownCard
          title="Fournisseurs"
          data={filteredStats?.providerBreakdown || globalStats?.providerBreakdown || []}
          accent="amber"
        />
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Transactions identifiées</p>
            <p className="text-sm text-slate-600">{result ? `${result.transactions.length} lignes affichées` : 'Lancez une recherche pour voir le détail'}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-700">
            <Clock className="h-4 w-4 text-amber-500" />
            Données classées par date décroissante
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Horodatage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Origine</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contexte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {result?.transactions?.length ? (
                result.transactions.map((tx) => (
                  <tr key={tx.transactionId} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{formatDateTime(tx.dateTime)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">{tx.fromMsisdn || '—'}</div>
                      <div className="text-xs text-slate-500">{tx.fromBankDomain || tx.fromUsername || 'Origine inconnue'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">{tx.toMsisdn || '—'}</div>
                      <div className="text-xs text-slate-500">{tx.toBankDomain || tx.toUsername || 'Dest. inconnue'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{tx.transactionType || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-indigo-700">{formatAmount(tx.amount, tx.currency)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        <Shield className="h-4 w-4" />
                        {tx.transactionStatus || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="truncate" title={tx.comment || tx.context || ''}>{tx.comment || tx.context || '—'}</div>
                      <div className="text-xs text-slate-400">{tx.providerCategory || '—'}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    {loading
                      ? 'Analyse en cours…'
                      : 'Aucune transaction à afficher. Lancez une recherche par numéro et période.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-slate-200/70">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <PieChart className="h-4 w-4 text-indigo-500" />
            Répartition par devise
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            {(filteredStats?.currencyBreakdown || globalStats?.currencyBreakdown || []).map((entry) => (
              <div key={entry.label || '—'} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                <span className="font-semibold text-slate-800">{entry.label || '—'}</span>
                <span className="text-indigo-700">{formatAmount(entry.totalAmount, entry.label || 'XAF')}</span>
              </div>
            ))}
            {(filteredStats?.currencyBreakdown || globalStats?.currencyBreakdown || []).length === 0 && (
              <p className="text-xs text-slate-500">En attente de données</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-slate-200/70">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
            Top montants par jour
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            {(filteredStats?.dailyVolume || globalStats?.dailyVolume || []).map((entry) => (
              <div key={entry.day} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                <span className="font-semibold text-slate-800">{formatDateTime(entry.day)}</span>
                <div className="text-right text-indigo-700">
                  <div className="font-semibold">{formatAmount(entry.totalAmount, 'XAF')}</div>
                  <div className="text-[11px] text-slate-500">{entry.count} opérations</div>
                </div>
              </div>
            ))}
            {(filteredStats?.dailyVolume || globalStats?.dailyVolume || []).length === 0 && (
              <p className="text-xs text-slate-500">Aucune donnée récente</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-slate-200/70">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Wallet className="h-4 w-4 text-amber-500" />
            Synthèse globale
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
              <span className="font-semibold">Transactions totales</span>
              <span className="text-indigo-700">{(filteredStats || globalStats)?.totals.totalTransactions || 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
              <span className="font-semibold">Montant cumulé</span>
              <span className="text-indigo-700">{formatAmount((filteredStats || globalStats)?.totals.totalAmount || 0, 'XAF')}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
              <span className="font-semibold">Montant moyen</span>
              <span className="text-indigo-700">{formatAmount((filteredStats || globalStats)?.totals.averageAmount || 0, 'XAF')}</span>
            </div>
          </div>
          {statsLoading && <p className="mt-3 text-xs text-slate-500">Chargement des statistiques globales…</p>}
        </div>
      </div>
    </div>
  );
};

export default TransactionAnalysisPage;
