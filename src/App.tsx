import React from 'react';
import { ShieldCheck, Activity, Layers, Sparkles, Cpu, Lock, ArrowRight, Radio } from 'lucide-react';
import BrandLogo from './components/BrandLogo';

const capabilityHighlights = [
  {
    title: 'Veille opérationnelle',
    description: 'Centralisation sécurisée des notes stratégiques et diffusion instantanée vers les cellules décisionnelles.',
    icon: Activity
  },
  {
    title: 'Coordination terrain',
    description: 'Planification des missions, suivi des contributions des unités et déconfliction en temps réel.',
    icon: Layers
  },
  {
    title: 'Analyse avancée',
    description: 'Visualisations synthétiques et briefs prêts à l’emploi, sans fonctionnalités de recherche massive.',
    icon: Sparkles
  }
];

const secureActions = [
  {
    title: 'Contrôle des accès',
    description: 'Sécurisation applicative renforcée avec chiffrement AES, rotation automatique des secrets et authentification forte.',
    icon: ShieldCheck
  },
  {
    title: 'Base MySQL prête',
    description: 'Initialisation automatique des schémas critiques via l’utilisateur `root` et le mot de passe `zalehack`.',
    icon: Cpu
  },
  {
    title: 'Surveillance radio',
    description: 'Gestion des flux sensibles avec alertes rouges/blanches, adaptée aux centres d’opérations.',
    icon: Radio
  }
];

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white text-slate-900">
      <header className="border-b border-rose-100 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <BrandLogo />
          <button className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-5 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-400 hover:text-rose-700">
            Centre de commandement
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16">
        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-500">Dvine Intelligence</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
              La cellule Dvine Intelligence déploie un environnement rouge & blanc pour orchestrer vos opérations sensibles.
            </h1>
            <p className="mt-6 text-lg text-slate-600">
              L’ancienne console de recherche laisse place à une plateforme focalisée sur la synthèse, la coordination et le suivi des dossiers.
              Les modules Annuaire, ONG, Entreprises, Véhicules, Demandes et chargements massifs ont été retirés afin de garantir une posture simple et sécurisée.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-slate-950">
                Activer la cellule
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400">
                Documentation stratégique
              </button>
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-rose-100 bg-white/90 p-8 shadow-[0_25px_60px_-35px_rgba(225,29,72,0.4)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-rose-500">Accès sécurisé</p>
              <p className="mt-4 text-sm text-slate-500">
                Identifiant base: <span className="font-semibold text-slate-900">root</span>
              </p>
              <p className="text-sm text-slate-500">
                Mot de passe: <span className="font-semibold text-slate-900">zalehack</span>
              </p>
            </div>
            <div className="rounded-2xl bg-rose-50/80 p-6 text-slate-900">
              <p className="text-lg font-semibold">Provisionnement automatique</p>
              <p className="mt-3 text-sm text-slate-700">
                Au démarrage sur un serveur vierge, la base, les comptes système et les journaux critiques sont créés et sécurisés sans intervention manuelle.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {capabilityHighlights.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-slate-100 bg-white/95 p-8">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-rose-600" />
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-500">Sécurité</p>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">Une interface dépouillée, focalisée sur l’essentiel.</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Nous supprimons volontairement les modules de recherche massive, les annuaires et les fonctions de chargement de données pour réduire la surface d’attaque et fluidifier l’expérience analyste.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li>• Briefs et profils internes uniquement</li>
              <li>• Alertes rouges/blanches synchronisées avec vos procédures</li>
              <li>• Exports PDF signés "Dvine Intelligence" pour archivage</li>
            </ul>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {secureActions.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-3xl border border-rose-100/70 bg-white/90 p-6 shadow-[0_25px_55px_-45px_rgba(15,23,42,0.8)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Dvine Intelligence — Cellule de supervision stratégique.</p>
          <p>Design officiel rouge &amp; blanc. Logo modernisé pour unifier les supports.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
