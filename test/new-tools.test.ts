import { describe, it, expect } from 'vitest';
import { auditCodeSecurity } from '../src/tools/slm-code-audit';
import { fetchCryptoOracleData } from '../src/tools/crypto-oracle';
import { scanDomainSecurity } from '../src/tools/security-scanner';

describe('Enriched M2M Tool Suite (SLM Audit, Crypto Oracle, Security Scanner)', () => {
  describe('1. SLM Code Security Auditor', () => {
    it('should detect hardcoded secrets and vulnerable functions', () => {
      const vulnerableCode = `
        const apiKey = "ghp_123456789012345678901234567890123456";
        const result = eval("2 + 2");
        const query = "SELECT * FROM users WHERE id = " + userId;
      `;
      const audit = auditCodeSecurity(vulnerableCode);
      expect(audit.securityScore).toBeLessThan(50);
      expect(audit.vulnerabilities.length).toBeGreaterThanOrEqual(3);
      expect(audit.vulnerabilities.some(v => v.type.includes('Secret'))).toBe(true);
      expect(audit.vulnerabilities.some(v => v.type.includes('Eval'))).toBe(true);
    });

    it('should pass clean secure code with high score', () => {
      const cleanCode = `
        export function add(a: number, b: number): number {
          return a + b;
        }
      `;
      const audit = auditCodeSecurity(cleanCode);
      expect(audit.securityScore).toBe(100);
      expect(audit.rating).toBe('A+');
      expect(audit.vulnerabilities.length).toBe(0);
    });
  });

  describe('2. Crypto & Lightning Oracle', () => {
    it('should return valid Bitcoin price and satoshi conversion rates', async () => {
      const mockFetch = async () => new Response(JSON.stringify({ USD: 98000 }));
      const oracle = await fetchCryptoOracleData('USD', mockFetch as any);

      expect(oracle.btcPriceUsd).toBe(98000);
      expect(oracle.satsPerDollar).toBeGreaterThan(0);
      expect(oracle.satsPerCent).toBeGreaterThan(0);
      expect(oracle.asset).toBe('BTC/USD');
    });

    it('should fallback gracefully if network is unavailable', async () => {
      const failingFetch = async () => { throw new Error('Network error'); };
      const oracle = await fetchCryptoOracleData('USD', failingFetch as any);

      expect(oracle.btcPriceUsd).toBeGreaterThan(50000);
      expect(oracle.satsPerDollar).toBeGreaterThan(0);
    });
  });

  describe('3. Domain Security Scanner', () => {
    it('should audit security headers and compute posture grade', async () => {
      const mockFetch = async () => new Response('<html></html>', {
        headers: {
          'strict-transport-security': 'max-age=31536000',
          'content-security-policy': "default-src 'self'",
          'x-frame-options': 'DENY',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'strict-origin-when-cross-origin'
        }
      });

      const scan = await scanDomainSecurity('bitcoin.org', mockFetch as any);
      expect(scan.domain).toBe('bitcoin.org');
      expect(scan.securityScore).toBe(100);
      expect(scan.grade).toBe('A+');
      expect(scan.findingsCount).toBe(0);
    });

    it('should penalize domains missing essential headers', async () => {
      const mockInsecureFetch = async () => new Response('<html></html>', { headers: {} });
      const scan = await scanDomainSecurity('insecure-site.test', mockInsecureFetch as any);

      expect(scan.securityScore).toBeLessThan(50);
      expect(scan.findingsCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe('4. Worker Integration & L402 Endpoints', () => {
    // Import worker dynamically or top-level
    const mockEnv = {
      L402_ROOT_SECRET: 'test-secret-suite-key-1234567890123456',
      CREATOR_LIGHTNING_ADDRESS: 'admin@ampero.dev'
    };

    it('should list all 5 tools in GET /mcp/tools', async () => {
      const { default: worker } = await import('../src/index');
      const req = new Request('https://worker.test/mcp/tools', { method: 'GET' });
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.tools.some((t: any) => t.name === 'slm_code_audit')).toBe(true);
      expect(data.tools.some((t: any) => t.name === 'crypto_market_depth')).toBe(true);
      expect(data.tools.some((t: any) => t.name === 'domain_security_scanner')).toBe(true);
    });

    it('should challenge and unlock slm_code_audit via L402', async () => {
      const { default: worker } = await import('../src/index');
      // Step 1: Challenge
      const challengeReq = new Request('https://worker.test/mcp/tools/slm-audit?demo=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ampero-Demo': 'true' },
        body: JSON.stringify({ code: 'const x = 1;' })
      });
      const challengeRes = await worker.fetch(challengeReq, mockEnv);
      expect(challengeRes.status).toBe(402);
      const challenge = await challengeRes.json() as any;
      expect(challenge.cost_sats).toBe(10);
      expect(challenge.macaroon).toBeDefined();
      expect(challenge.demo_preimage).toBeDefined();

      // Step 2: Pay & Unlock
      const unlockReq = new Request('https://worker.test/mcp/tools/slm-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `L402 ${challenge.macaroon}:${challenge.demo_preimage}`
        },
        body: JSON.stringify({ code: 'const x = 1;' })
      });
      const unlockRes = await worker.fetch(unlockReq, mockEnv);
      expect(unlockRes.status).toBe(200);
      const unlockData = await unlockRes.json() as any;
      expect(unlockData.success).toBe(true);
      expect(unlockData.cost_sats).toBe(10);
      expect(unlockData.data.rating).toBe('A+');
    });

    it('should challenge and unlock crypto_market_depth via L402', async () => {
      const { default: worker } = await import('../src/index');
      const challengeReq = new Request('https://worker.test/mcp/tools/crypto-oracle?demo=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ampero-Demo': 'true' },
        body: JSON.stringify({ currency: 'USD' })
      });
      const challengeRes = await worker.fetch(challengeReq, mockEnv);
      expect(challengeRes.status).toBe(402);
      const challenge = await challengeRes.json() as any;
      expect(challenge.cost_sats).toBe(1);

      const unlockReq = new Request('https://worker.test/mcp/tools/crypto-oracle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `L402 ${challenge.macaroon}:${challenge.demo_preimage}`
        },
        body: JSON.stringify({ currency: 'USD' })
      });
      const unlockRes = await worker.fetch(unlockReq, mockEnv);
      expect(unlockRes.status).toBe(200);
      const unlockData = await unlockRes.json() as any;
      expect(unlockData.success).toBe(true);
      expect(unlockData.cost_sats).toBe(1);
      expect(unlockData.data.btcPriceUsd).toBeGreaterThan(0);
    });
  });
});
