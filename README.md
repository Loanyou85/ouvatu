# OUVATU — Tes découvertes. Enfin utilisables.

OUVATU transforme un lien TikTok, Instagram, YouTube, Pinterest ou web en **fiche structurée et actionnable** :
recette (portions, liste de courses), voyage (carte, itinéraire), lieux, produits (wishlist), films/séries (watchlist),
livres (à lire), mode, déco, fitness (séance).

> Le nom et la tagline sont centralisés dans `src/config/brand.ts`.

---

## 1. Installation

Prérequis : Node.js ≥ 20.9, npm.

```bash
npm install
cp .env.example .env.local   # facultatif : sans aucune variable, l'app tourne en « mode local »
npm run dev                  # http://localhost:3000
```

### Mode local (zéro configuration)

Sans variables Supabase, OUVATU démarre en **mode local** pour pouvoir développer et tester immédiatement :

| Brique | Mode local | Production |
| --- | --- | --- |
| Base de données | fichier JSON `.data/ouvatu-local-db.json` | Supabase Postgres (RLS) |
| Auth | email / mot de passe (scrypt + cookie signé HMAC) | Supabase Auth |
| Analyse IA | analyseur heuristique (JSON-LD + texte, n'invente rien) | Claude via l'API Anthropic |
| Paiement | page de paiement **simulé** clairement étiquetée | Stripe Checkout + webhook |
| Géocodage | OpenStreetMap Nominatim | OSM ou Google |

Une fois abonné (paiement simulé en local), sur l'écran d'accueil vide, **« Voir des exemples »** charge 8 inspirations d'exemple (voyage Lisbonne, recette,
restaurant, produit, films, livres, séance, déco) marquées « Exemple ».

## 2. Variables d'environnement

Toutes sont documentées dans [`.env.example`](.env.example). Les secrets ne sont lus que côté serveur
(`src/lib/env.ts`, module `server-only`). **Ne jamais committer `.env*`.**

| Variable | Rôle |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Active Supabase (DB + Auth). Utilisées uniquement côté serveur : peuvent être « Sensitive » sur Vercel (les anciens noms `NEXT_PUBLIC_…` restent acceptés) |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook Stripe, analytics, admin, suppression de compte |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Paiement (une clé restreinte `rk_` convient si elle a les permissions Checkout, Customers, Subscriptions, Customer portal en écriture, Prices/Products/Invoices en lecture) |
| `STRIPE_PRICE_PREMIUM_WEEKLY`, `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_YEARLY` | IDs des prix Stripe récurrents |
| `AI_API_KEY`, `AI_MODEL`, `AI_PROVIDER` | Analyse IA (Anthropic, modèle par défaut `claude-opus-5`) |
| `MAPS_PROVIDER`, `MAPS_API_KEY`, `MAPS_CONTACT_EMAIL` | Géocodage (`osm` / `google` / `none`) |
| `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | Tuiles de carte (OSM par défaut) |
| `TMDB_API_KEY`, `YOUTUBE_API_KEY`, `META_OEMBED_TOKEN` | Enrichissements optionnels |
| `ADMIN_EMAILS` | Emails autorisés sur `/admin` |
| `APP_URL` | URL publique du site (redirections Stripe / Auth) |

## 3. Supabase

1. Crée un projet (région UE recommandée pour le RGPD).
2. Copie l'URL, la clé `anon` et la clé `service_role` dans `.env.local`.
3. Auth → Providers → Email : activé. Auth → URL Configuration :
   - **Site URL** : `https://<ton-domaine>` (pas `localhost`, sinon les emails pointent vers localhost) ;
   - **Redirect URLs** : `https://<ton-domaine>/**` (et `http://localhost:3000/**` pour le développement).
   Aucune confirmation par email : avec `SUPABASE_SERVICE_ROLE_KEY`, les comptes sont créés déjà confirmés
   (API admin) et connectés immédiatement. Tu peux aussi désactiver « Confirm email » dans
   Authentication → Providers → Email. Sans la clé service role, l'app retombe sur le flux Supabase standard.
4. Applique la migration (section suivante).

## 4. Migrations

Le schéma est dans `supabase/migrations/` (à exécuter dans l'ordre : `…init.sql`, `…weekly_plan.sql`, `…grants.sql`) :

- tables : `users`, `subscriptions`, `sources`, `content_items`, `entities`, `collections`, `collection_items`,
  `recipes`, `recipe_ingredients`, `recipe_steps`, `trips`, `trip_locations`, `places`, `products`, `movies`,
  `books`, `fitness_routines`, `tags`, `content_item_tags`, `saved_items`, `shopping_list_items`, `pantry_items`,
  `usage_events` ;
- **Row Level Security** sur toutes les tables (`user_id = auth.uid()`) ;
- `users.plan` n'est modifiable que par le trigger lié à `subscriptions` (écrit par le webhook Stripe) — un
  utilisateur ne peut pas se déclarer Premium ;
- triggers : création du profil à l'inscription, projection de `content_items.data` vers les tables par catégorie,
  vecteur de recherche plein-texte (français, insensible aux accents) ;
- RPC : `search_content_items`, `increment_analysis_count`, `match_content_items` (pgvector, optionnel).

```bash
npx supabase link --project-ref <ref>
npx supabase db push
# ou : coller le fichier dans le SQL Editor de Supabase
```

La migration a été validée sur Postgres (PGlite) : projections, recherche, isolation RLS entre utilisateurs,
blocage de l'auto-promotion Premium et suppression en cascade du compte.

## 5. Stripe

1. Crée un produit « OUVATU Premium » avec trois prix récurrents : 4,99 €/semaine, 9,99 €/mois et 49,99 €/an.
   Les montants **affichés** sont centralisés dans `src/config/plans.ts` (à garder alignés avec Stripe).
2. Renseigne `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PREMIUM_WEEKLY`, `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_YEARLY`.
3. Webhook → `https://<ton-domaine>/api/webhooks/stripe` avec les événements
   `checkout.session.completed`, `customer.subscription.created|updated|deleted`, puis `STRIPE_WEBHOOK_SECRET`.
4. En local : `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
5. Active le **Customer Portal** (gestion / résiliation depuis le profil).

Le statut Premium n'est **jamais** décidé côté client : seul le webhook (signature vérifiée) écrit l'abonnement.
Sans Stripe, `/premium/checkout-demo` simule le paiement (désactivé en production sauf `OUVATU_DEMO_BILLING=true`).

## 6. Fournisseur IA

`src/services/content-analysis/` :

- `providers/types.ts` — interface `AnalysisProvider` (ajouter un fournisseur = implémenter `analyze()`).
- `providers/anthropic.ts` — SDK Anthropic, sortie structurée (`output_config.format` + schéma Zod), refus gérés,
  repli serveur activé sur les modèles qui le supportent.
- `providers/heuristic.ts` — analyseur sans LLM (JSON-LD schema.org + motifs du texte), utilisé sans clé et en
  repli si l'IA est indisponible.
- `prompt.ts` — le contenu externe est encapsulé dans `<untrusted_content>` (balise neutralisée si injectée) et
  traité comme donnée, jamais comme instruction.

## 7. Lancement local

```bash
npm run dev        # développement
npm run check      # typecheck + lint + tests unitaires
npm run build && npm start
```

## 8. Déploiement (Vercel + Supabase)

1. Importer le dépôt dans Vercel, renseigner les variables d'environnement (Production + Preview).
2. `APP_URL` = domaine final ; mettre à jour les URLs de redirection Supabase et le webhook Stripe.
3. Appliquer la migration sur le projet Supabase de production.
4. L'analyse tourne après la réponse HTTP via `after()` (`maxDuration = 120` sur `/api/analyze`) :
   vérifier que le plan Vercel autorise cette durée.

**À connecter / décider avant la production**

- Clé Anthropic (`AI_API_KEY`) — sinon seul l'analyseur heuristique est disponible.
- Stripe live + webhook.
- Tuiles de carte : les serveurs OSM publics ne sont pas faits pour du trafic de production → MapTiler, Stadia ou
  Mapbox via `NEXT_PUBLIC_MAP_TILE_URL`. Nominatim : 1 requête/s, renseigner `MAPS_CONTACT_EMAIL` (ou `google`).
- Instagram : l'oEmbed officiel nécessite un token d'app Meta (`META_OEMBED_TOKEN`) ; sans lui, l'utilisateur
  colle la légende. TikTok / YouTube / Pinterest utilisent leurs oEmbed publics.
- Rate limiting en mémoire (par instance) → Upstash Redis / Vercel KV pour du multi-instance (`src/lib/rate-limit.ts`).
- Textes légaux (`src/config/legal.ts`) : compléter éditeur, SIREN, hébergeur, et faire relire par un juriste.

## 9. Architecture

```
src/
  app/                 routes (App Router) : pages, API, webhooks
    (app)/             espace connecté (layout avec AppShell)
    api/analyze        POST = démarrer une analyse, GET /:id = progression
  components/          design system (ui/) et layout
  config/              branding, plans & prix, catégories, messages, légal
  db/                  UserDataStore / AdminDataStore + implémentations Supabase et locale, seed
  features/            UI + server actions par domaine (add, items, library, collections, lists, paywall…)
  services/
    content-ingestion  ContentInput, URL, SSRF-safe fetch, oEmbed, meta/JSON-LD
    content-analysis   fournisseurs IA, prompt, schéma de sortie, normalisation Zod
    entity-extraction  entités + garde anti-invention (prix, adresses, plateformes)
    enrichment         géocodage, Open Library, TMDB
    maps               abstraction fournisseur de géocodage
    recipes | travel   portions, courses, itinéraire (plus proche voisin), stats
    search             compréhension de requêtes en langage naturel
    billing            droits (plan côté serveur), Stripe
    analytics          événements produit first-party
    pipeline           orchestrateur d'analyse
  types/               schémas Zod du domaine + types partagés
supabase/migrations/   schéma SQL
```

**Pipeline** (`services/pipeline/analyze.ts`) : valider l'URL → quota → créer `sources` → répondre 202 →
(`after()`) récupérer les métadonnées publiques → normaliser → IA → validation Zod → garde anti-invention →
enrichissement → enregistrement → progression 0-5 exposée à l'UI (les étapes affichées ne devancent jamais le serveur).

**Entrées futures** : `ContentInputSchema` (`channel: paste | share_extension | browser_extension | direct_import`).
Une extension de partage iOS/Android ou une Web Share Target appelle le même `POST /api/analyze`, ou ouvre
`/add?url=…&auto=1`.

**Abonnement obligatoire** : il n'y a pas d'offre gratuite. Après l'onboarding, un compte sans abonnement actif
est redirigé vers `/premium` (offres hebdomadaire, mensuelle, annuelle — `src/config/plans.ts`). Le contrôle est fait
côté serveur sur chaque page produit (`requireSubscribedContext`), dans le pipeline (`subscription_required`) et
dans les actions (limites à 0 sans abonnement). Profil, export, suppression de compte et pages légales restent accessibles.

## 10. Ajouter une nouvelle catégorie

1. `src/config/categories.ts` : ajouter l'identifiant, l'emoji, le libellé (et l'onglet de bibliothèque).
2. `src/types/schemas.ts` : schéma Zod des données + branche dans `StructuredDataSchema`.
3. `src/services/content-analysis/ai-schema.ts` : bloc nullable correspondant ; `prompt.ts` : description.
4. `src/services/content-analysis/normalize.ts` : conversion vers le schéma de domaine.
5. `src/services/entity-extraction/index.ts` : entités (+ règles de grounding si prix/adresses).
6. `src/features/items/views/` : vue de détail + action principale ; `services/items/highlights.ts`.
7. Migration SQL : ajouter la valeur au `check` de `content_items.category` (et une projection si utile).
8. Heuristique (optionnel) : mots-clés dans `providers/heuristic.ts`.

## Tests

- `npm test` : tests unitaires (heuristique, JSON-LD, normalisation, garde anti-invention, injection de prompt,
  portions, courses, itinéraire, recherche, URL, gating premium).
- Le parcours complet de la Definition of Done a été vérifié dans Chromium en viewport mobile (inscription →
  onboarding → ajout → analyse → sauvegarde → bibliothèque → collection → recherche → action → paywall →
  abonnement → Premium → suppression de contenu → export → suppression du compte), sans erreur console.
