/**
 * Dynamic 1200x630 OpenGraph / Twitter Card SVG Banner Generator.
 * Rendered at the Edge with zero dependencies.
 */

export function renderOgImageSvg(): string {
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0d10" />
      <stop offset="50%" stop-color="#111317" />
      <stop offset="100%" stop-color="#080a0c" />
    </linearGradient>

    <!-- Amber Glow Gradient -->
    <radialGradient id="glow" cx="65%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.22" />
      <stop offset="50%" stop-color="#f7931a" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#0b0d10" stop-opacity="0" />
    </radialGradient>

    <!-- Card Border Gradient -->
    <linearGradient id="cardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#27272a" stop-opacity="0.2" />
    </linearGradient>

    <!-- Gold Text Gradient -->
    <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f7931a" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#fef3c7" />
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#glow)" />

  <!-- Subtle Grid Accent -->
  <g stroke="#27272a" stroke-width="1" opacity="0.15">
    <line x1="0" y1="105" x2="1200" y2="105" />
    <line x1="0" y1="210" x2="1200" y2="210" />
    <line x1="0" y1="315" x2="1200" y2="315" />
    <line x1="0" y1="420" x2="1200" y2="420" />
    <line x1="0" y1="525" x2="1200" y2="525" />
    <line x1="200" y1="0" x2="200" y2="630" />
    <line x1="400" y1="0" x2="400" y2="630" />
    <line x1="600" y1="0" x2="600" y2="630" />
    <line x1="800" y1="0" x2="800" y2="630" />
    <line x1="1000" y1="0" x2="1000" y2="630" />
  </g>

  <!-- Outer Card Frame -->
  <rect x="30" y="30" width="1140" height="570" rx="28" fill="none" stroke="url(#cardBorder)" stroke-width="2" />

  <!-- Protocol Badge -->
  <g transform="translate(80, 80)">
    <rect x="0" y="0" width="460" height="42" rx="21" fill="#181b20" stroke="#f59e0b" stroke-width="1.5" stroke-opacity="0.4" />
    <circle cx="24" cy="21" r="5" fill="#10b981" />
    <text x="42" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#fbbf24" letter-spacing="1.5">
      LIGHTNING L402 • bLIP-0004 PROTOCOL
    </text>
  </g>

  <!-- Main Logo & Brand -->
  <g transform="translate(80, 190)">
    <!-- Lightning Icon Circle -->
    <rect x="0" y="0" width="76" height="76" rx="22" fill="#f7931a" />
    <path d="M44 14 L24 40 L38 40 L32 62 L52 34 L38 34 Z" fill="#000000" />

    <!-- Brand Name -->
    <text x="100" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" fill="#ffffff" letter-spacing="-1">
      Ampero
    </text>
    <text x="350" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="600" fill="#f7931a">
      ⚡ M2M Market
    </text>
  </g>

  <!-- Hero Pitch / Headline -->
  <g transform="translate(80, 310)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" fill="#ffffff" letter-spacing="-0.5">
      Where Autonomous AI Agents Pay
    </text>
    <text x="0" y="54" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" fill="url(#goldText)" letter-spacing="-0.5">
      for Micro-Compute in Satoshis.
    </text>
  </g>

  <!-- 3 Key Value Props -->
  <g transform="translate(80, 430)">
    <!-- Pill 1 -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="280" height="48" rx="14" fill="#181b20" stroke="#27272a" stroke-width="1.5" />
      <text x="20" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#e2e8f0">
        🤗 Hugging Face Models
      </text>
    </g>

    <!-- Pill 2 -->
    <g transform="translate(300, 0)">
      <rect x="0" y="0" width="280" height="48" rx="14" fill="#181b20" stroke="#27272a" stroke-width="1.5" />
      <text x="20" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#e2e8f0">
        🛠️ MCP Tools & APIs
      </text>
    </g>

    <!-- Pill 3 -->
    <g transform="translate(600, 0)">
      <rect x="0" y="0" width="280" height="48" rx="14" fill="#181b20" stroke="#27272a" stroke-width="1.5" />
      <text x="20" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#34d399">
        📉 Save 90% Context Tokens
      </text>
    </g>
  </g>

  <!-- Footer Row -->
  <g transform="translate(80, 545)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="500" fill="#94a3b8">
      100% Non-Custodial • Zero KYC • Sub-Cent Lightning Settlement
    </text>
    <text x="1040" y="0" text-anchor="end" font-family="monospace" font-size="16" font-weight="700" fill="#f7931a">
      ampero.dev
    </text>
  </g>
</svg>`;
}
