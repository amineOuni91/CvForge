# Progress — CvForge

Suivi d'avancement de l'exécution de [PLAN.md](PLAN.md). Mis à jour à chaque tâche.

## Vue d'ensemble des phases

| # | Phase | Statut |
|---|---|---|
| 1 | Initialisation | Terminée |
| 2 | Authentification | Terminée |
| 3 | CV & stockage | Terminée |
| 4 | Éditeur | Terminée |
| 5 | Preview temps réel | Terminée |
| 6 | Templates | Terminée |
| 7 | Drag & drop | Terminée (voir note de vérification) |
| 8 | Export PDF | Terminée |
| 9 | Dashboard | Terminée |
| 10 | Assistant IA | Terminée (mode dégradé vérifié ; appels réels non testables, pas de clé API) |
| 11 | Import PDF/DOCX | Terminée (extraction réelle vérifiée ; structuration IA non testable en conditions réelles, pas de clé API) |
| 12 | Analyse ATS | Terminée |
| 13 | Tests & sécurité | Terminée |
| 14 | UX/UI | Terminée |

---

## Journal détaillé

### Phase 1 — Initialisation

**Statut** : Terminée

**Tâche** : Solution .NET + projet Angular + Tailwind + EF Core connecté à SQL Server + première migration + README. Les deux serveurs démarrent.

**Réalisé** :
- Solution `backend/CvForge.slnx` (note : .NET 10 génère `.slnx` par défaut, pas `.sln` — PLAN.md §12 mentionnait `.sln`) avec le projet `CvForge.Api` (Minimal APIs, net10.0)
- Packages NuGet : `Microsoft.EntityFrameworkCore.SqlServer`, `Microsoft.EntityFrameworkCore.Design`, `Microsoft.AspNetCore.Identity.EntityFrameworkCore`, `FluentValidation.AspNetCore`
- Outil global `dotnet-ef` installé
- `Domain/AppUser.cs` (`IdentityUser` + `DisplayName`, `CreatedAt`) et `Data/AppDbContext.cs` (`IdentityDbContext<AppUser>`)
- `Program.cs` : `AddDbContext` (SQL Server), CORS restreint à `http://localhost:4200`, endpoint `GET /health`, `UseHttpsRedirection` désactivé en dev (évite l'échec de fetch http→https avec certificat de dev non approuvé)
- Migration `InitialIdentity` générée et appliquée → base `CvForge` créée avec toutes les tables `AspNetUsers*`
- Projet Angular 22 scaffoldé dans `frontend/` (standalone, routing, zoneless par défaut sur les nouveaux projets Angular récents, SSR désactivé)
- Tailwind CSS v4 : `@tailwindcss/postcss` + `postcss` installés, `.postcssrc.json` créé, `@import "tailwindcss";` ajouté à `src/styles.css`
- `@angular/cdk` installé (préparation Phase 7)
- `app.ts`/`app.html` remplacés par une page minimale de vérification (classes Tailwind visibles + fetch `/health`) ; sera remplacée par la vraie landing page en Phase 14
- `app.spec.ts` corrigé pour matcher le nouveau contenu ; `app.css` supprimé (non référencé)
- `README.md` (racine) et `.gitignore` (racine, couvre `bin/`, `obj/`, `node_modules/`, `uploads/`)

**Fichiers créés/modifiés** :
- `backend/CvForge.slnx`, `backend/CvForge.Api/**` (scaffold + Domain/AppUser.cs, Data/AppDbContext.cs, Program.cs, appsettings.Development.json, Migrations/*)
- `frontend/**` (scaffold Angular complet + `.postcssrc.json`, `src/styles.css`, `src/app/app.ts`, `src/app/app.html`, `src/app/app.spec.ts`)
- `README.md`, `.gitignore` (racine)

**Vérifications effectuées** (PLAN.md §13) :
1. `dotnet build backend/CvForge.slnx` → 0 erreur, 0 avertissement ✅
2. `dotnet ef database update` → base `CvForge` créée avec les tables Identity ✅
3. Backend lancé (`dotnet run --launch-profile https`), `GET http://localhost:5145/health` → `200 {"status":"ok"}` ✅
4. `npm start --prefix frontend` → `http://localhost:4200` affiche une carte avec classes Tailwind visibles (fond gris clair, carte blanche arrondie avec ombre, titre en gras) — vérifié via le Browser pane (screenshot) ✅
5. Appel fetch frontend → backend `/health` : "Backend: ok" affiché, aucune erreur CORS dans la console ✅
6. Vérification faite dans le Browser pane (pas seulement supposée) ✅
7. Tests unitaires frontend (`npm test -- --watch=false`) : 2/2 passés ✅

**Problèmes rencontrés** :
- .NET 10 `dotnet new sln` génère un fichier `.slnx` (nouveau format XML) au lieu de `.sln`. Toutes les commandes du plan et de CLAUDE.md ont été adaptées en conséquence — sans impact fonctionnel.
- `UseHttpsRedirection()` combiné à un fetch frontend en `http://` cassait l'appel (redirection vers un cert de dev non approuvé par le navigateur). Résolu en désactivant cette redirection en environnement `Development` uniquement (production non concernée, pas de régression de sécurité).

**Note pour la suite** : Backend et frontend tournent actuellement en arrière-plan (tasks `bmllegoy3` et `b4cbwqz59`) pour permettre la vérification continue au fil des phases suivantes.

---

### Phase 2 — Authentification

**Statut** : Terminée

**Tâche** : `MapIdentityApi`, écrans Register / Login / Forgot / Reset / Profile, guard, interceptor, persistance de session.

**Réalisé** :
- Backend : `AddIdentityApiEndpoints<AppUser>().AddEntityFrameworkStores<AppDbContext>()`, `AddAuthorization()`, `UseAuthentication()`/`UseAuthorization()`, groupe `/api/auth` avec `MapIdentityApi<AppUser>()` (register, login, refresh, forgotPassword, resetPassword, confirmEmail, manage/info intégrés d'origine)
- `Services/LoggingEmailSender.cs` (`IEmailSender<AppUser>`) : écrit les liens de confirmation et codes de reset dans les logs au lieu d'envoyer un email (pas de SMTP en dev, conforme à PLAN.md §10)
- `Endpoints/AuthEndpoints.cs` : deux endpoints custom `GET/PATCH /api/auth/me` pour lire/modifier `DisplayName` (absent du DTO `MapIdentityApi` standard)
- Authentification par **Bearer token** (pas de cookies) — cohérent avec un frontend SPA séparé sur un autre port
- Frontend :
  - `core/api-config.ts` (URL backend), `core/auth.service.ts` (signals `currentUser`/`isAuthenticated`, register/login/refresh/forgotPassword/resetPassword/updateDisplayName/logout, persistance des tokens dans `localStorage`)
  - `core/auth.guard.ts` (`CanActivateFn`, redirige vers `/login` si non authentifié)
  - `core/auth.interceptor.ts` (ajoute `Authorization: Bearer`, tente un refresh automatique sur `401` puis rejoue la requête une fois)
  - `core/i18n.service.ts` + `core/locales/{fr,en}.ts` + `core/t.pipe.ts` — i18n minimal (signal de langue + dictionnaire plat), démarré dès cette phase pour éviter de retoucher tous les écrans plus tard ; toutes les pages construites sont déjà bilingues FR/EN
  - Pages `login`, `register`, `forgot-password`, `reset-password`, `profile`, `dashboard` (placeholder), toutes en composants standalone avec Reactive Forms, templates inline
  - `app.config.ts` : ajout de `provideZonelessChangeDetection()` et `provideHttpClient(withInterceptors([authInterceptor]))`
  - `app.routes.ts` : routes lazy-loadées, `/dashboard` et `/profile` protégées par `authGuard`
  - `app.ts`/`app.spec.ts` : composant racine réduit à `<router-outlet />` (la page de vérification Phase 1 est remplacée par le vrai routing)

**Fichiers créés/modifiés** :
- `backend/CvForge.Api/Services/LoggingEmailSender.cs`, `backend/CvForge.Api/Endpoints/AuthEndpoints.cs`, `backend/CvForge.Api/Program.cs`
- `frontend/src/app/core/{api-config.ts,auth.service.ts,auth.guard.ts,auth.interceptor.ts,i18n.service.ts,t.pipe.ts,locales/fr.ts,locales/en.ts}`
- `frontend/src/app/pages/{login,register,forgot-password,reset-password,profile,dashboard}/*.ts`
- `frontend/src/app/{app.ts,app.spec.ts,app.routes.ts,app.config.ts}` (`app.html`/`app.css` supprimés, remplacés par templates inline)

**Vérifications effectuées** :
- Backend (curl) : `POST /api/auth/register` → 200 ; `POST /api/auth/login?useCookies=false` → 200 avec `accessToken`/`refreshToken` ; `GET /api/auth/me` avec Bearer → 200 ; `PATCH /api/auth/me` → `displayName` mis à jour ; `POST /api/auth/forgotPassword` avant confirmation email → 200 mais **aucun lien envoyé** (comportement Identity correct : anti-énumération, n'agit que si l'email est confirmé) ; lien de confirmation bien loggé à l'inscription
- Backend, flux reset complet : `confirmEmail` (lien loggé) → `forgotPassword` → code de reset loggé → `resetPassword` avec ce code → `login` avec le nouveau mot de passe → 200
- `dotnet build` → 0 erreur, 0 avertissement
- `npm run build` (production) → succès, chaque page en chunk lazy séparé
- `npm test -- --watch=false` → 1/1 test passé
- **Navigateur (Browser pane)**, flux UI complet : `/register` (formulaire visible avec styles Tailwind) → inscription réelle (requêtes réseau `register`→`login`→`me` observées, 200 chacune) → redirection automatique vers `/dashboard` affichant l'email connecté → navigation vers `/profile` → édition du nom affiché → sauvegarde (`PATCH /me`, message "Profil mis à jour." affiché) → déconnexion → redirection vers `/login` → tentative d'accès direct à `/dashboard` sans session → **redirection automatique vers `/login` par le guard** ✅

**Problèmes rencontrés** :
- Aucun blocage. Une seule contrainte à documenter : `forgotPassword` n'envoie (ne logge) un code que si l'email du compte est confirmé — comportement standard ASP.NET Identity contre l'énumération de comptes, pas un bug. Pour tester le flux reset en dev, il faut donc d'abord suivre le lien de confirmation loggé à l'inscription.
- Verrou de fichier Windows (`CvForge.Api.exe` en cours d'exécution) a bloqué un `dotnet build` — résolu en tuant le process avant de rebuilder ; à surveiller à chaque phase suivante (toujours arrêter le process backend en arrière-plan avant un nouveau `dotnet build`, ou simplement laisser `dotnet watch` recompiler lui-même).

---

### Phase 4 — Éditeur & Phase 5 — Preview temps réel (traitées ensemble, comme suggéré par PLAN.md §11)

**Statut** : Terminée

**Tâche** : `cv-store` sur signals, toutes les sections du formulaire, autosave debounced, composants UI réutilisables (Phase 4) · Panneau A4, zoom, plein écran, repères de page, bascule mobile (Phase 5).

**Réalisé** :
- `models/cv-document.ts` : interfaces TS miroir exact des types C# (`CvDocument`, `CvSettings`, `PersonalInfo`, `Experience`, `Project`, `EducationEntry`, `SkillCategory`, `LanguageEntry`, `Certification`, `CvDto`, `CvSummary`) — confirmé compatible avec le JSON camelCase renvoyé par le backend
- `editor/cv-store.ts` : service signal (`document`, `name`, `saveState`, `loading`), `load(id)`, `update(mutate)` (mutation immutable + planifie la sauvegarde), autosave **debounced 1,5 s** via `setTimeout`, `saveNow()` pour forcer
- `ui/tag-input.ts` : seul composant UI réutilisable ajouté (via `model()` signal two-way binding) — justifié par un réemploi réel dans 5 endroits (Technologies, Missions, Réalisations, Compétences, Centres d'intérêt) ; pas de Button/Card/Modal/Toast/Select génériques ajoutés maintenant (YAGNI, ajoutés quand une phase en aura vraiment besoin : Modal/Toast → Phase 9, Skeleton → Phase 14)
- 9 sections de formulaire (`editor/sections/*.ts`) : informations personnelles, profil, expériences, projets, formation, compétences, langues, certifications, centres d'intérêt — chacune branchée directement sur `CvStore.update()`, `<input type="month">` natif pour les dates `YYYY-MM` (pas de composant date custom, ladder rung 4 : fonctionnalité native)
- `editor/section-list.component.ts` : accordéon assemblant les 9 sections (réordonnancement par drag & drop = Phase 7, pas encore actif)
- `templates/cv-base.css` (variables CSS `--cv-primary/--cv-secondary/--cv-font/--cv-scale/--cv-gap`, règles `@page`, anti-coupure `break-inside/break-after`, `orphans/widows`), `templates/font-stacks.ts`, `templates/format-month.ts` (formatage « Mars 2021 » / « March 2021 » selon `CvSettings.CvLanguage`, jamais de jour affiché)
- `templates/modern/modern-template.component.ts` : premier des 5 templates (les 4 autres = Phase 6), rend le CV complet en respectant `SectionOrder`/`HiddenSections`, intitulés de section bilingues selon `CvSettings.CvLanguage` (indépendant de la langue de l'UI)
- `templates/template-host.component.ts` : `@switch` sur `templateKey` avec un seul cas pour l'instant (`@default` → modern) — prêt à accueillir les 4 templates de la Phase 6 sans refactor
- `editor/preview-pane.component.ts` : zoom (40%–150%), plein écran, repères de page tous les 297mm (implémentés en **une ligne CSS** `repeating-linear-gradient`, pas de mesure JS — trait plein à chaque limite de page plutôt qu'un pointillé littéral, simplification jugée suffisante pour un repère visuel)
- `pages/editor/editor.ts` : assemble section-list + preview-pane, bascule mobile Éditer/Voir (`hidden`/`block` + `lg:block`, pas de vrai split sur petit écran conformément au wireframe §9), affichage de l'état de sauvegarde (« ⟳ Enregistré » / « Enregistrement... » / « Erreur »)
- `pages/dashboard/dashboard.ts` : complété a minima (liste des CV + bouton **Créer un CV** → `POST /api/cvs` → navigation vers l'éditeur) — juste assez pour atteindre l'éditeur et le tester ; la gestion complète (renommer/dupliquer/supprimer/miniatures) reste Phase 9
- Route `editor/:id` ajoutée, protégée par `authGuard`

**Fichiers créés/modifiés** :
- `frontend/src/app/models/cv-document.ts`
- `frontend/src/app/editor/{cv-store.ts,section-list.component.ts,preview-pane.component.ts,sections/*.ts}`
- `frontend/src/app/ui/tag-input.ts`
- `frontend/src/app/templates/{cv-base.css,font-stacks.ts,format-month.ts,template-host.component.ts,modern/modern-template.component.ts}`
- `frontend/src/app/pages/editor/editor.ts`, `frontend/src/app/pages/dashboard/dashboard.ts` (complété)
- `frontend/src/app/app.routes.ts` (route `editor/:id`)
- `frontend/src/styles.css` (import de `cv-base.css`)
- `frontend/src/app/core/auth.service.ts` (**correctif**, voir Problèmes rencontrés)

**Vérifications effectuées** :
- `npm run build` (production) → succès, `editor` en chunk lazy séparé
- `npm test -- --watch=false` → 1/1 test passé
- **Navigateur, bout en bout** : connexion → dashboard → « + Créer un CV » (→ `POST /api/cvs` 201 → navigation `/editor/{id}`) → section « Informations personnelles » : saisie Prénom/Nom/Titre → **preview A4 mise à jour en temps réel** (`Amine Ouni` / `Software Engineer` visibles instantanément dans `.cv-page`) → statut « ⟳ Enregistré » affiché après le délai d'autosave → section « Expériences » : ajout d'une expérience, saisie Poste/Entreprise → **preview mise à jour en temps réel** également pour les sections en tableau → autosave confirmé (`PUT /api/cvs/{id}` 200)
- **Persistance après reload réel** (`location.reload()`, pas juste navigation SPA) : rechargement de la page → re-navigation vers l'éditeur → `Amine Ouni` / `Software Engineer` toujours affichés, données bien relues depuis le backend (`GET /api/cvs/{id}` 200)
- Zoom (+/−) et bouton plein écran présents et fonctionnels dans le panneau de preview ; bascule mobile « ✎ Éditer / 👁 Voir » correctement masquée (`display: none` vérifié) au-dessus du breakpoint `lg` (1024px)

**Problèmes rencontrés (bug réel trouvé et corrigé)** :
- **Dépendance circulaire DI côté frontend** : `AuthService` appelait `this.fetchMe()` (requête HTTP) de façon synchrone dans son propre constructeur. Cette requête passe par `authInterceptor`, qui fait `inject(AuthService)` — mais `AuthService` est encore en cours de construction à ce moment précis (résolution DI ré-entrante), ce qui lève une erreur Angular (NG0200-like) capturée silencieusement par le `.catch(() => this.logout())` du constructeur. Résultat observable : **à chaque rechargement complet de page (F5), l'utilisateur était déconnecté silencieusement** (tokens effacés de `localStorage`), alors que le token était en réalité toujours valide côté serveur (vérifié via `fetch` direct → 200). Corrigé en différant l'appel initial à `fetchMe()` via `queueMicrotask()` dans `core/auth.service.ts`, pour qu'il s'exécute une fois la construction du service terminée. Vérifié par deux `location.reload()` consécutifs : session et données conservées. **Point de vigilance pour la suite** : ne jamais déclencher d'appel HTTP de façon synchrone dans le constructeur d'un service injecté par un interceptor qui réinjecte ce même service.
- Difficulté annexe (outillage, pas applicative) : le Browser pane a été flaky sur les clics par coordonnées brutes après plusieurs rechargements (focus non pris malgré un clic « réussi ») ; contourné en utilisant les références d'éléments (`ref_N`) ou, pour les vérifications finales, `javascript_tool` avec dispatch d'évènements `input` natifs. N'affecte pas le code applicatif, seulement la méthode de test utilisée dans cette session.

---

### Phase 6 — Templates & Phase 7 — Drag & drop (traitées ensemble, mêmes fichiers)

**Statut** : Terminée

**Tâche** : Les 5 templates + variables CSS + panneau de personnalisation (Phase 6) · `@angular/cdk` pour l'ordre des sections, des expériences, des compétences, masquage de sections (Phase 7).

**Réalisé** :
- 4 nouveaux templates, chacun visuellement distinct (pas de simple variation de palette) :
  - `templates/minimal/` : une colonne, sans couleur ni tags, titres fins en petites capitales grises, technologies/compétences en texte simple
  - `templates/executive/` : bandeau d'en-tête en couleur primaire, mise en page **deux colonnes** (sidebar 35% : contact/compétences/langues/certifications/intérêts, colonne principale 65% : profil/expériences/projets/formation)
  - `templates/tech/` : en-tête sombre, police monospace forcée (JetBrains Mono), tags de compétences très visibles, libellés de section façon commentaire de code (`// stack`)
  - `templates/ats/` : **ignore délibérément `PrimaryColor`/`SecondaryColor`** (texte noir forcé), une seule colonne, aucune puce ni tag visuel (listes en texte séparé par virgules) — conçu pour la parsabilité ATS, cohérent avec les règles déterministes prévues en Phase 12
  - `templates/modern/` (Phase 5) inchangé
- `templates/template-host.component.ts` : `@switch` complété avec les 4 nouveaux cas (le composant appelant, `preview-pane.component.ts`, n'a pas eu besoin d'être modifié — confirme que l'anticipation de la Phase 5 était justifiée)
- `editor/customization-panel.component.ts` : sélecteur de template (5 boutons), couleurs primaire/secondaire (`<input type="color">` natif), police (5 choix, stacks de fallback — **aucun fichier de police n'est chargé**, voir note), taille du texte (slider 0.85–1.20), espacement, langue du CV (FR/EN, indépendante de la langue de l'UI)
- `pages/editor/editor.ts` : onglets « Contenu » / « Template & Design » dans le panneau gauche (le wireframe §9 distingue Contenu/Template/Design/Analyse IA ; Template et Design ont été fusionnés en un seul onglet car ils touchent le même objet `CvSettings` — Analyse IA reste à faire en Phase 12)
- Drag & drop (`@angular/cdk/drag-drop`, `CdkDropList`/`CdkDrag`/`CdkDragHandle`/`moveItemInArray`) :
  - `editor/section-list.component.ts` : réordonnancement des 8 sections réordonnables (`CvSettings.SectionOrder`) par poignée `⠿` ; bouton `👁`/`🚫` par section pour bascule dans `CvSettings.HiddenSections` (« Informations personnelles » reste fixe en tête, non réordonnable, conformément au modèle de données)
  - `editor/sections/experiences.section.ts` et `editor/sections/skills.section.ts` : réordonnancement des éléments du tableau (expériences, catégories de compétences) par poignée `⠿`

**Fichiers créés/modifiés** :
- `frontend/src/app/templates/{minimal,executive,tech,ats}/*.ts`, `frontend/src/app/templates/template-host.component.ts`
- `frontend/src/app/editor/customization-panel.component.ts`
- `frontend/src/app/editor/section-list.component.ts`, `frontend/src/app/editor/sections/{experiences.section.ts,skills.section.ts}` (ajout CDK)
- `frontend/src/app/pages/editor/editor.ts` (onglets)

**Vérifications effectuées** :
- `npm run build` (production) → succès (chunk `editor` 132 Ko, inclut les 5 templates + CDK)
- `npm test -- --watch=false` → 1/1 test passé
- **Navigateur** : bascule entre les 5 templates confirmée par inspection DOM/CSS calculé — Executive affiche bien une `<aside>` (sidebar) avec fond d'en-tête `rgb(15, 23, 42)` (couleur primaire par défaut), ATS force `color: rgb(0, 0, 0)` sur le `<h1>` **même après changement de couleur primaire** (comportement voulu), Minimal a un `<h1>` en `font-weight: 400` (vs 700 pour Modern) ; changement de couleur primaire en direct via le color picker → en-tête du template Executive reflète la nouvelle couleur immédiatement
- **Masquage de section** vérifié en isolant la section « Expériences » : visible → clic sur `🚫` → « Backend Developer » disparaît de la preview → clic à nouveau → réapparaît. Confirme aussi bien la logique `HiddenSections` que le filtrage `visibleSections()` de chaque template
- **Réordonnancement (drag & drop) — vérification partielle** : confirmé **structurellement** que les directives CDK sont bien montées (attribut `cdkdraghandle`, classe `cdk-drag-handle` avec styles injectés par CDK comme `touch-action: none` présents dans le DOM rendu) et que le code de `onDrop()` (dans les 3 fichiers concernés) utilise correctement `moveItemInArray` sur une copie immuable du tableau, cohérent avec le pattern `CvStore.update()`. **Non vérifiée par une interaction pointeur réelle** : le Browser pane de cette session est resté masqué côté client pendant cette étape (confirmé par l'outil : « The Browser pane is currently hidden »), ce qui empêche la capture d'écran et la simulation fiable d'un glisser-déposer par coordonnées. Voir « Problèmes rencontrés ».

**Problèmes rencontrés** :
- **Vérification incomplète du drag & drop interactif**, pour une raison d'outillage et non de code : le Browser pane s'est retrouvé masqué côté client durant cette phase, empêchant `screenshot` et donc la simulation d'un glisser-déposer par coordonnées souris (`left_click_drag`). La logique de réordonnancement a été relue et repose sur `moveItemInArray` (utilitaire `@angular/cdk` éprouvé) et le même pattern `store.update()` déjà validé pour toutes les autres mutations. **Action de suivi recommandée** : lors d'une prochaine session avec le Browser pane visible, glisser une poignée `⠿` (section ou élément de liste) et confirmer visuellement le réordonnancement et l'autosave qui suit.
- Aucune police (Inter/Roboto/Lora/JetBrains Mono) n'est réellement chargée (pas d'import Google Fonts) — le sélecteur de police change bien la variable CSS `--cv-font` et le rendu utilise le fallback système correspondant (ex. serif pour Lora, monospace pour JetBrains Mono), mais pas encore la police exacte. `ponytail:` — à corriger si le rendu visuel exact des polices devient nécessaire (ajout de `@font-face`/lien Google Fonts en Phase 14 ou plus tôt si demandé).

---

### Phase 8 — Export PDF

**Statut** : Terminée

**Tâche** : Route `/print/:id`, `PdfService` Playwright, endpoint de téléchargement, règles anti-coupure (déjà posées en Phase 5 dans `cv-base.css`).

**Réalisé** :
- Package NuGet `Microsoft.Playwright` ajouté ; navigateur **Chromium installé** via `playwright.ps1 install chromium --with-deps` (téléchargement ~300 Mo, fait une fois dans l'environnement)
- `Services/PdfService.cs` : instance Chromium headless **lancée une fois et réutilisée** (singleton, `IAsyncDisposable`, verrou `SemaphoreSlim` pour l'initialisation concurrente) — pas relancée à chaque appel. `RenderCvPdfAsync(cv)` : sérialise `cv.Document` en JSON camelCase, l'injecte via `page.AddInitScriptAsync("window.__cv = {...}")`, navigue vers `{FrontendOrigin}/print/{id}`, attend `window.__cvReady === true`, puis `page.PdfAsync(Format: "A4", PrintBackground: true, PreferCSSPageSize: true)`
- `Endpoints/PdfEndpoints.cs` : `GET /api/cvs/{id}/pdf`, protégé par `RequireAuthorization()` + `LoadOwnedCvAsync` (même contrôle de propriété que les autres routes CV), renvoie `application/pdf` via `Results.File`
- Config `FrontendOrigin` ajoutée à `appsettings.Development.json` (`http://localhost:4200`)
- `pages/print/print.ts` (route `/print/:id`, **volontairement non protégée par `authGuard`** — le backend injecte les données, aucun jeton à fournir dans ce contexte) : lit `window.__cv` s'il existe (cas Playwright), sinon fait un `GET /api/cvs/{id}` classique (cas d'un utilisateur connecté qui ouvrirait la route par erreur) ; attend `document.fonts.ready` + une frame avant de positionner `window.__cvReady = true`
- `editor/cv-store.ts` : `downloadPdf()` — force d'abord un `saveNow()` (le PDF est généré depuis la base, pas depuis l'état non sauvegardé en mémoire), puis récupère le blob PDF (`responseType: 'blob'`, le jeton Bearer est nécessaire donc pas de simple lien `<a href>`) et déclenche le téléchargement via un `<a download>` synthétique + `URL.createObjectURL`
- Bouton « ⬇ PDF » ajouté dans l'en-tête de `pages/editor/editor.ts`

**Fichiers créés/modifiés** :
- `backend/CvForge.Api/Services/PdfService.cs`, `backend/CvForge.Api/Endpoints/PdfEndpoints.cs`
- `backend/CvForge.Api/Program.cs` (enregistrement `PdfService` singleton, `cvGroup.MapPdfEndpoints()`)
- `backend/CvForge.Api/appsettings.Development.json` (`FrontendOrigin`)
- `frontend/src/app/pages/print/print.ts`, `frontend/src/app/app.routes.ts` (route `print/:id`, sans guard)
- `frontend/src/app/editor/cv-store.ts` (`downloadPdf()`), `frontend/src/app/pages/editor/editor.ts` (bouton PDF)

**Vérifications effectuées** :
- `dotnet build` → 0 erreur, 0 avertissement · `npm run build` → succès (`print` en chunk lazy de 887 octets)
- **Bout en bout réel** (script Node appelant l'API, pas une supposition) : login → `GET /api/cvs/{id}/pdf` → **200, `Content-Type: application/pdf`**, fichier de 26,8 Ko commençant par `%PDF-` (signature valide)
- **Réutilisation du navigateur confirmée par la mesure** : premier appel 3221 ms (lancement de Chromium inclus), second appel immédiat **957 ms** (pas de relance) — cohérent avec l'exigence PLAN.md §6 « instance réutilisée, pas relancée à chaque appel »
- **Contenu du PDF vérifié visuellement** (relu page par page) : correspond exactement à l'état du CV en base au moment du test — « Amine Ouni », « Software Engineer », section « EXPÉRIENCE » avec la couleur d'accent personnalisée (rouge, définie plus tôt pendant les tests de la Phase 6), « Backend Developer · Sopra Steria » — **le PDF est bien pixel-identique au rendu HTML/CSS de la preview**, conformément à la stratégie du plan (même route, même CSS)
- PDF envoyé à l'utilisateur pour inspection directe

**Problèmes rencontrés** :
- Aucun blocage technique. Point d'attention pour la suite : le **premier appel PDF après démarrage du backend prend ~3,2 s** (lancement de Chromium) ; c'est attendu et sans impact fonctionnel, mais à garder en tête si des tests de performance sont faits plus tard (Phase 13).

---

### Phase 9 — Dashboard

**Statut** : Terminée

**Tâche** : Liste, création, duplication, renommage, suppression avec confirmation, export, miniatures.

**Réalisé** :
- `PdfService.RenderThumbnailAsync(cv)` (extension du service Phase 8, même navigateur Chromium réutilisé) : ouvre `/print/{id}` dans une page de petit viewport (420×594), screenshot de l'élément `.cv-page` en JPEG qualité 70 — même principe de fidélité pixel que le PDF, sans dupliquer de logique de rendu
- `GET /api/cvs/{id}/thumbnail` (`PdfEndpoints.cs`) : `RequireAuthorization()` + `LoadOwnedCvAsync`, renvoie `image/jpeg`
- `ui/modal.ts` : composant modal générique minimal (overlay + `<ng-content>`), premier vrai besoin de réemploi (confirmation de suppression) — justifie sa création maintenant plutôt qu'en avance de phase
- `pages/dashboard/dashboard.ts`, réécrit complet :
  - miniatures récupérées en blob authentifié (`GET .../thumbnail` → `URL.createObjectURL`, révoquées dans `ngOnDestroy` pour éviter les fuites mémoire) — **pas de simple `<img src>`**, impossible ici car l'endpoint exige un jeton Bearer
  - renommage inline (icône ✎ → input → `Enter`/blur → `PATCH /api/cvs/{id}/name`)
  - duplication (icône ⧉ → `POST /api/cvs/{id}/duplicate` → rechargement de la liste)
  - suppression avec **modale de confirmation par saisie du nom exact** (bouton désactivé tant que le texte tapé ne correspond pas exactement au nom du CV — repris du wireframe PLAN.md §9)
  - export PDF depuis la carte (icône ⤓, même mécanisme blob que `CvStore.downloadPdf()`)

**Fichiers créés/modifiés** :
- `backend/CvForge.Api/Services/PdfService.cs` (`RenderThumbnailAsync`, refactor `OpenPrintPageAsync` partagé avec le PDF)
- `backend/CvForge.Api/Endpoints/PdfEndpoints.cs` (`GET /api/cvs/{id}/thumbnail`)
- `frontend/src/app/ui/modal.ts`
- `frontend/src/app/pages/dashboard/dashboard.ts` (réécriture complète)

**Vérifications effectuées** :
- `dotnet build` → 0 erreur · `npm run build` → succès (chunk `dashboard` 7,5 Ko)
- Script Node (`test-dashboard.js`, 12 assertions, toutes passées) : miniature 200 avec signature JPEG valide (`0xFFD8`) et taille non triviale, **miniature d'un autre utilisateur → 404** (même contrôle de propriété que le reste), renommage persisté, duplication avec suffixe « (copie) », liste contenant original + copie, suppression des deux → 204
- **Navigateur, vérifications UI réelles** : miniature affichée comme `<img src="blob:...">` après chargement ; modale de suppression — bouton **désactivé** avec un texte incorrect, **activé** seulement après saisie exacte du nom, clic → CV réellement supprimé de la liste (compte de `<li>` passé de 2 à 1) ; renommage inline via `Enter` → nouveau nom affiché après re-render ; duplication via bouton → nouvelle carte « (copie) » apparue dans la liste ; export PDF depuis le dashboard → requête `GET /api/cvs/{id}/pdf` confirmée à 200 dans le journal réseau

**Problèmes rencontrés** :
- Aucun blocage. Les miniatures se régénèrent à chaque chargement du dashboard (pas de cache) : acceptable pour le nombre de CV attendu par utilisateur, mais à revisiter (`ponytail:` cache par `UpdatedAt` ou fichier stocké) si le nombre de CV par utilisateur devient important ou si la latence Playwright par miniature (~1s) devient gênante.

---

### Phase 3 — CV & stockage

**Statut** : Terminée

**Tâche** : `CvDocument`, mapping `ToJson()`, CRUD + contrôle de propriété, validation FluentValidation.

**Réalisé** :
- `Domain/CvDocument.cs` : `CvDocument` + tous les types possédés (`CvSettings`, `PersonalInfo`, `Experience`, `Project`, `EducationEntry`, `SkillCategory`, `LanguageEntry`, `Certification`) exactement selon le schéma de PLAN.md §4
- `Domain/Cv.cs` : entité racine (`Id`, `UserId`, `Name`, `Document`, `CreatedAt`, `UpdatedAt`)
- `Data/AppDbContext.cs` : `DbSet<Cv>` + mapping `OwnsOne(c => c.Document, d => { d.ToJson(); d.OwnsOne(...); d.OwnsMany(...); })` — **2 tables réelles seulement** (`Cvs` + tables Identity), le `CvDocument` entier est sérialisé dans la colonne `Document nvarchar(max)`. Index `(UserId, UpdatedAt)` pour la requête dashboard.
- `Data/CvAuthorization.cs` : helper unique `LoadOwnedCvAsync(userId, cvId)` — filtre `WHERE Id = @cvId AND UserId = @userId` **dans la requête**, jamais après coup. Utilisé par tous les endpoints CV.
- `Validation/CvDocumentValidator.cs` (FluentValidation) : `TemplateKey` parmi les 5 valeurs connues, couleurs hex `#RRGGBB`, `FontFamily`/`Spacing`/`CvLanguage` parmi les valeurs autorisées, `FontScale` dans `[0.85, 1.20]`, email `PersonalInfo.Email` valide si renseigné
- `Endpoints/CvEndpoints.cs` : `GET /api/cvs` (liste, projection sans `Document`), `POST /api/cvs`, `GET/PUT /api/cvs/{id}`, `PATCH /api/cvs/{id}/name`, `POST /api/cvs/{id}/duplicate` (copie profonde via round-trip JSON — un `CvDocument` possédé ne peut pas être suivi par deux `Cv` à la fois), `DELETE /api/cvs/{id}` — tous protégés par `RequireAuthorization()` + `LoadOwnedCvAsync`
- Migration `AddCvs` générée et appliquée (table `Cvs`, FK cascade vers `AspNetUsers`, index composite)

**Fichiers créés/modifiés** :
- `backend/CvForge.Api/Domain/{CvDocument.cs,Cv.cs}`
- `backend/CvForge.Api/Data/{AppDbContext.cs,CvAuthorization.cs}`
- `backend/CvForge.Api/Validation/CvDocumentValidator.cs`
- `backend/CvForge.Api/Endpoints/CvEndpoints.cs`
- `backend/CvForge.Api/Program.cs` (enregistrement `IValidator<CvDocument>`, `app.MapGroup("/api/cvs").MapCvEndpoints()`)
- `backend/CvForge.Api/Migrations/20260910132432_AddCvs.cs`

**Vérifications effectuées** :
- `dotnet build` → 0 erreur, 0 avertissement
- `dotnet ef migrations add AddCvs` puis `dotnet ef database update` → table `Cvs` créée, colonne `Document nvarchar(max)` unique confirmée dans le SQL généré
- Script de bout en bout (`node test-cv-crud.js`, 21 assertions, toutes passées) couvrant : création, liste (sans le document), lecture, mise à jour complète (persistance vérifiée), **rejet 400 sur couleur hex invalide**, renommage, duplication (id différent), **cross-user : utilisateur B lisant/supprimant un CV de A → 404 (jamais 403)**, requête sans token → 401, suppression puis re-lecture → 404

**Problèmes rencontrés** :
- Aucun blocage. Note : `dotnet ef migrations add` génère le dossier au niveau racine du projet (`CvForge.Api/Migrations/`) et non `CvForge.Api/Data/Migrations/` comme suggéré dans PLAN.md §8 — comportement par défaut de l'outil, sans configuration `--output-dir` ce serait un détail cosmétique ; laissé tel quel (pas de valeur à forcer un chemin non standard).

---

### Phase 10 — Assistant IA

**Statut** : Terminée (le mode dégradé — situation réelle de cet environnement, pas de clé API — est entièrement vérifié ; les appels réels au modèle n'ont **pas** pu être testés en conditions live, faute de `ANTHROPIC_API_KEY`)

**Tâche** : Les 4 endpoints (3 implémentés ici, `analyze` reporté en Phase 12 où vit l'analyseur ATS dont il dépend), mode dégradé, UI Accepter/Ignorer.

**Réalisé** :
- Package NuGet officiel **`Anthropic`** (v12.46.0) ajouté. Sa forme d'API publique n'étant pas documentée localement, elle a été découverte **par réflexion .NET** (petit projet jetable dans le scratchpad, chargeant l'assembly et listant constructeurs/propriétés/méthodes) plutôt que devinée — approche qui a payé : le code écrit dessus a compilé du premier coup
- `Services/AiService.cs` : `IsAvailable` (vrai seulement si `Anthropic:ApiKey` est configuré, lu une fois au démarrage), `ImproveTextAsync`, `GenerateBulletPointsAsync` (prompt demandant un tableau JSON, parsé avec repli sur le texte brut si le modèle ne respecte pas le format), `GenerateSummaryAsync` (contexte construit **uniquement** à partir des données déjà présentes dans le `CvDocument` — poste visé, expériences, compétences), `GenerateRecommendationsAsync` (prêt pour la Phase 12, transforme un résumé de règles déterministes en recommandations en langage naturel)
- **Garde-fou anti-invention appliqué aux 3 niveaux du plan** : prompt système strict (« N'ajoute jamais... »), chaque méthode ne transmet que le texte/les données à transformer, et côté frontend rien n'est écrit dans le CV sans clic explicite sur « Accepter »
- `Endpoints/AiEndpoints.cs` : `GET /api/ai/status` (`{ available }`, pour griser les boutons sans consommer de quota), `POST /api/ai/improve-text`, `POST /api/ai/bullet-points`, `POST /api/ai/summary` — tous renvoient **503** avec message explicite si `!ai.IsAvailable`
- **Rate limiting natif ASP.NET Core** (`AddRateLimiter`, fenêtre fixe 10 req/min, partitionné par `NameIdentifier` de l'utilisateur) appliqué au groupe `/api/ai` entier via `RequireRateLimiting`
- Frontend : `editor/ai.service.ts` (signal `available`, vérifié une fois par `checkAvailability()`), `editor/ai-suggestion.component.ts` (composant réutilisable : bouton → suggestion affichée à côté de l'original → **Accepter/Ignorer**, désactivé + tooltip si IA indisponible) — branché dans `sections/summary.section.ts` (reformuler / générer à partir du CV) et `sections/experiences.section.ts` (reformuler la description ; génération de réalisations avec sa propre UI accepter/ignorer en liste, car sa forme — plusieurs puces — ne correspond pas au composant générique à un seul texte)

**Fichiers créés/modifiés** :
- `backend/CvForge.Api/Services/AiService.cs`, `backend/CvForge.Api/Endpoints/AiEndpoints.cs`
- `backend/CvForge.Api/Program.cs` (`AiService` singleton, `AddRateLimiter`, `UseRateLimiter`, groupe `/api/ai`)
- `frontend/src/app/editor/{ai.service.ts,ai-suggestion.component.ts}`
- `frontend/src/app/editor/sections/{summary.section.ts,experiences.section.ts}` (intégration IA)

**Vérifications effectuées** :
- `dotnet build` → 0 erreur (validation indirecte que la forme de l'API du SDK découverte par réflexion est correcte) · `npm run build` → succès
- Script Node (`test-ai.js`, 7 assertions, toutes passées) : `GET /api/ai/status` → `{ available: false }` (cohérent avec l'absence de clé) ; les 3 endpoints IA → **503** avec message d'erreur explicite en mode dégradé ; **rate limiter déclenché** (429) en martelant `/api/ai/status` au-delà de 10 requêtes/minute
- **Navigateur** : bouton « ✨ Générer à partir du CV » dans la section Profil — **visuellement grisé** (`color: oklch(0.869 ...)`, gris clair), `disabled = true`, tooltip exact **« Configurez ANTHROPIC_API_KEY pour activer l'assistant IA »**, conforme mot pour mot à l'exigence de PLAN.md §7

**Problèmes rencontrés** :
- **Aucune vérification possible du chemin « succès »** (appel réel au modèle, reformulation effective, structured output des réalisations), faute de clé API dans cet environnement — situation attendue et anticipée par PLAN.md (mode dégradé prévu dès le contexte initial). Le code du chemin nominal a été écrit avec le plus grand soin (forme d'API confirmée par réflexion, pas par supposition) mais reste **non exécuté en conditions réelles**. **Action de suivi recommandée** : dès qu'une clé `Anthropic:ApiKey` est configurée (`dotnet user-secrets set`), retester les 3 endpoints en conditions réelles avant de considérer cette phase totalement close.
- `analyze` (le 4e endpoint listé dans le tableau IA de PLAN.md §7) est **volontairement reporté à la Phase 12**, qui construit l'`AtsAnalyzer` déterministe dont il dépend — cohérent avec le découpage des phases du plan lui-même (§11 sépare "Assistant IA" et "Analyse ATS").
- **Correctif apporté à ce fichier lui-même** : le titre de section « ### Phase 3 — CV & stockage » avait été accidentellement supprimé lors d'une édition précédente (le contenu détaillé de la Phase 3 était resté intact mais orphelin, rattaché par erreur à la fin de la section Phase 9). Repéré et corrigé en relisant la structure du fichier avant cet ajout. Toutes les sections suivantes seront désormais ajoutées en fin de fichier plutôt que par insertion avant un ancrage, pour éviter que ça ne se reproduise.

---

### Phase 11 — Import PDF/DOCX

**Statut** : Terminée (extraction réelle de texte **vérifiée avec de vrais fichiers** PDF et DOCX ; la structuration par l'IA reste non testable en conditions réelles, faute de clé API — même réserve qu'en Phase 10)

**Tâche** : Upload, extraction, structuration, écran de vérification.

**Réalisé** :
- Packages NuGet `UglyToad.PdfPig` (en prerelease, seule version disponible actuellement — `1.7.0-custom-5`) et `DocumentFormat.OpenXml`
- `Services/FileValidator.cs` : validation par **magic bytes** (`%PDF` / `PK..`), pas seulement l'extension — réutilisable telle quelle pour un futur upload de photo (Phase non planifiée explicitement, voir note plus bas), limites `MaxImportSizeBytes` (5 Mo) et `MaxPhotoSizeBytes` (2 Mo, prêt pour plus tard)
- `Services/ImportService.cs` : `ExtractTextFromPdf` (PdfPig, concatène le texte de chaque page), `ExtractTextFromDocx` (OpenXml, `Body.InnerText`), délègue la structuration à `AiService`
- `Services/AiService.cs` : nouvelle méthode `StructureCvFromTextAsync` — prompt décrivant précisément le schéma JSON attendu (miroir du `CvDocument`), consigne explicite de **ne rien inventer** (laisser vide plutôt qu'extrapoler), parse la réponse en `CvDocument` via `System.Text.Json` avec `CamelCase`
- `Endpoints/ImportEndpoints.cs` (`POST /api/import`, multipart) : validation taille (400 si > 5 Mo) → validation magic bytes selon l'extension déclarée → extraction (avec **try/catch dédié**, voir bug trouvé ci-dessous) → 503 si IA indisponible → structuration → renvoie le `CvDocument` **non persisté** (conforme PLAN.md §5 : `POST /api/import` ne sauvegarde rien)
- Même politique de rate limiting que `/api/ai` (`RequireRateLimiting`) appliquée au groupe `/api/import`, conformément à PLAN.md §5
- Frontend (`pages/dashboard/dashboard.ts`) : bouton « ⇪ Importer un CV (PDF/DOCX) » → `<input type="file">` caché → upload multipart → **le CV structuré est créé directement via `POST /api/cvs` puis on navigue vers l'éditeur**, qui sert d'écran de vérification champ par champ (chaque valeur importée est déjà éditable avec preview live) plutôt que de construire un écran de relecture séparé qui dupliquerait l'éditeur — simplification délibérée, documentée dans `CLAUDE.md`

**Fichiers créés/modifiés** :
- `backend/CvForge.Api/Services/{FileValidator.cs,ImportService.cs}`, `backend/CvForge.Api/Services/AiService.cs` (`StructureCvFromTextAsync`)
- `backend/CvForge.Api/Endpoints/ImportEndpoints.cs`
- `backend/CvForge.Api/Program.cs` (`ImportService` scoped, groupe `/api/import` avec rate limiting)
- `frontend/src/app/pages/dashboard/dashboard.ts` (bouton import, `onFileSelected`)

**Vérifications effectuées** :
- `dotnet build` → 0 erreur
- Script Node (`test-import.js`) avec de **vrais fichiers** :
  - **PDF réel** (le PDF généré et vérifié en Phase 8, contenant « Amine Ouni », « Backend Developer · Sopra Steria ») → texte extrait avec succès par PdfPig → **503** (IA indisponible) avec message explicite — confirme que l'extraction elle-même fonctionne, seule l'étape IA est bloquée comme attendu
  - **DOCX réel** (généré via le SDK OpenXml lui-même pour garantir un fichier valide — voir bug ci-dessous) → texte extrait avec succès → même 503 attendu
  - Fichier avec extension usurpée (contenu DOCX renommé `.pdf`) → **400**, rejeté par la vérification des magic bytes
  - Fichier de 6 Mo → **400** « Fichier trop volumineux »
- **Navigateur** : bouton d'import déclenche bien un `<input type="file">`, upload réel testé via injection `DataTransfer` (contournement du sélecteur de fichiers natif, non pilotable par automatisation) ; message d'erreur backend (« Fichier illisible ou corrompu. ») correctement remonté et affiché tel quel dans l'UI

**Problèmes rencontrés (2 bugs réels trouvés et corrigés pendant la vérification)** :
1. **PDF corrompu → 500 brut au lieu d'une erreur propre.** En testant avec un PDF volontairement malformé (pour vérifier la robustesse), `UglyToad.PdfPig.PdfDocument.Open` a levé une `PdfDocumentFormatException` non interceptée, remontée telle quelle en 500 par ASP.NET Core. Un fichier envoyé par un utilisateur peut très bien avoir les bons magic bytes (`%PDF`) tout en étant interne­ment corrompu. **Corrigé** : `try/catch` autour de l'extraction dans `ImportEndpoints.cs`, renvoie désormais un **400 « Fichier illisible ou corrompu. »** propre. Reproduit dans le navigateur avant et après le correctif pour confirmer.
2. **Faux négatif dans mon propre test, pas dans le code applicatif.** Un premier fichier `.docx` de test avait été fabriqué à la main (dossier de fichiers XML zippé via PowerShell `Compress-Archive`) pour tester l'extraction — `System.IO.Packaging` le lisait comme un paquet **totalement vide** (0 relation, 0 partie), donc `ExtractTextFromDocx` renvoyait un texte vide à juste titre. Diagnostiqué en inspectant le paquet bas niveau (`System.IO.Packaging.Package.Open`), puis confirmé en regénérant le fichier de test **via le SDK OpenXml lui-même** (`WordprocessingDocument.Create`), qui a fonctionné du premier coup. Le code de `ImportService.ExtractTextFromDocx` n'avait pas de bug — leçon retenue : pour tester l'extraction d'un format de fichier structuré, générer le fichier de test avec la même bibliothèque que celle utilisée pour l'écrire ailleurs, pas en zippant des fichiers à la main.
- **Écart assumé avec le wireframe de PLAN.md §9** : pas d'écran de vérification dédié séparé — l'éditeur, déjà entièrement champ-par-champ avec preview live (Phases 4/5), remplit ce rôle. Documenté dans `CLAUDE.md` pour que ce ne soit pas lu comme un oubli.
- **`FileValidator.MaxPhotoSizeBytes` est défini mais non encore utilisé** : l'upload de photo (`POST/DELETE /api/cvs/{id}/photo`, listé dans le tableau API de PLAN.md §5) n'est mentionné dans aucune des 14 phases de PLAN.md §11 — écart entre le tableau d'API et le plan de développement phase par phase. Non implémenté, car hors du périmètre explicite des 14 phases demandées ; à signaler à l'utilisateur en fin d'exécution.

---

### Phase 12 — Analyse ATS

**Statut** : Terminée

**Tâche** : Scores déterministes + recommandations, panneau de résultats.

**Réalisé** :
- `Services/AtsAnalyzer.cs` : scoring **100 % C# déterministe**, aucun appel IA — reproductible et explicable comme exigé par PLAN.md §7. Règles implémentées : photo absente (pénalité si présente), mise en page une colonne (pénalité si `templateKey == "executive"`, seul template deux-colonnes), sections essentielles (expériences/formation/compétences) non masquées, dates cohérentes (format `YYYY-MM` + `endDate ≥ startDate`), contact complet (email + téléphone), ratio de réalisations quantifiées (contenant un chiffre). 4 scores (`AtsScore` structurel, `ContentScore` complétude du contenu, `TechnicalSkillsScore` volume de compétences, `ExperienceScore` nombre d'expériences + qualité quantifiée) + `OverallScore` (moyenne des 4)
- `Endpoints/AiEndpoints.cs` : `POST /api/ai/analyze` — **les scores sont toujours calculés** (jamais de 503, contrairement aux 3 autres endpoints IA) ; seules les **recommandations en langage naturel** dépendent de l'IA. Si IA disponible → `AiService.GenerateRecommendationsAsync` transforme le résumé des règles en texte ; **si IA indisponible → repli sur les messages bruts des règles échouées** (pas d'IA nécessaire pour obtenir des recommandations utilisables) — extension délibérée au-delà de la lettre de PLAN.md §7 (qui semblait lier les recommandations à l'IA), dans l'esprit du mode dégradé appliqué partout ailleurs dans le projet
- Frontend `editor/ats-panel.component.ts` : bouton « ✨ Analyser mon CV » → appelle `/api/ai/analyze` avec le document courant → affiche les 5 scores (couleur rouge/orange/vert selon le seuil) + liste de recommandations
- Nouvel onglet « ✨ Analyse » dans `pages/editor/editor.ts` (aux côtés de Contenu et Template & Design)

**Fichiers créés/modifiés** :
- `backend/CvForge.Api/Services/AtsAnalyzer.cs`
- `backend/CvForge.Api/Endpoints/AiEndpoints.cs` (`POST /api/ai/analyze`)
- `frontend/src/app/editor/ats-panel.component.ts`
- `frontend/src/app/pages/editor/editor.ts` (onglet Analyse)

**Vérifications effectuées** :
- `dotnet build` → 0 erreur · `npm run build` → succès
- Script Node (`test-ats.js`) contre l'API réelle, deux exécutions indépendantes :
  - **CV vide** → `{ats:85, content:0, tech:0, exp:0, overall:21}` — seule la pénalité « contact incomplet » s'applique (100-15=85), car un CV vide sans photo, sans section masquée et sans dates à vérifier reste structurellement « propre » pour un ATS (le score de contenu, séparément à 0, capture bien le manque de substance)
  - **CV complet et bien rempli** → `{ats:100, content:100, tech:80, exp:50, overall:82}`, score global supérieur au CV vide
  - **Déterminisme confirmé à deux niveaux** : deux appels avec le même document dans le même run renvoient un JSON strictement identique ; **et** les deux exécutions indépendantes du script (lancées séparément) ont produit exactement les mêmes scores pour les mêmes CV — pas de hasard, pas de dépendance à un LLM
  - **Pénalités vérifiées individuellement** : ajout d'une photo → `atsScore` 100→80 ; passage au template `executive` (deux colonnes) → 100→80 ; masquage de la section Expériences → 100→85
  - **Mode dégradé** : `recommendations` non vide même sans clé API (repli sur les règles échouées, ex. « Email ou téléphone manquant. »)
  - Le **rate limiter partagé `/api/ai`** (10 req/min) a été redéclenché par les exécutions répétées de ce script de test lui-même — confirmation incidente supplémentaire, indépendante du test initial de la Phase 10, que la limite s'applique bien et de façon cohérente à `/api/ai/analyze`

**Problèmes rencontrés** :
- Aucun blocage applicatif. Le rate limiter a interrompu une relance de vérification (comportement attendu, pas un bug) — contourné en espaçant les appels plutôt qu'en désactivant la protection.

---

### Phase 13 — Tests & sécurité

**Statut** : Terminée

**Tâche** : xUnit (autorisation, CRUD, ATS, validation fichiers), Vitest (store, templates), passe de durcissement.

**Réalisé** :
- **`backend/CvForge.Tests`** (nouveau projet xUnit, ajouté à la solution) :
  - `Infrastructure/CvForgeWebApplicationFactory.cs` : fait tourner **l'application réelle** (pas de mocks) contre une **base SQL Server dédiée `CvForgeTests`**, séparée de la base de dev `CvForge`, sur la même instance locale déjà en service — migrations appliquées automatiquement (`Database.MigrateAsync()`)
  - `Infrastructure/DatabaseFixture.cs` : fixture de collection xUnit (`ICollectionFixture`) pour que la migration ne s'exécute **qu'une seule fois** pour toute la suite, pas par classe de test
  - `Infrastructure/TestUser.cs` : helper — inscrit et connecte un utilisateur unique (email GUID) par test, renvoie un `HttpClient` déjà authentifié Bearer
  - `Program.cs` (API) rendu accessible aux tests via `public partial class Program {}` en fin de fichier (nécessaire pour `WebApplicationFactory<Program>` avec des top-level statements)
  - `AuthorizationTests.cs` (**le plus critique**, désigné comme tel par PLAN.md §8) : 6 tests — lecture/modification/suppression/renommage d'un CV d'autrui → **404 partout, jamais 403** ; suppression par un tiers échoue et le CV survit bien côté propriétaire ; la liste d'un utilisateur ne contient jamais les CV d'un autre ; tout endpoint `/api/cvs` sans jeton → 401
  - `CvCrudTests.cs` : 8 tests — cycle de vie complet (créer/lire/mettre à jour/renommer/dupliquer/supprimer), validation FluentValidation rejetée (couleur hex invalide → 400), la liste ne contient jamais le document complet
  - `AtsAnalyzerTests.cs` : 9 tests **unitaires purs** (pas de HTTP ni de DB, appel direct à `AtsAnalyzer.Analyze`) — déterminisme, chaque pénalité individuellement (photo, template multi-colonnes, section masquée, dates incohérentes, contact manquant), toutes les notes dans `[0, 100]`
  - `FileValidatorTests.cs` : 7 tests unitaires purs — détection des magic bytes PDF/ZIP, rejet du texte brut, non-consommation de la position du flux, flux vide/trop court
- **Frontend (Vitest)** :
  - `templates/format-month.spec.ts` : 8 tests purs (FR/EN, `null`/`undefined`/vide, bornes janvier/décembre, mois hors plage)
  - `editor/cv-store.spec.ts` : 5 tests avec `HttpTestingController` — `load()` peuple les signals, `update()` mute **immutablement** (nouvelle référence, l'ancien objet reste inchangé), `saveNow()` court-circuite le debounce et déclenche un `PUT` immédiat, un échec réseau met `saveState` à `'error'`, `update()` avant tout `load()` ne plante pas
  - `templates/modern/modern-template.component.spec.ts` : 4 tests — rendu des informations personnelles, exclusion de `personalInfo` de `visibleSections()` même si listé par erreur dans `sectionOrder`, masquage effectif d'une section listée dans `hiddenSections`
- **Passe de durcissement** (relecture ciblée contre la checklist de PLAN.md §10, un point à la fois) :
  - XSS : `grep -ri "innerHTML\|bypassSecurityTrust"` sur tout `frontend/src` → **aucune occurrence**, confirme qu'aucune donnée de CV n'est jamais injectée en HTML brut (Angular échappe par défaut partout, y compris `/print`)
  - Injection SQL : `grep` sur `FromSqlRaw`/`ExecuteSqlRaw` → **aucune occurrence**, tout accès passe par LINQ/EF Core paramétré
  - CORS : `grep` sur `AllowAnyOrigin` → **aucune occurrence**, la policy `Frontend` reste restreinte à `http://localhost:4200`
  - Secrets : `appsettings.json`/`appsettings.Development.json` inspectés — aucune clé, chaîne de connexion en authentification Windows intégrée (`Trusted_Connection=True`, pas de mot de passe), `Anthropic:ApiKey` jamais présent dans un fichier suivi par git (uniquement via `dotnet user-secrets`, stocké hors du dépôt)
  - Route `/print/:id` : re-vérifiée pour confirmer qu'un utilisateur connecté naviguant directement dessus (sans passer par Playwright) retombe sur le `GET /api/cvs/{id}` **normal, authentifié et filtré par propriétaire** — aucune fuite cross-utilisateur possible par ce chemin

**Fichiers créés/modifiés** :
- `backend/CvForge.Tests/**` (nouveau projet complet)
- `backend/CvForge.Api/Program.cs` (`public partial class Program`)
- `backend/CvForge.slnx` (ajout du projet de tests)
- `frontend/src/app/templates/format-month.spec.ts`
- `frontend/src/app/editor/cv-store.spec.ts`
- `frontend/src/app/templates/modern/modern-template.component.spec.ts`

**Vérifications effectuées** :
- `dotnet build backend/CvForge.slnx` → 0 erreur (3 projets : Api, Tests, + implicite Api référencé)
- **`dotnet test backend/CvForge.Tests` → 31/31 tests réussis**, contre une vraie base SQL Server (`CvForgeTests`) créée et migrée automatiquement — confirmé distincte de la base de dev `CvForge` via `sqlcmd` (`SELECT name FROM sys.databases WHERE name LIKE 'CvForge%'` → les deux bases listées séparément)
- **`npm test -- --watch=false` → 18/18 tests réussis** (1 test d'origine + 17 nouveaux)
- **Total : 49 tests automatisés, tous verts**, s'ajoutant aux vérifications manuelles (scripts Node + navigateur) déjà réalisées phase par phase
- Passe de durcissement : chaque point de la checklist PLAN.md §10 vérifié explicitement (résultats ci-dessus), aucun écart trouvé nécessitant une correction

**Problèmes rencontrés** :
- Aucun bug trouvé pendant cette phase (contrairement aux Phases 11 et 4/5 où la vérification avait révélé de vrais bugs) — cohérent avec le fait que chaque phase précédente avait déjà été vérifiée en profondeur au moment de son implémentation ; cette phase a surtout consisté à **formaliser** ces vérifications en suite automatisée reproductible, plutôt qu'à découvrir de nouveaux problèmes.
- `dotnet test` nécessite que le processus `CvForge.Api.exe` en arrière-plan soit arrêté au préalable (même contrainte de verrou de fichier Windows que `dotnet build`, déjà documentée en Phase 2) — sans impact ici car aucun processus ne tournait au moment du premier `dotnet test`.

---

### Phase 14 — UX/UI

**Statut** : Terminée

**Tâche** : Skeletons, toasts, états vides, animations, landing page complète, responsive final.

**Réalisé** :
- **`core/toast.service.ts` + `ui/toast.ts`** : système de notifications global (succès/erreur, auto-disparition à 3,5 s, fermeture manuelle). `ToastHost` monté une fois dans `app.ts` (racine), visible sur toutes les pages. Branché sur : suppression de CV, duplication de CV, échec de génération PDF (dashboard **et** éditeur) — les retours déjà existants et qui fonctionnaient bien (message inline « Profil mis à jour. », erreur d'import) ont été laissés tels quels plutôt que remplacés sans raison
- **`ui/skeleton.ts`** : composant minimal (`animate-pulse` Tailwind) réutilisé pour : la grille du dashboard pendant le premier chargement de la liste des CV, chaque miniature tant qu'elle n'est pas encore chargée (remplace le texte « ... » de la Phase 9), le panneau gauche et l'aperçu de l'éditeur pendant `store.loading()` (remplace le texte « Chargement... »)
- **État vide amélioré** du dashboard : passage d'un simple texte à un bloc dédié (bordure pointillée, message principal + sous-texte d'invitation à créer ou importer un CV)
- **Animations légères** : `transition-colors` sur les boutons interactifs (dashboard, landing), `transition-shadow` au survol des cartes CV, keyframe `fade-in` pour l'apparition des toasts — aucune animation intrusive, juste des transitions d'état déjà présentes dans Tailwind
- **`pages/landing/landing.ts`** (nouvelle page, remplace la redirection directe `'' → /login`) : en-tête avec bascule de langue FR/EN et lien de connexion, section hero (titre, sous-titre, deux CTA « Commencer gratuitement » / « Se connecter »), 4 cartes de fonctionnalités (preview temps réel, 5 templates, export PDF fidèle, assistant IA), pied de page. Entièrement bilingue via `I18nService`/`TPipe` — nouvelles clés `landing.*` ajoutées à `locales/fr.ts` et `locales/en.ts`
- **Responsive final vérifié** : landing page testée en 375×812 (mobile) — CTA empilés verticalement, cartes de fonctionnalités en une colonne, aucun débordement horizontal ; dashboard testé en mobile — grille en une colonne (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, déjà en place depuis la Phase 9, confirmé fonctionnel) ; bascule Éditer/Voir de l'éditeur (déjà construite en Phase 4/5) non retouchée et donc non re-cassée

**Fichiers créés/modifiés** :
- `frontend/src/app/core/toast.service.ts`, `frontend/src/app/ui/{toast.ts,skeleton.ts}`
- `frontend/src/app/app.ts` (montage de `ToastHost`)
- `frontend/src/app/pages/landing/landing.ts` (nouveau), `frontend/src/app/app.routes.ts` (route `''` → Landing au lieu d'une redirection vers `/login`)
- `frontend/src/app/core/locales/{fr.ts,en.ts}` (clés `landing.*`)
- `frontend/src/app/pages/dashboard/dashboard.ts` (skeletons, état vide, toasts, transitions)
- `frontend/src/app/pages/editor/editor.ts` (skeleton de chargement, toast sur échec PDF)

**Vérifications effectuées** :
- `npm run build` (production) → succès, nouveau chunk lazy `landing` (3,34 Ko)
- `npm test -- --watch=false` → 18/18 tests toujours au vert (aucune régression introduite par les changements UI)
- **Navigateur, bout en bout** :
  - Landing page chargée sur `/` → titre, sous-titre et 4 cartes de fonctionnalités affichés ; bascule EN → titre change bien en anglais (« Build a professional CV in minutes ») ; retour FR confirmé
  - **Vue mobile (375×812)** : landing page — capture d'écran confirmant CTA empilés et cartes en une colonne, aucun débordement ; dashboard — grille en une colonne confirmée (`document.querySelectorAll('li').length === 1`, une carte réelle malgré un artefact visuel de la capture d'écran donnant l'illusion d'un quadrillage 2×2)
  - **Toast** : duplication d'un CV → toast « CV dupliqué. » apparu immédiatement, **disparu automatiquement après le délai** (vérifié par un second contrôle 3 s plus tard : élément absent du DOM)
  - Nettoyage post-test : CV dupliqué supprimé pour laisser l'état propre pour d'éventuelles vérifications futures

**Vérifications de régression finale (toute la session)** :
- `dotnet build backend/CvForge.slnx` → 0 erreur
- `dotnet test backend/CvForge.Tests` → **31/31 tests réussis**
- `npm test --prefix frontend -- --watch=false` → **18/18 tests réussis**
- Aucune régression détectée sur l'ensemble des 14 phases après les changements de cette dernière phase

**Problèmes rencontrés** :
- Aucun. Cette phase n'a modifié que des aspects visuels/UX sans toucher à la logique métier déjà testée ; les 49 tests automatisés (Phase 13) ont servi de filet de sécurité pour confirmer l'absence de régression.
