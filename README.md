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

Aucun secret dans le dépôt — clé Anthropic via .NET User Secrets :

```bash
dotnet user-secrets init --project backend/CvForge.Api
dotnet user-secrets set "Anthropic:ApiKey" "sk-ant-..." --project backend/CvForge.Api
```

Sans clé configurée, les fonctionnalités IA fonctionnent en mode dégradé (voir CLAUDE.md).

## Tests

```bash
dotnet test backend/CvForge.Tests
npm test --prefix frontend
```
