# ⚡ Ampero — Checklist & Feuille de Route (TODO)

Ce fichier regroupe l'ensemble des tâches opérationnelles, techniques et communautaires pour le lancement et la croissance d'**Ampero**.

---

## 🎯 1. Canaux Communautaires & Réseaux Sociaux (Action Immédiate)

Ces plateformes nécessitent une vérification humaine (téléphone SMS, Captcha) et doivent être créées manuellement :

- [ ] **𝕏 (Twitter) — `@amperodev`**
  - **Identifiant :** `@amperodev` *(alternative si indisponible : `@ampero_ai` ou `@amperonetwork`)*
  - **Nom du profil :** `Ampero ⚡`
  - **Bio :**
    > The open marketplace where autonomous AI agents pay for micro-compute and creators earn sats. Powered by L402 & Bitcoin Lightning ⚡  
    > 🌐 https://ampero.ampero-dev.workers.dev
  - **Site web dans le profil :** `https://ampero.ampero-dev.workers.dev`
  - **Launch Tweet prêt à publier :**
    ```text
    Introducing Ampero ⚡

    Autonomous AI agents need a native currency to pay for tools, specialized models, and micro-APIs. 
    Credit cards don't work for bots. Bitcoin Lightning does.

    🔹 Pay-per-call via L402
    🔹 Instant sats payout for AI tool builders
    🔹 0 KYC, 0 friction

    Try it live: https://ampero.ampero-dev.workers.dev
    #AI #Bitcoin #LightningNetwork #L402 #BuildInPublic
    ```

- [ ] **Telegram — `t.me/amperodev`**
  - **Type :** Canal d'annonces + Groupe de discussion public lié
  - **Nom du canal :** `Ampero Community ⚡`
  - **Lien public :** `t.me/amperodev`
  - **Description :**
    > Official community for Ampero: Decentralized micropayments for AI agents and model creators over Bitcoin Lightning.
    > 
    > 💻 Website: https://ampero.ampero-dev.workers.dev  
    > 🐙 GitHub: https://github.com/amperodev/ampero
  - **Message d'accueil épinglé :**
    ```text
    ⚡ Welcome to Ampero!

    Ampero connects AI agent operators and machine learning builders through Bitcoin Lightning micropayments (L402).

    📌 Useful links:
    • Live Playground: https://ampero.ampero-dev.workers.dev
    • Tools Registry: https://ampero.ampero-dev.workers.dev/catalogue
    • Documentation & FAQ: https://ampero.ampero-dev.workers.dev/#faq
    • GitHub: https://github.com/amperodev/ampero

    💬 Feel free to ask questions, showcase your AI tools, or report issues!
    ```
  - **Bot recommandé :** Ajouter `@MissRose_bot` ou `@Combot` pour filtrer le spam et souhaiter la bienvenue.

- [ ] **Discord — Serveur Développeur Ampero**
  - **Nom du serveur :** `Ampero ⚡ AI & Lightning`
  - **Lien d'invitation :** Configurer une invitation permanente sans expiration (viser `discord.gg/ampero`).
  - **Arborescence des salons recommandée :**
    - 📢 **INFORMATIONS**
      - `#rules` *(règles anti-spam et bon sens)*
      - `#announcements` *(mises à jour, nouveaux outils référencés)*
      - `#links` *(site, catalogue, repo, documentation)*
    - 💬 **COMMUNITY**
      - `#general` *(échanges généraux)*
      - `#showcase` *(démos d'outils, agents et prompts)*
    - 🛠️ **DEVELOPERS**
      - `#l402-dev` *(implémentation Macaroons, HTTP 402, LSAT)*
      - `#tool-providers` *(aide pour publier et monétiser un outil/modèle)*
      - `#agent-builders` *(LangChain, CrewAI, AutoGPT, MCP)*
    - ⚡ **BITCOIN & LIGHTNING**
      - `#node-runners` *(LND, Phoenixd, Alby, Core Lightning)*

---

## 📬 2. Contact & Support Développeurs

- [ ] **Configurer l'adresse courriel `contact@ampero.dev`**
  - *Astuce 100% gratuite avec Cloudflare :* Utiliser **Cloudflare Email Routing** sur le domaine `ampero.dev` pour transférer automatiquement tous les e-mails arrivant sur `contact@ampero.dev` vers votre adresse personnelle (Gmail, Proton, etc.) sans payer d'hébergement e-mail.
- [ ] **Surveiller les retours utilisateurs** : Tester le bouton contact en direct sur la page d'accueil (`#contact`).

---

## 🌐 3. Infrastructure & Déploiement

- [x] **Architecture Cloudflare Worker Edge (bLIP-0004 / L402)**
- [x] **Catalogue public d'outils MCP (`/catalogue`)**
- [x] **Importateur automatique Hugging Face (`/api/registry/import-huggingface`)**
- [x] **4 Pages d'audience ciblées (`/monetize-huggingface`, `/monetize-tools`, `/save-tokens`, `/lightning-ai`)**
- [x] **Fichier standard pour agents IA (`/llms.txt`)**
- [x] **Section FAQ interactive (`#faq`)**
- [x] **Bouton & Section Contact (`#contact`)**
- [ ] **Lier un domaine personnalisé :** Pointer `ampero.dev` sur le Worker Cloudflare via le dashboard Cloudflare.
- [ ] **Connecter un nœud Lightning de production :**
  - Configurer `LN_BACKEND` (ex: LND via REST, Phoenixd, ou Alby Hub NWC) dans les secrets Cloudflare (`npx wrangler secret put LN_MACAROON`, etc.).

---

## 🚀 4. Acquisition & Référencement (Go-To-Market)

- [ ] **Publication sur Hacker News (Show HN) :**
  - Titre suggéré : *Show HN: Ampero – Pay-per-call AI compute marketplace using L402 & Lightning*
- [ ] **Product Hunt Launch :**
  - Préparer les visuels du simulateur et la vidéo de démonstration.
- [ ] **Soumission aux répertoires d'agents et de MCP :**
  - Soumettre aux listes GitHub `awesome-mcp-servers` et aux répertoires d'agents autonomes.
- [ ] **Partager sur Twitter / X :**
  - Identifier les comptes pertinents de l'écosystème : `@getAlby`, `@Lightning`, `@huggingface`, `@AnthropicAI`.
