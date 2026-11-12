# CvForge

Générateur de CV pour profils IT — voir [PLAN.md](PLAN.md) pour la spec complète et [CLAUDE.md](CLAUDE.md) pour l'architecture.

## Prérequis

- .NET SDK 10+
- Node.js 24+ / npm 11+
- SQL Server (instance locale, ex. `MSSQLSERVER`)

## Démarrage

Deux terminaux :

```bash
dotnet watch --project backend/CvForge.Api     # https://localhost:7158, http://localhost:5145
npm start --prefix frontend                    # http://localhost:4200
```

## Base de données

```bash
dotnet ef database update --project backend/CvForge.Api
```

Chaîne de connexion (dev, `appsettings.Development.json`) :
```
Server=localhost;Database=CvForge;Trusted_Connection=True;TrustServerCertificate=True
```

## Secrets

Aucun secret dans le dépôt — envoi d'emails réels (Gmail SMTP, mot de passe d'application) via .NET User Secrets :

```bash
dotnet user-secrets set "Smtp:User" "you@gmail.com" --project backend/CvForge.Api
dotnet user-secrets set "Smtp:AppPassword" "..." --project backend/CvForge.Api
```

Sans ces secrets, les emails (codes de confirmation, réinitialisation…) sont seulement écrits dans les logs.

## Application de bureau

```bash
powershell -ExecutionPolicy Bypass -File publish.ps1
```

Construit le front, publie l'API dans `%USERPROFILE%\CvForge\app` (le build Angular est servi par l'API depuis `wwwroot`) et crée le raccourci **CvForge** sur le Bureau. Un clic lance l'app sur http://localhost:5290 et ouvre le navigateur ; la console démarre réduite, la fermer arrête l'app. Si l'app tourne déjà, le raccourci ouvre juste le navigateur dessus.

- **Prérequis** : SQL Server démarré, runtime ASP.NET Core 10, Chromium de Playwright installé (déjà le cas en dev, nécessaire aux exports PDF/HTML).
- **Réglages** : port et ouverture du navigateur dans `backend/CvForge.Api/appsettings.Production.json`. Même base `CvForge` que le dev ; le port 5290 diffère du dev (5145/4200), les deux peuvent tourner en même temps.
- **Mise à jour** : relancer `publish.ps1` après une modification du code (il arrête l'app publiée, la reconstruit et garde le raccourci).
- **Connexion** : l'adresse étant différente de celle du dev, il faut se connecter une première fois.

## Tests

```bash
dotnet test backend/CvForge.Tests
npm test --prefix frontend
```
