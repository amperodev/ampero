/**
 * Dedicated Landing Page for Bitcoin & Lightning Network Community.
 * Route: /lightning-ai (and /for-bitcoin)
 */

export function renderBitcoinPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bitcoin Lightning: The Native Currency of AI Agents • Ampero</title>
  <meta name="description" content="Why Bitcoin Lightning is the native currency of autonomous AI agents. Real-world utility with L402, LSAT, non-custodial streaming micropayments and zero KYC.">
  <meta property="og:title" content="Bitcoin Lightning: The Native Currency of AI Agents • Ampero">
  <meta property="og:description" content="AI agents have no passports, bank accounts, or credit cards. Bitcoin Lightning is the only open, permissionless, instant settlement rail for machines.">
  <meta property="og:type" content="website">
  <link rel="canonical" href="https://ampero.ampero-dev.workers.dev/lightning-ai">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
            lightning: '#f7931a',
            surface: { 800: '#181b20', 900: '#111317', 950: '#0b0d10' }
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
            Ampero <span class="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono font-medium border border-amber-500/30">Bitcoin & L402</span>
          </h1>
          <p class="text-xs text-slate-400">The Machine-to-Machine Currency Rail</p>
        </div>
      </a>
      <div class="flex items-center space-x-3">
        <a href="/catalogue" class="hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 hover:text-white border border-surface-700 transition-all">
          <span>📦</span> Catalogue
        </a>
        <a href="/#playground" class="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-xl bg-lightning hover:bg-amber-400 text-black transition-all shadow-md shadow-amber-500/10">
          Try Simulator
        </a>
      </div>
    </div>
  </header>

  <!-- Audience Navigation Pills -->
  <div class="border-b border-surface-800 bg-surface-900/40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-start sm:justify-center gap-2 sm:gap-4 overflow-x-auto text-xs font-mono">
      <a href="/monetize-huggingface" class="px-3 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-all whitespace-nowrap">🤗 Hugging Face Models</a>
      <a href="/monetize-tools" class="px-3 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-all whitespace-nowrap">🛠️ MCP Tools & APIs</a>
      <a href="/save-tokens" class="px-3 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-all whitespace-nowrap">📉 Save 90% Tokens</a>
      <a href="/lightning-ai" class="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold whitespace-nowrap">⚡ Bitcoin & L402</a>
    </div>
  </div>

  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

    <!-- Hero Section -->
    <section class="text-center space-y-6 pt-4">
      <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-400">
        <span>⚡ Real-World Bitcoin Utility: The Machine Economy</span>
      </div>

      <h2 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
        Bitcoin Lightning is the <span class="bg-gradient-to-r from-lightning via-amber-400 to-amber-200 bg-clip-text text-transparent">native currency of autonomous AI</span>
      </h2>

      <p class="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
        AI agents cannot hold bank accounts, submit government IDs, or carry credit cards. Ampero bridges the Bitcoin Lightning Network to the HTTP protocol using L402 (bLIP-0004), turning satoshis into the fuel for autonomous intelligence.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
        <a href="/#playground" class="px-6 py-3.5 rounded-xl bg-gradient-to-r from-lightning to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2">
          <span>🧪</span> Live L402 Simulator
        </a>
        <a href="/catalogue" class="px-6 py-3.5 rounded-xl bg-surface-900 hover:bg-surface-800 text-slate-200 font-bold text-sm border border-surface-800 hover:border-surface-700 transition-all shadow-md flex items-center gap-2">
          <span>📦</span> Explore M2M Catalogue
        </a>
      </div>

      <!-- Quick Trust Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 max-w-3xl mx-auto text-center">
        <div class="p-3.5 rounded-xl bg-surface-900 border border-surface-800">
          <div class="text-lg font-bold text-amber-400 font-mono">1 Sat Minimum</div>
          <div class="text-[11px] text-slate-400">Sub-cent precision (~$0.0008)</div>
        </div>
        <div class="p-3.5 rounded-xl bg-surface-900 border border-surface-800">
          <div class="text-lg font-bold text-emerald-400 font-mono">Zero Custody</div>
          <div class="text-[11px] text-slate-400">Direct wallet-to-wallet</div>
        </div>
        <div class="p-3.5 rounded-xl bg-surface-900 border border-surface-800">
          <div class="text-lg font-bold text-sky-400 font-mono">200ms Finality</div>
          <div class="text-[11px] text-slate-400">Instant Lightning settlement</div>
        </div>
        <div class="p-3.5 rounded-xl bg-surface-900 border border-surface-800">
          <div class="text-lg font-bold text-purple-400 font-mono">bLIP-0004</div>
          <div class="text-[11px] text-slate-400">Open web standard</div>
        </div>
      </div>
    </section>

    <!-- Why Fiat Fails Machines: Comparison Table -->
    <section class="space-y-6">
      <div class="text-center space-y-2 max-w-2xl mx-auto">
        <span class="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 inline-block">
          The Monetary Bottleneck
        </span>
        <h3 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Why Fiat Rails Cannot Power Autonomous AI
        </h3>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border border-surface-800 rounded-2xl overflow-hidden bg-surface-900">
          <thead class="bg-surface-950/80 text-slate-300 font-mono border-b border-surface-800">
            <tr>
              <th class="p-4">Feature</th>
              <th class="p-4 text-rose-400">Traditional Rails (Stripe / Visa)</th>
              <th class="p-4 text-emerald-400">Ampero (Bitcoin Lightning + L402)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-800 text-slate-300">
            <tr>
              <td class="p-4 font-bold text-white">Identity Requirement</td>
              <td class="p-4 text-rose-300">Strict KYC, Passport, Bank verification (Impossible for bots)</td>
              <td class="p-4 text-emerald-300 font-bold">Zero KYC • Cryptographic keypairs only</td>
            </tr>
            <tr>
              <td class="p-4 font-bold text-white">Minimum Practical Fee</td>
              <td class="p-4 text-rose-300">$0.30 fixed fee per transaction</td>
              <td class="p-4 text-emerald-300 font-bold">&lt; $0.0001 (1 satoshi)</td>
            </tr>
            <tr>
              <td class="p-4 font-bold text-white">Settlement Speed</td>
              <td class="p-4 text-rose-300">2 to 7 days (T+2 rolling bank payout)</td>
              <td class="p-4 text-emerald-300 font-bold">~250 milliseconds instant finality</td>
            </tr>
            <tr>
              <td class="p-4 font-bold text-white">Chargeback / Clawback Risk</td>
              <td class="p-4 text-rose-300">High (Up to 180 days chargeback window)</td>
              <td class="p-4 text-emerald-300 font-bold">Zero • Irreversible proof-of-payment</td>
            </tr>
            <tr>
              <td class="p-4 font-bold text-white">Integration Standard</td>
              <td class="p-4 text-rose-300">Proprietary REST webhooks & session cookies</td>
              <td class="p-4 text-emerald-300 font-bold">Open HTTP 402 + Macaroon standard (bLIP-0004)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- The L402 Protocol Architecture -->
    <section class="p-8 rounded-2xl bg-surface-900 border border-surface-800 space-y-6">
      <div class="text-center space-y-2">
        <h3 class="text-2xl font-bold text-white">How L402 Works at the Edge</h3>
        <p class="text-xs sm:text-sm text-slate-400">Combining HTTP status 402, Macaroons, and Lightning preimages</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-5 rounded-xl bg-surface-950/60 border border-surface-800 space-y-2.5">
          <div class="text-amber-400 font-mono font-bold text-sm">1. Challenge (HTTP 402)</div>
          <p class="text-xs text-slate-300 leading-relaxed">
            The agent requests an endpoint without credentials. The Cloudflare Edge worker generates a cryptographic Macaroon containing caveats (path, expiry, cost) and a BOLT-11 invoice.
          </p>
        </div>

        <div class="p-5 rounded-xl bg-surface-950/60 border border-surface-800 space-y-2.5">
          <div class="text-amber-400 font-mono font-bold text-sm">2. Settle (Lightning Network)</div>
          <p class="text-xs text-slate-300 leading-relaxed">
            The agent pays the invoice via Nostr Wallet Connect (NWC) or WebLN. Upon payment, the Lightning Network returns a 32-byte cryptographic preimage (proof-of-payment).
          </p>
        </div>

        <div class="p-5 rounded-xl bg-surface-950/60 border border-surface-800 space-y-2.5">
          <div class="text-amber-400 font-mono font-bold text-sm">3. Unlock (Authorization: L402)</div>
          <p class="text-xs text-slate-300 leading-relaxed">
            The agent replays the request with <code>Authorization: L402 &lt;macaroon&gt;:&lt;preimage&gt;</code>. Edge verifies the HMAC in &lt; 2ms without database locks.
          </p>
        </div>
      </div>
    </section>

    <!-- cURL Command Example -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-white">Programmatic Machine Consumption via cURL</h3>
          <p class="text-xs text-slate-400">Pure HTTP with zero SDK dependencies</p>
        </div>
        <span class="text-xs font-mono text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">cURL / bash</span>
      </div>

      <pre class="p-5 rounded-2xl bg-surface-900 border border-surface-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed"><code># 1. Query endpoint -> Returns HTTP 402 + WWW-Authenticate header
curl -i -X POST https://ampero.ampero-dev.workers.dev/mcp/tools/crypto-oracle

# 2. Pay the BOLT-11 invoice with your Lightning node / wallet
# Result gives you the 32-byte SHA-256 preimage

# 3. Unlock with L402 header
curl -X POST https://ampero.ampero-dev.workers.dev/mcp/tools/crypto-oracle \\
  -H "Authorization: L402 AgEE...macaroon...:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" \\
  -H "Content-Type: application/json" \\
  -d '{"currency":"USD"}'</code></pre>
    </section>

    <!-- Bottom CTA Box -->
    <section class="p-8 sm:p-10 rounded-2xl bg-gradient-to-r from-surface-900 via-surface-900 to-surface-950 border border-amber-500/30 text-center space-y-6 shadow-2xl">
      <h3 class="text-2xl sm:text-3xl font-bold text-white">
        Experience the machine economy in action
      </h3>
      <p class="text-sm text-slate-300 max-w-xl mx-auto">
        Test real-time L402 settlement in your browser with WebLN (Alby) or simulate an autonomous NWC bot.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-4">
        <a href="/#playground" class="px-8 py-3.5 rounded-xl bg-lightning hover:bg-amber-400 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20">
          <span>⚡</span> Launch Interactive Simulator
        </a>
        <a href="/#submit" class="px-6 py-3.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 font-bold text-sm border border-surface-700 transition-all">
          Monetize a Service
        </a>
      </div>
    </section>

  </main>

  <footer class="border-t border-surface-800 py-8 text-center text-xs text-slate-400 space-y-2">
    <p>Ampero • The Bitcoin Lightning Settlement Layer for Autonomous Machines.</p>
    <p>Protocol bLIP-0004 / L402 • 100% Non-Custodial • Privacy by Design.</p>
  </footer>

</body>
</html>`;
}
