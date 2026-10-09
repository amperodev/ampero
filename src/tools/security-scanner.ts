/**
 * Domain & SSL Posture Security Scanner for DevOps Agents.
 * Price: 3 satoshis.
 * Analyzes security headers, HSTS, CSP, and TLS configurations of any public domain.
 */

export interface HeaderAuditItem {
  header: string;
  present: boolean;
  value?: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  recommendation: string;
}

export interface DomainSecurityScanResult {
  domain: string;
  checkedUrl: string;
  securityScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'F';
  headersAudit: HeaderAuditItem[];
  findingsCount: number;
  recommendations: string[];
  timestamp: number;
}

export async function scanDomainSecurity(rawDomain: string, fetchFn: typeof fetch = fetch): Promise<DomainSecurityScanResult> {
  if (!rawDomain || typeof rawDomain !== 'string') {
    throw new Error('A valid domain or hostname must be provided.');
  }

  // Clean domain input
  let domain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (!domain || domain.includes(' ') || !domain.includes('.')) {
    throw new Error('Invalid domain format. Expected e.g. "example.com" or "bitcoin.org".');
  }

  const targetUrl = `https://${domain}`;
  let headers: Headers;

  try {
    const res = await fetchFn(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    headers = res.headers;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    throw new Error(`Unable to connect to https://${domain}: ${msg}`);
  }

  const audits: HeaderAuditItem[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // 1. Strict-Transport-Security (HSTS)
  const hsts = headers.get('strict-transport-security');
  if (hsts) {
    audits.push({
      header: 'Strict-Transport-Security',
      present: true,
      value: hsts,
      status: 'PASS',
      recommendation: 'HSTS is active and enforcing HTTPS.'
    });
  } else {
    score -= 25;
    audits.push({
      header: 'Strict-Transport-Security',
      present: false,
      status: 'FAIL',
      recommendation: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload" to prevent SSL stripping.'
    });
    recommendations.push('Enable HSTS header to enforce encrypted transport.');
  }

  // 2. Content-Security-Policy (CSP)
  const csp = headers.get('content-security-policy');
  if (csp) {
    audits.push({
      header: 'Content-Security-Policy',
      present: true,
      value: csp.substring(0, 80) + (csp.length > 80 ? '...' : ''),
      status: 'PASS',
      recommendation: 'Content Security Policy is configured.'
    });
  } else {
    score -= 25;
    audits.push({
      header: 'Content-Security-Policy',
      present: false,
      status: 'WARN',
      recommendation: 'Implement a Content-Security-Policy to mitigate Cross-Site Scripting (XSS) and code injection.'
    });
    recommendations.push('Implement a Content-Security-Policy (CSP) header.');
  }

  // 3. X-Frame-Options
  const xfo = headers.get('x-frame-options');
  if (xfo) {
    audits.push({
      header: 'X-Frame-Options',
      present: true,
      value: xfo,
      status: 'PASS',
      recommendation: 'Frame embedding is restricted.'
    });
  } else {
    score -= 15;
    audits.push({
      header: 'X-Frame-Options',
      present: false,
      status: 'WARN',
      recommendation: 'Set "X-Frame-Options: DENY" or "SAMEORIGIN" to protect against clickjacking attacks.'
    });
    recommendations.push('Add X-Frame-Options header to protect against Clickjacking.');
  }

  // 4. X-Content-Type-Options
  const xcto = headers.get('x-content-type-options');
  if (xcto && xcto.toLowerCase().includes('nosniff')) {
    audits.push({
      header: 'X-Content-Type-Options',
      present: true,
      value: xcto,
      status: 'PASS',
      recommendation: 'MIME sniffing protection is enabled.'
    });
  } else {
    score -= 10;
    audits.push({
      header: 'X-Content-Type-Options',
      present: false,
      status: 'FAIL',
      recommendation: 'Set "X-Content-Type-Options: nosniff" to prevent MIME-confusion vulnerabilities.'
    });
  }

  // 5. Referrer-Policy
  const rp = headers.get('referrer-policy');
  if (rp) {
    audits.push({
      header: 'Referrer-Policy',
      present: true,
      value: rp,
      status: 'PASS',
      recommendation: 'Referrer leakage is controlled.'
    });
  } else {
    score -= 10;
    audits.push({
      header: 'Referrer-Policy',
      present: false,
      status: 'WARN',
      recommendation: 'Set "Referrer-Policy: strict-origin-when-cross-origin" to protect sensitive URLs.'
    });
  }

  score = Math.max(0, score);
  let grade: 'A+' | 'A' | 'B' | 'C' | 'F' = 'A+';
  if (score < 40) grade = 'F';
  else if (score < 60) grade = 'C';
  else if (score < 80) grade = 'B';
  else if (score < 95) grade = 'A';

  return {
    domain,
    checkedUrl: targetUrl,
    securityScore: score,
    grade,
    headersAudit: audits,
    findingsCount: audits.filter(a => a.status !== 'PASS').length,
    recommendations,
    timestamp: Date.now()
  };
}
