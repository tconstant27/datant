# Datant · Nexus Data

Outil d'analyse de données League of Legends pour notre équipe Nexus Tour :
suivi de la progression des joueurs, scouting des adversaires et préparation des drafts,
avec en priorité les stats des parties perso (scrims et officiels).

## Architecture prévue

| Brique | Techno | Rôle |
| --- | --- | --- |
| Site | React + Vite + Tailwind | Interface pour le coach et les joueurs |
| Base et comptes | Supabase | Stockage des parties, accès réservé à l'équipe |
| API Riot | Fonctions Supabase | SoloQ des joueurs et des adversaires (clé côté serveur) |
| Collecteur | App Windows (Tauri) | Récupère les parties perso depuis le client LoL |
| Hébergement | Vercel | Mise en ligne du site |

## Avancement

- [x] Étape 1 : base du projet (navigation, style, pages vides)
- [ ] Étape 2 : import SoloQ et fiches joueurs
- [ ] Étape 3 : vue équipe
- [ ] Étape 4 : collecteur de parties perso
- [ ] Étape 5 : scouting et draft

## Lancer le site en local

Prérequis : [Node.js](https://nodejs.org) 20 ou plus.

```bash
npm install
cp .env.example .env   # puis remplis les valeurs
npm run dev
```

Le site s'ouvre sur http://localhost:5173.

## Secrets

Les clés (Riot, Supabase) vont dans `.env`, qui n'est **jamais** envoyé sur GitHub.
La clé Riot ne doit jamais commencer par `VITE_` : tout ce qui commence par `VITE_` est visible dans le navigateur.
