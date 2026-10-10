/**
 * Dedicated Full M2M Tools & Models Catalogue Page.
 * Rendered at GET /catalogue and GET /tools.
 */

export interface CatalogueToolInfo {
  name: string;
  description: string;
  priceSats: number;
  endpoint: string;
  input_schema?: {
    type?: string;
    properties?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  };
}

export function renderCatalogueHtml(tools: CatalogueToolInfo[], envInfo: { lightningAddress: string }): string {
  const toolsJson = JSON.stringify(tools);

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>M2M Tools & Models Catalogue • Ampero</title>
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
</head>
<body class="bg-surface-950 text-slate-100 min-h-screen font-sans antialiased selection:bg-lightning selection:text-black">

  <!-- Navigation Header -->
  <header class="border-b border-surface-800 bg-surface-900/80 backdrop-blur-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center space-x-3 group">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-lightning to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
          <span class="text-xl font-black text-black">⚡</span>
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Ampero <span class="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono font-medium border border-amber-500/30">Catalogue</span>
          </h1>
          <p class="text-xs text-slate-400">Autonomous M2M Tool & Model Registry</p>
        </div>
      </a>
      <div class="flex items-center space-x-3">
        <a href="/" class="text-xs text-slate-400 hover:text-white transition-colors hidden sm:inline-block">
          Home
        </a>
        <a href="/#submit" class="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-xl bg-surface-800 hover:bg-surface-700 text-amber-300 border border-amber-500/30 transition-all">
          <span>🚀</span> List a Tool
        </a>
        <a href="/#playground" class="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-xl bg-lightning hover:bg-amber-400 text-black transition-all shadow-md shadow-amber-500/10">
          Try Simulator
        </a>
      </div>
    </div>
  </header>

  <!-- Audience Solutions Bar -->
  <div class="border-b border-surface-800 bg-surface-900/40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-start sm:justify-center gap-2 sm:gap-4 overflow-x-auto text-xs font-mono">
      <span class="text-slate-400 font-medium hidden md:inline">Audience Solutions:</span>
      <a href="/monetize-huggingface" class="px-3 py-1 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-surface-800 transition-all whitespace-nowrap">🤗 Hugging Face Models</a>
      <a href="/monetize-tools" class="px-3 py-1 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-surface-800 transition-all whitespace-nowrap">🛠️ MCP Tools & APIs</a>
      <a href="/save-tokens" class="px-3 py-1 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-surface-800 transition-all whitespace-nowrap">📉 Save 90% Tokens</a>
      <a href="/lightning-ai" class="px-3 py-1 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-surface-800 transition-all whitespace-nowrap">⚡ Bitcoin & L402</a>
    </div>
  </div>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

    <!-- Hero Header -->
    <section class="text-center space-y-4 pt-4 max-w-3xl mx-auto">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-surface-800/80 border border-surface-800 text-xs font-mono text-amber-400">
        <span>📦 Indexed Machine-to-Machine Capabilities</span>
      </div>
      <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
        Available Tools & Models Catalogue
      </h2>
      <p class="text-sm sm:text-base text-slate-400 leading-relaxed">
        Autonomous AI agents can discover, execute, and pay for these edge tools in real time. Pay per call in satoshis with zero subscriptions and zero human intervention.
      </p>
    </section>

    <!-- Search & Filter Controls -->
    <section class="max-w-4xl mx-auto bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div class="flex flex-col sm:flex-row items-center gap-3">
        <div class="relative w-full">
          <input type="text" id="search-input" placeholder="Search by name or keyword (e.g. btc, security, markdown, audit)..." class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-950 border border-surface-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono" />
          <span class="absolute left-3.5 top-3 text-slate-500">🔍</span>
        </div>
        <select id="price-filter" class="w-full sm:w-56 px-3 py-2.5 rounded-xl bg-surface-950 border border-surface-800 text-slate-300 text-xs focus:outline-none focus:border-amber-500 font-mono">
          <option value="all">All Prices</option>
          <option value="free">Free Only (0 sats)</option>
          <option value="micro">Micro (1–3 sats)</option>
          <option value="standard">Standard (5–10 sats)</option>
        </select>
      </div>

      <div class="flex items-center justify-between text-xs text-slate-400 font-mono pt-1 border-t border-surface-800/60">
        <span id="tools-count">Loading tools...</span>
        <span>Standard: Model Context Protocol (JSON-RPC / REST)</span>
      </div>
    </section>

    <!-- Tools Cards Grid -->
    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="tools-grid">
      <!-- Dynamically Populated -->
    </section>

    <!-- Bottom Call to Action for Creators -->
    <section class="max-w-4xl mx-auto p-8 rounded-2xl bg-gradient-to-r from-surface-900 via-surface-950 to-surface-900 border border-amber-500/20 text-center space-y-4 shadow-xl">
      <span class="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
        🚀 Build & Monetize
      </span>
      <h3 class="text-2xl font-bold text-white">Have a specialized tool or fine-tuned model?</h3>
      <p class="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
        List your API, scraper, or 7B model in the Ampero Registry in under 30 seconds. Start streaming satoshis to your Lightning wallet on every single execution.
      </p>
      <div class="pt-2">
        <a href="/#submit" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-lightning hover:bg-amber-400 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/10">
          <span>⚡</span> List Your Tool in 30 Seconds
        </a>
      </div>
    </section>

  </main>

  <footer class="border-t border-surface-800 py-10 text-center text-xs text-slate-400 space-y-4 mt-12">
    <div class="flex flex-wrap items-center justify-center gap-6 font-mono text-xs">
      <a href="/monetize-huggingface" class="text-slate-400 hover:text-amber-400 transition-colors">🤗 Hugging Face Models</a>
      <a href="/monetize-tools" class="text-slate-400 hover:text-amber-400 transition-colors">🛠️ MCP Tool Authors</a>
      <a href="/save-tokens" class="text-slate-400 hover:text-emerald-400 transition-colors">📉 Save 90% Tokens</a>
      <a href="/lightning-ai" class="text-slate-400 hover:text-amber-400 transition-colors">⚡ Bitcoin & L402</a>
      <a href="/catalogue" class="text-slate-400 hover:text-white transition-colors">📦 Registry Catalogue</a>
      <a href="/llms.txt" class="text-slate-400 hover:text-white transition-colors">🤖 llms.txt</a>
    </div>
    <p>Ampero M2M Gateway • Protocol bLIP-0004 / L402 on Cloudflare Workers & Bitcoin Lightning.</p>
    <p>100% Non-Custodial • Privacy by Design.</p>
  </footer>

  <script is:inline>
    (function() {
      const allTools = ${toolsJson};
      const toolsGrid = document.getElementById('tools-grid');
      const searchInput = document.getElementById('search-input');
      const priceFilter = document.getElementById('price-filter');
      const toolsCount = document.getElementById('tools-count');

      function renderTools(list) {
        if (!toolsGrid) return;
        toolsGrid.innerHTML = '';

        if (list.length === 0) {
          toolsGrid.innerHTML = '<div class="col-span-full p-8 text-center text-slate-400 bg-surface-900 border border-surface-800 rounded-2xl">No tools matching your search criteria.</div>';
          if (toolsCount) toolsCount.textContent = '0 tools found';
          return;
        }

        if (toolsCount) {
          toolsCount.textContent = list.length + ' of ' + allTools.length + ' tools available';
        }

        list.forEach(t => {
          const card = document.createElement('div');
          card.className = 'p-6 rounded-2xl bg-surface-900 border border-surface-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group';

          // Props list
          const props = t.input_schema && t.input_schema.properties ? Object.keys(t.input_schema.properties) : [];
          const propsBadges = props.length > 0 
            ? props.map(p => '<span class="px-2 py-0.5 rounded bg-surface-950 border border-surface-800 text-[10px] font-mono text-slate-400">' + p + '</span>').join(' ')
            : '<span class="text-[10px] text-slate-500 font-mono">No input parameters required</span>';

          card.innerHTML = 
            '<div class="space-y-3">' +
              '<div class="flex items-center justify-between">' +
                '<h4 class="text-base font-bold text-white font-mono group-hover:text-amber-400 transition-colors">' + t.name + '</h4>' +
                '<span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold ' + (t.priceSats === 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20') + '">' + 
                  (t.priceSats === 0 ? 'FREE' : t.priceSats + ' sats') + 
                '</span>' +
              '</div>' +
              '<p class="text-xs text-slate-400 leading-relaxed min-h-[3.5rem]">' + t.description + '</p>' +
              '<div class="pt-2 border-t border-surface-800/80 space-y-1.5">' +
                '<span class="text-[10px] uppercase font-bold text-slate-500 font-mono block">Input Parameters:</span>' +
                '<div class="flex flex-wrap gap-1">' + propsBadges + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="pt-4 border-t border-surface-800 flex items-center justify-between text-xs">' +
              '<span class="font-mono text-[11px] text-slate-500 truncate max-w-[150px]">' + t.endpoint + '</span>' +
              '<a href="/?tool=' + t.name + '#playground" class="font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">' +
                'Test Live <span>&rarr;</span>' +
              '</a>' +
            '</div>';

          toolsGrid.appendChild(card);
        });
      }

      function filterTools() {
        const query = (searchInput ? searchInput.value.trim().toLowerCase() : '');
        const priceVal = (priceFilter ? priceFilter.value : 'all');

        let filtered = allTools.filter(t => {
          const matchQuery = !query || t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query);
          let matchPrice = true;
          if (priceVal === 'free') matchPrice = t.priceSats === 0;
          else if (priceVal === 'micro') matchPrice = t.priceSats >= 1 && t.priceSats <= 3;
          else if (priceVal === 'standard') matchPrice = t.priceSats >= 4;

          return matchQuery && matchPrice;
        });

        renderTools(filtered);
      }

      if (searchInput) searchInput.addEventListener('input', filterTools);
      if (priceFilter) priceFilter.addEventListener('change', filterTools);

      renderTools(allTools);
    })();
  </script>
</body>
</html>`;
}
