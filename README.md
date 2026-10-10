# ⚡ Ampero

> **Get paid when AI agents use your tools & models.**  
> *The open marketplace where AI agents buy micro-compute and creators earn on every execution.*

[![npm version](https://img.shields.io/npm/v/ampero.svg?color=cb3837)](https://www.npmjs.com/package/ampero)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers_Edge-F38020.svg)](https://workers.cloudflare.com/)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-Anthropic-8A2BE2.svg)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-49%20passing-brightgreen.svg)]()

> 🚀 **Got an MCP server, API, or specialized 7B model?**  
> **[List your tool in the Ampero Registry in 30 seconds](https://ampero.ampero-dev.workers.dev/#submit)** and start earning satoshis directly into your Lightning wallet.

---

## 🤝 A Win-Win Compute Economy

Ampero connects two sides of the AI ecosystem in a simple, mutually beneficial micro-economy:

```
┌────────────────────────────────────────┐       ┌────────────────────────────────────────┐
│      🤖 FOR AI AGENT BUILDERS          │       │      ⚡ FOR TOOL & MODEL CREATORS      │
│                                        │       │                                        │
│ • 90% cheaper than raw LLM tokens      │ ◄───► │ • Earn automatically on every call     │
│ • 25ms instant, deterministic answers  │  Win  │ • Works with APIs & Hugging Face       │
│ • Zero subscriptions: pay-per-call     │  Win  │ • 100% private: weights stay protected │
└────────────────────────────────────────┘       └────────────────────────────────────────┘
```

---

## 💡 The Big Idea: Token Arbitrage

When an AI agent (Claude, GPT-4, Cursor) needs to read a webpage, check live Bitcoin market rates, or audit code syntax, it usually does it the hard way:
1. It downloads thousands of lines of raw HTML, JavaScript, CSS, and ads.
2. It burns **20,000+ tokens** of expensive model context just to filter through the noise.
3. You pay **\$0.10 to \$0.20 per call**, wait 5 seconds, and risk model hallucinations.

**Ampero flips the economics:**  
Instead of making an expensive LLM do raw compute, your agent offloads the heavy lifting to lightweight edge tools for **1 to 10 satoshis** (~$0.0008 to $0.008). 

```
┌────────────────────────────────────────────────────────────────────────┐
│ ❌ THE OLD WAY (Token Waste)                                           │
│ 25,000 raw HTML tokens ──► Claude / GPT ──► Cost: ~$0.12 (5s delay)    │
├────────────────────────────────────────────────────────────────────────┤
│ ⚡ THE AMPERO WAY (Token Arbitrage)                                    │
│ Raw web data ──► Ampero Edge Tool (5 sats = $0.004)                   │
│              ──► 500 clean tokens into LLM ──► Net Savings: 95%        │
└────────────────────────────────────────────────────────────────────────┘
```

You spend fractions of a cent to save actual dollars on your OpenAI / Anthropic bill.

---

## 🔮 The Future of AI: Why Specialized Models Win

The era of a single monolithic model doing everything is ending. Burning 50,000 tokens of prompt context on a generalist model to parse data is unsustainable. 

The future belongs to **modular, hyper-specialized expert models**:

1. **📉 Critical Token Economy:** As AI agents run continuously, token consumption is the #1 operational cost bottleneck. Offloading tasks to specialized micro-tools slashes token waste by up to 90%.
2. **🎯 Superior Reliability (Zero Hallucination):** A 7B model fine-tuned on code security, financial liquidity, or domain schemas consistently beats a 1-trillion parameter generalist on domain accuracy.
3. **⚡ Real-Time Edge Efficiency:** Specialized micro-models execute in 25–50ms at the Edge for fractions of a cent, turning multi-second lags into instant, reactive agent workflows.

> 💡 **The Orchestrator Thesis:** General models (Claude, GPT) will act as directors, coordinating thousands of hyper-specialized expert models. **Ampero is the economic nervous system that powers them.**

---

## ⚡ How It Works (In 3 Simple Steps)

```
[ AI Agent ] ── 1. Calls MCP Tool ──► [ Ampero Edge ]
[ AI Agent ] ◄── 2. 402: Pay 5 sats ── [ Ampero Edge ]
      │
      └── Pays via Lightning (50ms) ──► Creator Wallet ⚡
      │
[ AI Agent ] ── 3. Receives clean data ◄── [ Ampero Edge ]
```

1. **Your agent requests a tool:** For example, *“Extract clean Markdown from this URL”*.
2. **Ampero asks for a micropayment:** The server returns a lightweight `HTTP 402 Payment Required` challenge with a micro-invoice (e.g. 5 satoshis).
3. **Instant settlement:** The agent’s background wallet (WebLN or Nostr Wallet Connect) pays the invoice in 50 milliseconds, and the server immediately unlocks the clean result.

---

## 🚀 1-Minute Quickstart

### Option A: Use Ampero Tools in Claude Desktop or Cursor

Connect your Claude Desktop or Cursor agent to the live Ampero tools catalogue in one step.

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ampero": {
      "command": "npx",
      "args": ["-y", "ampero", "client", "--endpoint", "https://ampero.ampero-dev.workers.dev/mcp"]
    }
  }
}
```

That's it! Claude now has access to monetized, token-saving tools.

---

### Option B: Monetize Your Own Tool (5 Lines of Code)

Install the package:

```bash
npm install ampero @modelcontextprotocol/sdk
```

Register your tool and get paid directly to your Lightning Address:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerMonetizedTool } from 'ampero';

const server = new McpServer({ name: 'MyTools', version: '1.0.0' });

// ⚡ Monetize any function in 1 line of code
registerMonetizedTool(
  server,
  'my_custom_analysis',
  'Analyzes data and returns clean summaries for AI agents',
  { query: z.string() },
  {
    priceSats: 5,                          // 5 satoshis per call (~$0.004)
    lightningAddress: 'you@getalby.com'    // Your personal Lightning Address
  },
  async (args) => {
    return {
      content: [{ type: 'text', text: `Clean result for: ${args.query}` }]
    };
  }
);
```

Every time an autonomous agent invokes `my_custom_analysis`, satoshis stream directly to `you@getalby.com`.

---

## 📦 Ready-to-Use Tools in the Catalogue

Try them live in the **[Interactive Simulator Playground](https://ampero.ampero-dev.workers.dev)**:

| Tool Name | Price | What it does | Est. Token Savings |
| :--- | :---: | :--- | :---: |
| **`extract_clean_markdown`** | **5 sats** | Extracts clean, readable Markdown from any webpage, stripping ads, popups, and tracker junk. | **~24,000 tokens** |
| **`crypto_market_depth`** | **1 sat** | Real-time Bitcoin price and exact sub-cent satoshi-per-dollar conversion rates with zero hallucinations. | **~2,200 tokens** |
| **`slm_code_audit`** | **10 sats** | Specialized 7B code auditor scanning snippets for hardcoded secrets, eval injections, and weak crypto. | **~3,800 tokens** |
| **`domain_security_scanner`** | **3 sats** | Real-time security header auditor (HSTS, CSP, X-Frame-Options) with posture score (A+ to F). | **~2,900 tokens** |
| **`bitcoin_mempool_fees`** | **2 sats** | Real-time Bitcoin on-chain fee estimates (sat/vB) and network congestion status. | **~1,800 tokens** |

---

## ❓ Frequently Asked Questions

#### Do I need to buy crypto or run a Bitcoin node to receive money?
**No.** As a creator, you only need a free **Lightning Address** (which looks just like an email address, e.g. `alice@getalby.com`). You can get one in 30 seconds for free at [getalby.com](https://getalby.com) or [blink.sv](https://blink.sv).

#### Why not just use Stripe or credit cards?
Credit cards have a minimum fixed fee of **\$0.30 + 2.9%** per charge. When an AI tool call costs \$0.004 (5 satoshis), credit card fees are **75 times higher** than the price of the actual compute! Furthermore, software agents cannot pass SMS two-factor authentication or hold bank accounts. Bitcoin Lightning allows micropayments down to 1 satoshi (\$0.0008) with zero fixed fee penalty.

#### Does Ampero hold my funds?
**No.** Ampero is 100% non-custodial. When an agent pays an invoice, the payment settles directly into your personal wallet. Ampero never touches, holds, or custodies your funds.

#### How does an agent pay automatically without asking me each time?
You give your agent a connected wallet (like an Alby account via **Nostr Wallet Connect / NWC**) with a strict daily budget (for example: *“Max 500 satoshis per day”*). The agent can then pay 1 to 5 sats in the background whenever it needs an edge tool, without ever exceeding your financial limit.

---

## 🔬 For Developers & Deep Divers

Looking for the underlying cryptographic specifications, Macaroon caveats, or Cloudflare Worker edge details?
* 📖 **[Vision & Economic Manifesto (docs/VISION.md)](docs/VISION.md)** — The shift toward specialized models and agentic commerce.
* ⚡ **[L402 Protocol Standard (bLIP-0004)](https://github.com/lightning/blips/blob/master/blip-0004.md)** — The native HTTP 402 authentication standard.

---

## 📄 License

MIT © [Ampero](https://ampero.dev)
