# CvForge — Générateur de CV pour profils IT

## Context

Le répertoire `C:\Users\amine\Documents\claudeFirstStep` est **vide** : projet greenfield, aucun code existant à réutiliser.

L'objectif est une application SaaS réellement fonctionnelle : un ingénieur crée son CV via un formulaire, le voit se mettre à jour en temps réel dans une preview A4, choisit parmi 5 templates, personnalise couleurs/typo/ordre des sections par drag & drop, et exporte un PDF fidèle au pixel près. Assistant IA pour reformuler (jamais inventer), import de CV existant (PDF/DOCX), analyse ATS, dashboard multi-CV.

**Environnement vérifié sur la machine :**

| Élément | État |
|---|---|
| .NET SDK | `10.0.400` ✅ |
| Node / npm | `v24.20.0` / `11.19.0` ✅ |
| SQL Server | instance `MSSQLSERVER` en cours d'exécution ✅ |
| Docker | absent (non nécessaire) |
| `ANTHROPIC_API_KEY` | non défini → mode dégradé prévu |

**Décisions validées avec toi :** PDF via Chromium headless côté backend · IA branchée mais dégradable sans clé · UI bilingue FR/EN.

---

## 1. Trois corrections à ta spec

**a) Prisma → EF Core.** Tu demandes « prévoir les relations Prisma » mais la stack est .NET + SQL Server. Prisma est un ORM Node/TypeScript, il n'a pas sa place ici. L'équivalent est **Entity Framework Core 10**. Le modèle de données ci-dessous est exprimé en EF Core.

**b) Vite est déjà là.** Angular 20+ utilise Vite nativement dans son builder `@angular/build:application` (dev server, HMR, esbuild en production). Aucune configuration à ajouter — la demande est satisfaite par le projet Angular standard.

**c) Langue de l'UI ≠ langue du CV.** Deux choses différentes : l'interface (boutons, menus) suit ton choix bilingue FR/EN ; les intitulés de sections *dans le CV rendu* (« EXPÉRIENCE » vs « EXPERIENCE ») doivent suivre une langue choisie **par CV**, stockée dans ses réglages. Un candidat francophone postulant à Londres veut une UI française et un CV anglais.

---

## 2. Stack finale

| Couche | Choix | Justification |
|---|---|---|
| Frontend | **Angular (latest)**, standalone components, **signals**, zoneless | Les signals rendent la preview temps réel triviale : `computed()` sur le document, pas de `Subject` ni de `OnPush` à gérer |
| Build | **Vite** (via `@angular/build`) | natif, rien à installer |
| Styles | **Tailwind CSS v4** (`@tailwindcss/postcss`) | pour l'UI. Les 5 templates de CV utilisent du **CSS pur** avec variables — Tailwind ne sait pas exprimer `@page` ni les unités mm |
| Backend | **.NET 10**, ASP.NET Core **Minimal APIs** | moins de cérémonie que des Controllers pour ~15 endpoints |
| ORM / BDD | **EF Core 10** + **SQL Server** local | instance déjà en place |
| Auth | **ASP.NET Core Identity** + `MapIdentityApi<AppUser>()` | fournit register / login / refresh / forgotPassword / resetPassword / confirmEmail **en une ligne**, avec hachage PBKDF2, verrouillage de compte et tokens de reset — code éprouvé plutôt que réinventé |
| PDF | **Microsoft.Playwright** (Chromium headless) | seul moyen d'avoir un PDF identique à la preview : c'est le même HTML et le même CSS |
| IA | NuGet **`Anthropic`** (SDK officiel), modèle `claude-opus-5` | structured outputs pour l'extraction et l'analyse |
| Import | **UglyToad.PdfPig** (PDF) + **DocumentFormat.OpenXml** (DOCX) | extraction texte, puis structuration par l'IA |
| Validation | **FluentValidation** côté backend, Angular Reactive Forms côté frontend | |
| Tests | **xUnit** + `WebApplicationFactory` (backend) · **Vitest** via `@angular/build:unit-test` (frontend) | |

---

## 3. Décision d'architecture centrale : le CV est un document JSON

C'est le choix qui conditionne tout le reste, donc il mérite d'être explicite.

L'approche naïve donnerait 10 tables (`PersonalInformation`, `Experience`, `Project`, `Education`, `SkillCategory`, `Skill`, `Language`, `Certification`, `Interest`…), une quarantaine d'endpoints CRUD, une migration à chaque champ ajouté, et un casse-tête pour le drag & drop (colonnes `SortOrder` à recalculer à chaque déplacement).

**À la place : EF Core 10 mappe des types C# fortement typés vers une seule colonne JSON** (`ComplexProperty(...).ToJson()` / `OwnsMany(...).ToJson()`).

Ce qu'on garde : classes C# typées, validation FluentValidation, IntelliSense, refactoring sûr, structures exactement telles que tu les as listées.
Ce qu'on gagne : **2 tables métier au lieu de 10**, **un seul endpoint de sauvegarde** au lieu de quarante, réordonnancement = ordre du tableau (drag & drop gratuit), aucune migration quand tu ajoutes un champ au CV.

Un CV est un document que l'utilisateur édite d'un bloc et qui n'est jamais interrogé transversalement (« tous les CV mentionnant Kubernetes » n'est pas une fonctionnalité demandée). C'est la définition d'un agrégat document.

> `ponytail:` document JSON monolithique — plafond : pas de requête SQL sur le contenu d'un CV, et une sauvegarde réécrit tout le document. Bascule vers des tables relationnelles seulement si une recherche cross-CV ou de l'édition collaborative apparaît.

---

## 4. Modèle de données

### Tables réelles

```
AspNetUsers (+ AspNetUserTokens, AspNetUserLogins, AspNetUserClaims, AspNetRoles…)
  └── fournies par ASP.NET Core Identity. AppUser ajoute : DisplayName, CreatedAt
        AspNetUserLogins existe déjà → OAuth Google/GitHub s'ajoutera sans migration

Cvs
  Id           uniqueidentifier  PK
  UserId       nvarchar(450)     FK → AspNetUsers.Id, ON DELETE CASCADE
  Name         nvarchar(120)     "CV Software Engineer"
  Document     nvarchar(max)     ← le JSON complet (colonne mappée par EF Core)
  CreatedAt    datetime2
  UpdatedAt    datetime2
  INDEX IX_Cvs_UserId_UpdatedAt (UserId, UpdatedAt DESC)   ← requête du dashboard
```

### Contenu du document (types C#, sérialisés dans `Document`)

```
CvDocument
├── TemplateKey        "modern" | "minimal" | "executive" | "tech" | "ats"
├── Settings : CvSettings
│     PrimaryColor, SecondaryColor          #RRGGBB, validés par regex
│     FontFamily     "inter" | "roboto" | "lora" | "jetbrains-mono" | "system"
│     FontScale      0.85 → 1.20
│     Spacing        "compact" | "normal" | "relaxed"
│     CvLanguage     "fr" | "en"            ← libellés des sections DANS le CV
│     SectionOrder   string[]               ← ordre du drag & drop
│     HiddenSections string[]
├── PersonalInfo      FirstName, LastName, JobTitle, PhotoUrl?, Email, Phone,
│                     City, Country, LinkedIn, GitHub, Portfolio, Website
├── Summary           string
├── Experiences[]     Position, Company, City, Country, StartDate, EndDate?,
│                     IsCurrent, Description, Technologies[], Missions[], Achievements[]
├── Projects[]        Name, Description, Role, Technologies[], Url, Date
├── Education[]       Degree, School, City, Country, StartDate, EndDate?, Description
├── SkillCategories[] Name (Programming Languages, Backend, Frontend, Databases,
│                     Cloud, DevOps, Testing, Architecture, Tools), Skills[]
├── Languages[]       Name, Level (A1|A2|B1|B2|C1|C2|Native)
├── Certifications[]  Name, Issuer, Date, Url
└── Interests[]       string
```

Les dates d'expérience/formation sont des `string` au format `"YYYY-MM"` : un CV affiche « Mars 2021 », jamais un jour précis, et cela évite les pièges de fuseau horaire à la sérialisation.

**Photo :** fichier sur disque (`uploads/{userId}/{guid}.{ext}`), seule l'URL est dans le JSON. En base64 le document gonflerait de plusieurs centaines de Ko à chaque frappe de l'autosave.

---

## 5. API REST

| Méthode | Route | Rôle |
|---|---|---|
| — | `/api/auth/*` | groupe `MapIdentityApi` : `register`, `login`, `refresh`, `forgotPassword`, `resetPassword`, `confirmEmail`, `manage/info` |
| GET | `/api/cvs` | liste (métadonnées seules, sans le document — le dashboard n'en a pas besoin) |
| POST | `/api/cvs` | créer (vide, ou depuis un document importé) |
| GET | `/api/cvs/{id}` | document complet |
| PUT | `/api/cvs/{id}` | sauvegarde complète (autosave debounced 1,5 s) |
| PATCH | `/api/cvs/{id}/name` | renommer depuis le dashboard, sans charger le document |
| POST | `/api/cvs/{id}/duplicate` | dupliquer |
| DELETE | `/api/cvs/{id}` | supprimer |
| GET | `/api/cvs/{id}/pdf` | **génération PDF** → `application/pdf` |
| POST | `/api/cvs/{id}/photo` | upload photo (≤ 2 Mo) |
| DELETE | `/api/cvs/{id}/photo` | |
| GET | `/api/photos/{userId}/{file}` | servir la photo, `Content-Type` forcé |
| POST | `/api/ai/improve-text` | reformuler une description |
| POST | `/api/ai/bullet-points` | générer des réalisations |
| POST | `/api/ai/summary` | générer le profil professionnel |
| POST | `/api/ai/analyze` | 5 scores + recommandations |
| POST | `/api/import` | upload PDF/DOCX (≤ 5 Mo) → renvoie un `CvDocument` extrait, **non persisté** |

**Règle d'autorisation, appliquée en un seul endroit** — un helper `LoadOwnedCv(userId, cvId)` utilisé par chaque endpoint touchant un CV :

```
WHERE Id = @cvId AND UserId = @currentUserId
```

Aucun endpoint ne charge un CV par `Id` seul. Un CV appartenant à autrui renvoie `404` (et non `403`, qui confirmerait son existence).

**Rate limiting** (`AddRateLimiter`, natif ASP.NET Core) sur `/api/ai/*` et `/api/import` : ces routes coûtent de l'argent réel à chaque appel.

---

## 6. Stratégie PDF

Le seul moyen d'obtenir un PDF identique à la preview est que ce soit **le même HTML rendu par le même CSS**.

```
GET /api/cvs/{id}/pdf
   │
   ├─ charge le CvDocument (avec contrôle de propriété)
   ├─ Playwright lance Chromium headless (instance réutilisée, pas relancée à chaque appel)
   ├─ page.AddInitScriptAsync("window.__cv = {…document sérialisé…}")
   ├─ page.GotoAsync("{FrontendOrigin}/print/{id}")
   │       → le composant Angular /print lit window.__cv s'il existe, sinon fetch
   │         ⇒ aucun jeton d'authentification à inventer : le backend injecte les données
   ├─ page.WaitForFunctionAsync("window.__cvReady === true")   ← polices chargées
   └─ page.PdfAsync(Format: "A4", PrintBackground: true, PreferCSSPageSize: true)
```

La route `/print/:id` rend le CV **seul** : ni barre de navigation, ni toolbar, ni ombres. Les marges viennent du CSS `@page { size: A4; margin: 12mm }`, `PreferCSSPageSize: true` garantit que Chromium les respecte.

**Contre les coupures** : `break-inside: avoid` sur chaque bloc d'expérience/formation/projet, `break-after: avoid` sur les titres de section, `orphans: 2; widows: 2` sur les paragraphes.

`FrontendOrigin` est une config : `http://localhost:4200` en dev, l'origine de l'app en production (où ASP.NET sert le bundle Angular buildé depuis `wwwroot`).

> `ponytail:` la **preview écran** affiche une colonne continue de 210 mm avec des repères de coupe pointillés tous les 297 mm, pas une vraie pagination JS. Plafond : si un bloc déborde d'une page, la preview le signale par le repère mais ne le repousse pas visuellement comme le fera Chromium. Un moteur de pagination JS (mesure via Range API) est un chantier à part entière — à ouvrir seulement si l'écart gêne réellement à l'usage.

---

## 7. Stratégie IA

**Garde-fou non négociable, imposé à trois niveaux :**
1. *Prompt système* : « Reformule uniquement ce qui est fourni. N'ajoute jamais une technologie, un employeur, un diplôme, une date ou un chiffre absent de l'entrée. »
2. *Structure d'appel* : chaque endpoint ne reçoit **que** le texte à traiter, jamais « invente-moi une expérience ».
3. *UX* : toute suggestion s'affiche **à côté** du texte original avec deux boutons `Accepter` / `Ignorer`. Rien n'est jamais écrit dans le CV sans un clic explicite.

| Endpoint | Sortie |
|---|---|
| `improve-text` | texte reformulé |
| `bullet-points` | `string[]` (structured output) |
| `summary` | texte, à partir de données déjà présentes dans le CV |
| `analyze` | JSON strict : `{ atsScore, contentScore, technicalSkillsScore, experienceScore, overallScore, recommendations[] }` |

**Mode dégradé (ta situation actuelle)** : sans clé configurée, les endpoints renvoient `503` avec un message explicite, et le frontend grise les boutons IA avec une infobulle « Configurez ANTHROPIC_API_KEY ». Aucune ligne de code à changer le jour où tu ajoutes la clé.

Clé lue via **.NET User Secrets** en développement (jamais dans `appsettings.json`, jamais commitée).

**Analyse ATS — approche hybride.** Le score ATS est calculé **par des règles déterministes en C#** (photo présente ? colonnes multiples ? sections nommées standard ? dates cohérentes ? contacts complets ? ratio de puces quantifiées ?) et non par l'IA. Un score doit être reproductible et explicable ; un LLM donnerait 72 puis 68 pour le même CV. L'IA n'intervient que pour rédiger les recommandations en langage naturel — et ce volet-là fonctionne donc **même sans clé API**.

---

## 8. Structure des dossiers

```
claudeFirstStep/
├── backend/
│   ├── CvForge.sln
│   ├── CvForge.Api/
│   │   ├── Program.cs                    composition : Identity, EF, CORS, rate limit, endpoints
│   │   ├── Domain/
│   │   │   ├── AppUser.cs
│   │   │   ├── Cv.cs
│   │   │   └── CvDocument.cs             + tous les types owned
│   │   ├── Data/
│   │   │   ├── AppDbContext.cs           mapping ToJson()
│   │   │   └── Migrations/
│   │   ├── Endpoints/
│   │   │   ├── CvEndpoints.cs
│   │   │   ├── PdfEndpoints.cs
│   │   │   ├── AiEndpoints.cs
│   │   │   ├── ImportEndpoints.cs
│   │   │   └── PhotoEndpoints.cs
│   │   ├── Services/
│   │   │   ├── PdfService.cs             Playwright, navigateur réutilisé
│   │   │   ├── AiService.cs              SDK Anthropic + mode dégradé
│   │   │   ├── AtsAnalyzer.cs            règles déterministes
│   │   │   ├── ImportService.cs          PdfPig / OpenXml → texte → IA
│   │   │   └── FileValidator.cs          magic bytes, taille, extension
│   │   ├── Validation/CvDocumentValidator.cs
│   │   └── appsettings.json / appsettings.Development.json
│   └── CvForge.Tests/
│       ├── AuthorizationTests.cs         ← critique : isolation entre utilisateurs
│       ├── CvCrudTests.cs
│       ├── AtsAnalyzerTests.cs
│       └── FileValidatorTests.cs
│
├── frontend/
│   ├── src/app/
│   │   ├── core/
│   │   │   ├── api.service.ts            httpResource / fetch typé
│   │   │   ├── auth.service.ts + auth.guard.ts + auth.interceptor.ts
│   │   │   ├── i18n.service.ts + locales/fr.ts + locales/en.ts + t.pipe.ts
│   │   │   └── toast.service.ts
│   │   ├── models/cv-document.ts         miroir exact des types C#
│   │   ├── pages/
│   │   │   ├── landing/  login/  register/  forgot-password/  reset-password/
│   │   │   ├── dashboard/
│   │   │   ├── editor/                   écran principal
│   │   │   ├── print/                    route /print/:id, rendu nu pour Playwright
│   │   │   └── profile/
│   │   ├── editor/
│   │   │   ├── cv-store.ts               signal<CvDocument> + autosave
│   │   │   ├── sections/                 un composant par section du formulaire
│   │   │   ├── section-list.component.ts drag & drop cdk
│   │   │   ├── customization-panel.component.ts
│   │   │   ├── ai-suggestion.component.ts
│   │   │   └── preview-pane.component.ts zoom, plein écran, repères de page
│   │   ├── templates/
│   │   │   ├── cv-base.css               variables CSS + règles @page communes
│   │   │   ├── modern/ minimal/ executive/ tech/ ats/
│   │   │   └── template-host.component.ts
│   │   └── ui/                           button, input, textarea, select, card,
│   │                                     modal, toast, skeleton, tag-input, date-input
│   ├── .postcssrc.json                   Tailwind v4
│   └── src/styles.css
│
└── README.md                             démarrage, variables d'environnement
```

**Le point clé des templates** : les 5 templates consomment **le même jeu de variables CSS** (`--cv-primary`, `--cv-secondary`, `--cv-font`, `--cv-scale`, `--cv-gap`) posées sur le conteneur racine depuis `CvSettings`. Changer de template ne touche jamais aux données, et la personnalisation est écrite une seule fois pour les cinq.

---

## 9. Wireframe fonctionnel

### Éditeur — desktop

```
┌────────────────────────────────────────────────────────────────────────┐
│ CvForge   [CV Software Engineer ✎]        ⟳ Enregistré  [FR|EN] [PDF] ⌄│
├──────────────────────────────────┬─────────────────────────────────────┤
│ ⠿ Informations personnelles    ▾ │   ⊖  100%  ⊕     ⛶ Plein écran      │
│    Prénom [Amine    ]            │  ┌───────────────────────────────┐  │
│    Nom    [Ouni     ]            │  │                               │  │
│    Titre  [Software Engineer]    │  │      AMINE OUNI               │  │
│                                  │  │      Software Engineer        │  │
│ ⠿ Profil professionnel         ▾ │  │      ─────────────────        │  │
│    ┌────────────────────────┐    │  │   PROFIL                      │  │
│    │ Software Engineer avec │    │  │   Software Engineer avec 7... │  │
│    │ 7 ans d'expérience...  │    │  │                               │  │
│    └────────────────────────┘    │  │   EXPÉRIENCE                  │  │
│    [✨ Améliorer avec l'IA]      │  │   Backend Developer           │  │
│                                  │  │   Sopra Steria · 2021 → …     │  │
│ ⠿ Expériences                  ▾ │  │                               │  │
│    ⠿ Backend Dev · Sopra   ✎ 🗑 │  │- - - - - fin page 1 - - - - - │  │
│    ⠿ Dev Full-Stack · Atos ✎ 🗑 │  │                               │  │
│    [+ Ajouter une expérience]    │  │   COMPÉTENCES                 │  │
│                                  │  └───────────────────────────────┘  │
│ ⠿ Projets · Formation ·          │                                     │
│   Compétences · Langues ·        │   ◂ Page 1 / 2 ▸                    │
│   Certifications · Intérêts      │                                     │
├──────────────────────────────────┴─────────────────────────────────────┤
│ [Contenu]  [Template]  [Design]  [✨ Analyse IA]                        │
└────────────────────────────────────────────────────────────────────────┘
   ⠿ = poignée de drag & drop (sections ET éléments dans chaque section)
```

### Éditeur — mobile

```
┌─────────────────────┐     Bascule plein écran entre les deux vues.
│ ‹  CV Software Eng. │     Pas de split : sur 375 px, deux demi-écrans
│                     │     ne servent personne.
│  ⠿ Informations   ▾ │
│  ⠿ Profil         ▾ │
│  ⠿ Expériences    ▾ │
│                     │
├─────────────────────┤
│ [ ✎ Éditer │ 👁 Voir ]│  ← barre fixe en bas
└─────────────────────┘
```

### Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│ CvForge                                    [FR|EN]  [Amine ⌄]│
├──────────────────────────────────────────────────────────────┤
│  Mes CV                                    [ + Créer un CV ] │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ ┌────────┐ │  │ ┌────────┐ │  │            │             │
│  │ │ aperçu │ │  │ │ aperçu │ │  │     +      │             │
│  │ └────────┘ │  │ └────────┘ │  │  Nouveau   │             │
│  │ CV Software│  │ CV Backend │  │            │             │
│  │ aujourd'hui│  │ il y a 2 j │  │            │             │
│  │ ✎ ⧉ ⤓ ⋯   │  │ ✎ ⧉ ⤓ ⋯   │  │            │             │
│  └────────────┘  └────────────┘  └────────────┘             │
└──────────────────────────────────────────────────────────────┘
   ✎ Modifier · ⧉ Dupliquer · ⤓ PDF · ⋯ Renommer / Supprimer
   Suppression → modale de confirmation avec saisie du nom
```

### Flux utilisateur

```
Landing ──▶ Register ──▶ Dashboard ──▶ [Créer un CV] ──▶ Éditeur ──▶ PDF
   │                        ▲                              │
   └──▶ Login ──────────────┘                              │
                            │                              ▼
                            └── [Importer un CV] ──▶ Upload PDF/DOCX
                                                       ──▶ Extraction IA
                                                       ──▶ ÉCRAN DE VÉRIFICATION
                                                           (champ par champ,
                                                            l'extraction n'est
                                                            jamais fiable à 100 %)
                                                       ──▶ Éditeur
```

---

## 10. Sécurité

| Risque | Mesure |
|---|---|
| Accès au CV d'autrui | filtre `UserId` **dans la requête**, jamais après chargement · `404` et non `403` · **test automatisé dédié** (`AuthorizationTests`) |
| XSS | Angular échappe par défaut · **`innerHTML` interdit** sur toute donnée de CV, y compris dans la route `/print` |
| Mots de passe | ASP.NET Core Identity : PBKDF2 + sel, verrouillage après échecs répétés |
| Reset password | tokens Identity à usage unique et expirants (en dev, le lien est écrit dans les logs faute de SMTP) |
| Upload | taille max (photo 2 Mo, import 5 Mo) · **magic bytes vérifiés**, pas seulement l'extension · nom de fichier régénéré en GUID · servi via endpoint à `Content-Type` forcé |
| Coût / abus IA | rate limiting sur `/api/ai/*` et `/api/import` |
| Injection SQL | EF Core paramétré, aucun SQL concaténé |
| CORS | restreint à l'origine du frontend, pas de `AllowAnyOrigin` |
| Secrets | .NET User Secrets en dev · aucune clé dans le dépôt |

---

## 11. Plan de développement

Chaque phase se termine par : compilation vérifiée, application lancée, fonctionnalité testée dans le navigateur, liste des fichiers créés, commandes à exécuter, puis proposition de la suite.

| # | Phase | Livrable |
|---|---|---|
| **1** | Initialisation | Solution .NET + projet Angular + Tailwind + EF Core connecté à SQL Server + première migration + `README`. Les deux serveurs démarrent. |
| **2** | Authentification | `MapIdentityApi`, écrans Register / Login / Forgot / Reset / Profile, guard, interceptor, persistance de session |
| **3** | CV & stockage | `CvDocument`, mapping `ToJson()`, CRUD + contrôle de propriété, validation FluentValidation |
| **4** | Éditeur | `cv-store` sur signals, toutes les sections du formulaire, autosave debounced, composants UI réutilisables |
| **5** | Preview temps réel | Panneau A4, zoom, plein écran, repères de page, bascule mobile |
| **6** | Templates | Les 5 templates + variables CSS + panneau de personnalisation (couleurs, police, taille, espacement) |
| **7** | Drag & drop | `@angular/cdk` — ordre des sections, des expériences, des compétences, masquage de sections |
| **8** | Export PDF | Route `/print/:id`, `PdfService` Playwright, endpoint de téléchargement, règles anti-coupure |
| **9** | Dashboard | Liste, création, duplication, renommage, suppression avec confirmation, export, miniatures |
| **10** | Assistant IA | Les 4 endpoints, mode dégradé, UI Accepter/Ignorer |
| **11** | Import PDF/DOCX | Upload, extraction, structuration, **écran de vérification** |
| **12** | Analyse ATS | Scores déterministes + recommandations, panneau de résultats |
| **13** | Tests & sécurité | xUnit (autorisation, CRUD, ATS, validation fichiers), Vitest (store, templates), passe de durcissement |
| **14** | UX/UI | Skeletons, toasts, états vides, animations, landing page complète, responsive final |

**Regroupements possibles** si tu veux avancer plus vite : 4+5 ensemble (l'éditeur sans sa preview est peu testable), et 6+7 ensemble (mêmes fichiers touchés). À toi de voir au fil de l'eau.

---

## 12. Contenu de la Phase 1

```bash
# Backend
dotnet new sln -n CvForge -o backend
dotnet new webapi -n CvForge.Api -o backend/CvForge.Api --use-minimal-apis
dotnet add backend/CvForge.Api package Microsoft.EntityFrameworkCore.SqlServer
dotnet add backend/CvForge.Api package Microsoft.EntityFrameworkCore.Design
dotnet add backend/CvForge.Api package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add backend/CvForge.Api package FluentValidation.AspNetCore

# Frontend
npm create @angular@latest frontend -- --style=css --ssr=false --routing
npm install -D tailwindcss @tailwindcss/postcss postcss --prefix frontend
npm install @angular/cdk --prefix frontend
```

**Chaîne de connexion** (`appsettings.Development.json`, instance locale déjà en service) :
```
Server=localhost;Database=CvForge;Trusted_Connection=True;TrustServerCertificate=True
```

**Variables / secrets** — aucun secret dans le dépôt :
```bash
dotnet user-secrets init --project backend/CvForge.Api
dotnet user-secrets set "Anthropic:ApiKey" "sk-ant-..." --project backend/CvForge.Api   # Phase 10
```

**Lancement** — deux terminaux :
```bash
dotnet watch --project backend/CvForge.Api     # https://localhost:7xxx
npm start --prefix frontend                    # http://localhost:4200
```

---

## 13. Vérification de fin de Phase 1

1. `dotnet build backend/CvForge.sln` → 0 erreur, 0 avertissement
2. `dotnet ef database update --project backend/CvForge.Api` → base `CvForge` créée avec les tables Identity
3. `dotnet watch` puis `GET /health` → `200`
4. `npm start` puis `http://localhost:4200` → page d'accueil avec une classe Tailwind visiblement appliquée (vérification que la chaîne PostCSS fonctionne)
5. Un appel du frontend vers `/health` du backend passe **sans erreur CORS** dans la console du navigateur
6. Vérification navigateur via le Browser pane, pas seulement une supposition

Puis : récapitulatif des fichiers créés et proposition de passer à la Phase 2.
