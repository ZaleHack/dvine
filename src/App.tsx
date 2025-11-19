import React from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Database,
  Globe2,
  Layers,
  Lock,
  Server,
  ShieldCheck,
  Zap
} from 'lucide-react';
import DvineLogo from './components/DvineLogo';

const metrics = [
  { label: 'Sources surveillées', value: '128', trend: '+8 nouvelles connexions', icon: Globe2 },
  { label: 'Flux sécurisés', value: '62', trend: 'TLS + chiffrement applicatif', icon: ShieldCheck },
  { label: 'Statuts critiques', value: '03', trend: 'Alertes en cours', icon: AlertTriangle }
];

const operations = [
  {
    title: 'Surveillance en temps réel',
    description: 'Détection automatique des anomalies structurelles et supervision des flux critiques.',
    icon: Activity
  },
  {
    title: 'Cartographie décisionnelle',
    description: 'Narration synthétique des tendances pour guider les cellules d\'investigation.',
    icon: BarChart3
  },
  {
    title: 'Intégrité des dépôts',
    description: 'Contrôle permanent des écritures MySQL et génération de rapports signés.',
    icon: Database
  }
];

const hardeningSteps = [
  'Authentification et signatures alignées sur Dvine Intelligence',
  'Suppression des anciens modules de recherche et de chargement massif',
  'Provisionnement automatique de la base autres sur serveurs vierges'
];

const systems = [
  { title: 'Collecte', text: 'Flux entrants modulaires, orchestrés via Node.js et files chiffrées.', icon: Layers },
  { title: 'Orchestrateur', text: 'Scripts supervisés pour initialiser les bases et surveiller les jobs.', icon: Server },
  { title: 'Protection', text: 'TOTP, audit trail et gestion de sessions renforcée.', icon: Lock },
  { title: 'Réactivité', text: 'Propagation instantanée des alertes critiques vers les cellules autorisées.', icon: Zap }
];

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#fff6f6] to-white text-slate-900">
      <header className="bg-gradient-to-br from-red-800 via-red-600 to-red-700 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <span className="inline-flex h-20 w-20 items-center justify-center rounded-3xl border border-white/30 bg-white/10">
              <DvineLogo className="h-12 w-12" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.55em] text-white/70">Dvine Intelligence</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
                Interface stratégique unifiée
              </h1>
              <p className="mt-4 max-w-xl text-base text-white/80">
                L\'application met en avant les signaux essentiels sans exposer les modules de recherche, d\'annuaire ou de chargement de données.
              </p>
            </div>
          </div>
          <div className="space-y-3 rounded-3xl border border-white/25 bg-white/5 p-6 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span>Serveur MySQL</span>
              <strong className="text-white">root / zalehack</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Base provisionnée</span>
              <strong className="text-white">autres</strong>
            </div>
            <p className="text-xs text-white/70">Initialisation automatique lors du premier démarrage.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <section className="grid gap-4 md:grid-cols-3">
          {metrics.map(({ label, value, trend, icon: Icon }) => (
            <article
              key={label}
              className="rounded-3xl border border-red-100 bg-white p-6 shadow-[0_20px_60px_rgba(185,28,28,0.1)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-red-400">{label}</p>
                  <p className="mt-3 text-3xl font-semibold text-red-900">{value}</p>
                  <p className="mt-2 text-sm text-slate-500">{trend}</p>
                </div>
                <span className="rounded-2xl bg-red-50 p-3 text-red-500">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {operations.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-3xl border border-red-100 bg-white p-6">
              <span className="inline-flex rounded-2xl bg-red-50 p-3 text-red-500">
                <Icon className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-xl font-semibold text-red-900">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">{description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-red-100 bg-gradient-to-br from-white to-red-50 p-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold text-red-900">Durcissement appliqué</h2>
              <p className="mt-3 text-sm text-slate-600">
                Les fonctionnalités historiques (recherche, annuaires gendarmerie/ONG/entreprises, véhicules, demandes, fiches de profil et import massif) sont retirées de l\'interface pour limiter l\'exposition des données.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {hardeningSteps.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-red-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-inner">
              <h3 className="text-sm uppercase tracking-[0.3em] text-red-400">Connexion protégée</h3>
              <p className="mt-4 text-lg font-medium text-slate-800">
                Authentification renforcée avec TOTP, journalisation détaillée et signature Dvine Intelligence sur les exports.
              </p>
              <div className="mt-6 grid gap-4 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-red-500" /> Chiffrement AES-GCM des payloads applicatifs
                </p>
                <p className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-red-500" /> Scripts `init-database` pour serveurs neufs
                </p>
                <p className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-red-500" /> Tables système créées automatiquement
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-red-100 bg-white p-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-red-900">État des systèmes</h2>
              <p className="text-sm text-slate-600">
                Synthèse opérationnelle des modules actifs et des dépendances critiques.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              <Globe2 className="h-4 w-4" /> Mode consolidation
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {systems.map(({ title, text, icon: Icon }) => (
              <article key={title} className="flex gap-4 rounded-2xl border border-red-50 bg-red-50/50 p-5">
                <span className="mt-1 inline-flex rounded-2xl bg-white p-3 text-red-500 shadow">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-red-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-red-100 bg-white/90 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-red-400">Dvine Intelligence</p>
            <p className="mt-1">Alignée sur une identité rouge & blanc et prête pour la diffusion contrôlée.</p>
          </div>
          <p>© {new Date().getFullYear()} Cellule d\'ingénierie Dvine.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
