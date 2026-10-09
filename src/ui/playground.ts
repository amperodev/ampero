/**
 * Générateur de l'interface HTML/Tailwind pour le Playground et Showcase MCP L402.
 * Servie directement à l'Edge par le Cloudflare Worker sur GET /.
 */

export interface PlaygroundToolInfo {
  name: string;
  description: string;
  priceSats: number;
  endpoint: string;
}

export function renderPlaygroundHtml(tools: PlaygroundToolInfo[], envInfo: { lightningAddress: string }): string {
  const toolsJson = JSON.stringify(tools);

  return `<!DOCTYPE html>
<html lang="fr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ampero • Passerelle M2M & Showcase MCP</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#fffbeb',
              500: '#f59e0b',
              600: '#d97706',
              700: '#b45309'
            },
            lightning: '#f7931a',
            surface: {
              800: '#181b20',
              900: '#111317',
              950: '#0b0d10'
            }
          }
        }
      }
    }
  </script>
  <style>
    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .pulse-subtle { animation: pulse-subtle 2s infinite ease-in-out; }
  </style>
</head>
<body class="bg-surface-950 text-slate-100 min-h-screen font-sans antialiased selection:bg-lightning selection:text-black">

  <!-- Entête de navigation -->
  <header class="border-b border-surface-800 bg-surface-900/80 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-lightning to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <span class="text-xl font-black text-black">⚡</span>
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Ampero <span class="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono font-medium border border-amber-500/30">M2M Gateway</span>
          </h1>
          <p class="text-xs text-slate-400">Micro-paiements autonomes pour Model Context Protocol (MCP)</p>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          Edge Cloudflare Actif
        </span>
        <a href="#playground" class="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-lightning hover:bg-amber-400 text-black transition-all shadow-md shadow-amber-500/10">
          Tester le Simulateur
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">

    <!-- Section Hero -->
    <section class="text-center space-y-6 pt-6 pb-2">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-surface-800/80 border border-surface-800 text-xs font-mono text-amber-400 mb-2">
        <span>⚡ HTTP 402 + Macaroons + Bitcoin Lightning</span>
      </div>
      <h2 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
        L'infrastructure de micro-paiement native pour <span class="bg-gradient-to-r from-lightning via-amber-400 to-amber-200 bg-clip-text text-transparent">agents d'IA autonomes</span>
      </h2>
      <p class="text-xl font-semibold text-amber-300 max-w-2xl mx-auto">
        ⚡ Soyez payé pendant que vos outils MCP travaillent pour vous.
      </p>
      <p class="text-base text-slate-400 max-w-2xl mx-auto">
        Rémunérez vos outils de machine à machine au centième de centime, sans compte bancaire, sans carte de crédit, sans KYC et sans abonnement fixe.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
        <div class="flex items-center gap-2 text-xs text-slate-400 bg-surface-900 px-4 py-2 rounded-xl border border-surface-800">
          <span class="text-emerald-400 font-bold">✓</span> 100% Non-Custodial
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-400 bg-surface-900 px-4 py-2 rounded-xl border border-surface-800">
          <span class="text-emerald-400 font-bold">✓</span> Commission Split Atomique
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-400 bg-surface-900 px-4 py-2 rounded-xl border border-surface-800">
          <span class="text-emerald-400 font-bold">✓</span> Zéro friction Lightning Address
        </div>
      </div>
    </section>

    <!-- Section 1 : Simulateur Interactif L402 (Playground) -->
    <section id="playground" class="scroll-mt-24 space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-2xl font-bold text-white flex items-center gap-2">
            <span>🧪</span> Simulateur M2M Interactif
          </h3>
          <p class="text-sm text-slate-400">Observez le cycle complet du péage HTTP 402 en temps réel.</p>
        </div>
        <span id="webln-status" class="text-xs px-3 py-1.5 rounded-xl bg-surface-800 border border-surface-800 text-slate-400">
          Recherche WebLN (Alby)...
        </span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Panneau de contrôle -->
        <div class="lg:col-span-5 bg-surface-900 border border-surface-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div class="space-y-4">
            <label class="block text-sm font-semibold text-slate-200">1. Choisir un outil MCP à exécuter</label>
            <div class="space-y-2" id="tool-selector-container">
              <!-- Rempli dynamiquement -->
            </div>
          </div>

          <div class="space-y-4" id="tool-params-container">
            <label for="input-url" class="block text-sm font-semibold text-slate-200">2. Paramètres de la requête</label>
            <input type="url" id="input-url" value="https://bitcoin.org" class="w-full px-4 py-2.5 rounded-xl bg-surface-950 border border-surface-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono" placeholder="https://example.com" />
            <p class="text-xs text-slate-400">L'outil extraira le contenu assaini et converti en Markdown pour LLM.</p>
          </div>

          <button id="btn-trigger" class="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-lightning to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
            <span>🚀</span> Déclencher l'appel Machine-to-Machine
          </button>

          <!-- Zone de paiement dynamique -->
          <div id="payment-box" class="hidden p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span class="text-base">⚡</span> Défi 402 Reçu
              </span>
              <span id="challenge-cost" class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">
                5 sats
              </span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">
              Le serveur a retourné <code class="text-amber-400 font-mono font-bold">HTTP 402 Payment Required</code> avec un Macaroon et une facture Lightning.
            </p>
            <div class="space-y-2">
              <button id="btn-pay-webln" class="w-full py-2.5 px-4 rounded-xl bg-lightning hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all">
                <span>⚡</span> Payer instantanément avec Alby (WebLN)
              </button>
              <button id="btn-mock-pay" class="w-full py-2 px-4 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 font-medium text-xs border border-surface-800 flex items-center justify-center gap-1.5">
                <span>🤖</span> Simuler le règlement autonome par NWC (Démo)
              </button>
            </div>
          </div>
        </div>

        <!-- Terminal en direct -->
        <div class="lg:col-span-7 bg-surface-950 border border-surface-800 rounded-2xl p-6 font-mono text-xs flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-surface-800 pb-3">
              <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
                <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
                <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                <span class="text-slate-400 ml-2 font-sans font-semibold">Console M2M en direct</span>
              </div>
              <span id="status-badge" class="px-2 py-0.5 rounded bg-surface-800 text-slate-400">En attente</span>
            </div>

            <div id="console-logs" class="space-y-2 max-h-96 overflow-y-auto pr-2 text-slate-300">
              <div class="text-slate-400">// Cliquez sur "Déclencher l'appel Machine-to-Machine" pour démarrer l'échange L402.</div>
            </div>
          </div>

          <div id="result-preview" class="hidden mt-4 pt-4 border-t border-surface-800">
            <span class="text-xs font-sans font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
              <span>✓</span> Données débloquées avec succès (HTTP 200)
            </span>
            <pre id="result-content" class="p-4 rounded-xl bg-surface-900 border border-surface-800 max-h-52 overflow-y-auto text-slate-200 text-xs whitespace-pre-wrap"></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2 : Catalogue des Outils MCP Disponibles -->
    <section class="space-y-6">
      <div>
        <h3 class="text-2xl font-bold text-white flex items-center gap-2">
          <span>📦</span> Catalogue des Outils Disponibles (M2M Registry)
        </h3>
        <p class="text-sm text-slate-400">Outils indexés, prêts à être appelés par des agents IA autonomes.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6" id="tools-cards-grid">
        <!-- Rempli dynamiquement -->
      </div>
    </section>

    <!-- Section 3 : Proposer / Enregistrer un Outil MCP au Registre -->
    <section class="bg-gradient-to-b from-surface-900 to-surface-950 border border-amber-500/20 rounded-2xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-800 pb-6">
        <div>
          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
            🚀 Enregistrement Immédiat
          </span>
          <h3 class="text-2xl font-bold text-white mt-2 flex items-center gap-2">
            Proposer votre outil MCP dans l'annuaire Ampero
          </h3>
          <p class="text-sm text-slate-400">Ajoutez votre serveur ou outil MCP pour qu'il soit immédiatement découvrable et rémunéré par les agents IA.</p>
        </div>
      </div>

      <form id="form-register-tool" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <label class="block text-xs font-bold uppercase text-slate-300">Nom de l'outil (slug)</label>
          <input type="text" id="reg-name" required placeholder="mon_super_outil" class="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono" />
        </div>

        <div class="space-y-2">
          <label class="block text-xs font-bold uppercase text-slate-300">Prix unitaire par appel (en satoshis)</label>
          <input type="number" id="reg-price" required min="1" value="5" class="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono" />
        </div>

        <div class="space-y-2">
          <label class="block text-xs font-bold uppercase text-slate-300">URL / Endpoint de l'outil</label>
          <input type="url" id="reg-endpoint" required placeholder="https://mon-serveur.workers.dev/mcp" class="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono" />
        </div>

        <div class="space-y-2">
          <label class="block text-xs font-bold uppercase text-slate-300">Votre adresse Lightning (Où recevoir vos paiements)</label>
          <input type="text" id="reg-address" required placeholder="pseudo@getalby.com" class="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono" />
        </div>

        <div class="md:col-span-2 space-y-2">
          <label class="block text-xs font-bold uppercase text-slate-300">Description claire pour les Agents IA</label>
          <textarea id="reg-description" required rows="2" placeholder="Expliquez ce que fait cet outil pour qu'un LLM sache quand l'appeler..." class="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"></textarea>
        </div>

        <div class="md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p class="text-xs text-slate-400">100% Non-custodial : les paiements iront directement sur cette adresse Lightning.</p>
          <button type="submit" id="btn-submit-tool" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-lightning hover:bg-amber-400 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2">
            <span>⚡</span> Inscrire cet outil au Registre Ampero
          </button>
        </div>
      </form>

      <div id="register-alert" class="hidden p-4 rounded-xl text-xs font-mono"></div>
    </section>

    <!-- Section 4 : Intégration en 1 Clic (Claude Desktop, Cursor, Code) -->
    <section class="bg-surface-900 border border-surface-800 rounded-2xl p-8 space-y-8">
      <div>
        <h3 class="text-2xl font-bold text-white flex items-center gap-2">
          <span>🔌</span> Intégration Immédiate pour Agents et Développeurs
        </h3>
        <p class="text-sm text-slate-400">Connectez vos agents Claude Desktop, Cursor ou développez vos propres outils monétisés.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Snippet Claude Desktop / Cursor -->
        <div class="space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Configuration Claude Desktop (claude_desktop_config.json)</span>
          <pre class="p-4 rounded-xl bg-surface-950 border border-surface-800 text-xs text-amber-300 font-mono overflow-x-auto">{
  "mcpServers": {
    "ampero-tools": {
      "command": "npx",
      "args": [
        "-y",
        "ampero",
        "client",
        "--endpoint",
        "https://ampero.dev/mcp"
      ]
    }
  }
}</pre>
        </div>

        <!-- Snippet Développeur -->
        <div class="space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Monétiser un outil en 1 ligne de code</span>
          <pre class="p-4 rounded-xl bg-surface-950 border border-surface-800 text-xs text-emerald-300 font-mono overflow-x-auto">import { registerMonetizedTool } from 'ampero';

// Monétisé automatiquement via Lightning Address
registerMonetizedTool(server, 'mon_outil', 'Description', schema, {
  priceSats: 5,
  lightningAddress: '${envInfo.lightningAddress}'
}, async (args) => {
  return { content: [{ type: 'text', text: 'Résultat' }] };
});</pre>
        </div>
      </div>
    </section>

  </main>

  <footer class="border-t border-surface-800 py-8 text-center text-xs text-slate-400 space-y-2">
    <p>L402 Edge • Protocole bLIP-0004 / LSAT sur Cloudflare Workers & Bitcoin Lightning Network.</p>
    <p>100% Non-Custodial • Respect strict de la vie privée dès la conception (Privacy by Design).</p>
  </footer>

  <!-- Script interactif Vanilla JS défensif -->
  <script is:inline>
    (function() {
      const tools = ${toolsJson};
      let currentChallenge = null;
      let selectedTool = tools[0] || null;

      const consoleLogs = document.getElementById('console-logs');
      const statusBadge = document.getElementById('status-badge');
      const paymentBox = document.getElementById('payment-box');
      const challengeCost = document.getElementById('challenge-cost');
      const resultPreview = document.getElementById('result-preview');
      const resultContent = document.getElementById('result-content');
      const btnTrigger = document.getElementById('btn-trigger');
      const btnPayWebln = document.getElementById('btn-pay-webln');
      const btnMockPay = document.getElementById('btn-mock-pay');
      const toolSelectorContainer = document.getElementById('tool-selector-container');
      const toolParamsContainer = document.getElementById('tool-params-container');
      const toolsCardsGrid = document.getElementById('tools-cards-grid');
      const weblnStatus = document.getElementById('webln-status');

      function logMessage(prefix, message, type = 'info') {
        if (!consoleLogs) return;
        const line = document.createElement('div');
        line.className = 'py-0.5 leading-relaxed break-all';
        
        let colorClass = 'text-slate-300';
        if (type === 'error') colorClass = 'text-rose-400 font-bold';
        if (type === 'warn') colorClass = 'text-amber-400 font-bold';
        if (type === 'success') colorClass = 'text-emerald-400 font-bold';
        if (type === 'crypto') colorClass = 'text-sky-400 font-mono';

        line.innerHTML = '<span class="text-slate-500 font-mono">[' + new Date().toLocaleTimeString() + ']</span> <span class="' + colorClass + '">' + prefix + '</span> ' + message;
        consoleLogs.appendChild(line);
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
      }

      // Initialisation WebLN
      if (typeof window.webln !== 'undefined') {
        if (weblnStatus) {
          weblnStatus.textContent = '⚡ WebLN Alby Détecté';
          weblnStatus.className = 'text-xs px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium';
        }
      } else {
        if (weblnStatus) {
          weblnStatus.textContent = 'Extension WebLN non détectée (Mode NWC/Démo actif)';
        }
      }

      // Rendu des boutons radio d'outils
      if (toolSelectorContainer && Array.isArray(tools)) {
        toolSelectorContainer.innerHTML = '';
        tools.forEach((t, idx) => {
          const label = document.createElement('label');
          label.className = 'flex items-center justify-between p-3.5 rounded-xl border border-surface-800 bg-surface-950/60 cursor-pointer hover:border-amber-500/50 transition-all';
          label.innerHTML = 
            '<div class="flex items-center space-x-3">' +
              '<input type="radio" name="tool-select" value="' + t.name + '" ' + (idx === 0 ? 'checked' : '') + ' class="text-amber-500 focus:ring-amber-500" />' +
              '<div>' +
                '<span class="text-sm font-bold text-white block">' + t.name + '</span>' +
                '<span class="text-xs text-slate-400">' + t.description + '</span>' +
              '</div>' +
            '</div>' +
            '<span class="text-xs font-mono font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">' + t.priceSats + ' sats</span>';
          
          label.querySelector('input').addEventListener('change', () => {
            selectedTool = t;
            if (toolParamsContainer) {
              toolParamsContainer.style.display = t.name.includes('extract') ? 'block' : 'none';
            }
          });
          toolSelectorContainer.appendChild(label);
        });
      }

      // Rendu des cartes de la marketplace
      if (toolsCardsGrid && Array.isArray(tools)) {
        toolsCardsGrid.innerHTML = '';
        tools.forEach(t => {
          const card = document.createElement('div');
          card.className = 'p-6 rounded-2xl bg-surface-900 border border-surface-800 hover:border-amber-500/30 transition-all space-y-4 shadow-lg';
          card.innerHTML =
            '<div class="flex items-center justify-between">' +
              '<h4 class="text-base font-bold text-white font-mono">' + t.name + '</h4>' +
              '<span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">' + t.priceSats + ' sats</span>' +
            '</div>' +
            '<p class="text-sm text-slate-400 leading-relaxed">' + t.description + '</p>' +
            '<div class="pt-3 border-t border-surface-800 flex items-center justify-between text-xs text-slate-400 font-mono">' +
              '<span>Endpoint: ' + t.endpoint + '</span>' +
              '<span class="text-emerald-400 font-semibold">Prêt M2M</span>' +
            '</div>';
          toolsCardsGrid.appendChild(card);
        });
      }

      // Étape 1 : Déclencher l'appel sans authentification (doit renvoyer 402)
      if (btnTrigger) {
        btnTrigger.addEventListener('click', async () => {
          if (!selectedTool) return;
          if (consoleLogs) consoleLogs.innerHTML = '';
          if (resultPreview) resultPreview.classList.add('hidden');
          if (paymentBox) paymentBox.classList.add('hidden');
          if (statusBadge) {
            statusBadge.textContent = 'Envoi requête...';
            statusBadge.className = 'px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono';
          }

          logMessage('AGENT -> EDGE', 'POST ' + selectedTool.endpoint + ' (sans en-tête Authorization)');

          const payload = selectedTool.name.includes('extract') 
            ? { url: document.getElementById('input-url').value }
            : {};

          try {
            const res = await fetch(selectedTool.endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (res.status === 402) {
              const wwwAuth = res.headers.get('WWW-Authenticate') || '';
              const challengeData = await res.json();
              currentChallenge = {
                macaroon: challengeData.macaroon,
                invoice: challengeData.invoice,
                costSats: challengeData.cost_sats || selectedTool.priceSats,
                endpoint: selectedTool.endpoint,
                payload
              };

              logMessage('EDGE -> AGENT', 'HTTP 402 Payment Required !', 'warn');
              logMessage('DÉFI L402', 'Macaroon: ' + currentChallenge.macaroon.substring(0, 30) + '...', 'crypto');
              logMessage('FACTURE BOLT11', currentChallenge.invoice.substring(0, 35) + '... (' + currentChallenge.costSats + ' sats)', 'warn');

              if (statusBadge) {
                statusBadge.textContent = '402 Payment Required';
                statusBadge.className = 'px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono';
              }

              if (paymentBox) {
                paymentBox.classList.remove('hidden');
                challengeCost.textContent = currentChallenge.costSats + ' sats';
              }
            } else {
              const text = await res.text();
              logMessage('RÉPONSE INATTENDUE', 'HTTP ' + res.status + ': ' + text, 'error');
            }
          } catch (err) {
            logMessage('ERREUR', err.message, 'error');
          }
        });
      }

      // Règlement de la facture et exécution finale
      async function settleAndUnlock(preimage) {
        if (!currentChallenge) return;
        logMessage('AGENT WALLET', 'Quittance obtenue ! Preimage: ' + preimage.substring(0, 24) + '...', 'crypto');
        logMessage('AGENT -> EDGE', 'POST ' + currentChallenge.endpoint + ' avec Authorization: L402 <macaroon>:<preimage>');

        try {
          const res = await fetch(currentChallenge.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'L402 ' + currentChallenge.macaroon + ':' + preimage
            },
            body: JSON.stringify(currentChallenge.payload)
          });

          if (res.ok) {
            const data = await res.json();
            logMessage('EDGE -> AGENT', 'HTTP 200 OK • Signature Macaroon & Preimage validées à l\\'Edge !', 'success');
            
            if (statusBadge) {
              statusBadge.textContent = '200 Débloqué';
              statusBadge.className = 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono';
            }

            if (paymentBox) paymentBox.classList.add('hidden');
            if (resultPreview && resultContent) {
              resultPreview.classList.remove('hidden');
              resultContent.textContent = JSON.stringify(data, null, 2);
            }
          } else {
            const errData = await res.json();
            logMessage('ERREUR VALIDATION', 'HTTP ' + res.status + ': ' + (errData.error || 'Erreur'), 'error');
          }
        } catch (err) {
          logMessage('ERREUR RÉPÉTITION', err.message, 'error');
        }
      }

      // Clic WebLN réel
      if (btnPayWebln) {
        btnPayWebln.addEventListener('click', async () => {
          if (!currentChallenge) return;
          if (typeof window.webln === 'undefined') {
            alert('Extension WebLN (comme Alby) non détectée. Utilisez le bouton de simulation NWC ci-dessous.');
            return;
          }
          try {
            await window.webln.enable();
            logMessage('WEBLN', 'Paiement en cours via extension WebLN...');
            const payment = await window.webln.sendPayment(currentChallenge.invoice);
            if (payment && payment.preimage) {
              await settleAndUnlock(payment.preimage);
            }
          } catch (err) {
            logMessage('WEBLN ÉCHEC', err.message, 'error');
          }
        });
      }

      // Clic simulation NWC démo
      if (btnMockPay) {
        btnMockPay.addEventListener('click', async () => {
          if (!currentChallenge) return;
          logMessage('NWC SIMULATEUR', 'Connexion au relais Nostr et paiement de ' + currentChallenge.costSats + ' sats...');
          // On génère une pré-image valide pour la démo si l'environnement le permet
          const mockPreimage = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
          await settleAndUnlock(mockPreimage);
        });
      }

      // Gestion de la soumission de nouveaux outils MCP
      const formRegisterTool = document.getElementById('form-register-tool');
      const registerAlert = document.getElementById('register-alert');
      const btnSubmitTool = document.getElementById('btn-submit-tool');

      if (formRegisterTool) {
        formRegisterTool.addEventListener('submit', async (e) => {
          e.preventDefault();
          const name = document.getElementById('reg-name').value.trim();
          const price_sats = parseInt(document.getElementById('reg-price').value, 10);
          const endpoint = document.getElementById('reg-endpoint').value.trim();
          const lightning_address = document.getElementById('reg-address').value.trim();
          const description = document.getElementById('reg-description').value.trim();

          if (btnSubmitTool) {
            btnSubmitTool.disabled = true;
            btnSubmitTool.innerHTML = '<span>⏳</span> Enregistrement en cours...';
          }

          try {
            const res = await fetch('/api/registry/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, price_sats, endpoint, lightning_address, description })
            });

            const data = await res.json();
            if (res.ok && data.success) {
              if (registerAlert) {
                registerAlert.className = 'p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 block';
                registerAlert.innerHTML = '<strong>✓ Outil Enregistré !</strong> Votre outil <code>' + name + '</code> est désormais inscrit au registre Ampero et découvrable par les agents IA.';
              }
              // Ajout dynamique de la carte dans le catalogue
              if (toolsCardsGrid) {
                const newCard = document.createElement('div');
                newCard.className = 'p-6 rounded-2xl bg-surface-900 border border-emerald-500/50 shadow-xl space-y-4';
                newCard.innerHTML =
                  '<div class="flex items-center justify-between">' +
                    '<h4 class="text-base font-bold text-white font-mono">' + name + '</h4>' +
                    '<span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">' + price_sats + ' sats</span>' +
                  '</div>' +
                  '<p class="text-sm text-slate-300 leading-relaxed">' + description + '</p>' +
                  '<div class="pt-3 border-t border-surface-800 flex items-center justify-between text-xs text-slate-400 font-mono">' +
                    '<span>Endpoint: ' + endpoint + '</span>' +
                    '<span class="text-emerald-400 font-semibold">Inscrit en direct</span>' +
                  '</div>';
                toolsCardsGrid.prepend(newCard);
              }
              formRegisterTool.reset();
            } else {
              if (registerAlert) {
                registerAlert.className = 'p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 block';
                registerAlert.innerHTML = '<strong>Erreur :</strong> ' + (data.error || 'Impossible d\'enregistrer l\'outil');
              }
            }
          } catch (err) {
            if (registerAlert) {
              registerAlert.className = 'p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 block';
              registerAlert.innerHTML = '<strong>Erreur réseau :</strong> ' + err.message;
            }
          } finally {
            if (btnSubmitTool) {
              btnSubmitTool.disabled = false;
              btnSubmitTool.innerHTML = '<span>⚡</span> Inscrire cet outil au Registre Ampero';
            }
          }
        });
      }

    })();
  </script>
</body>
</html>`;
}
