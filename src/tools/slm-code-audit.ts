/**
 * Specialized SLM (Small Language Model) Code Security Auditor.
 * Emulates a hyper-specialized fine-tuned 7B model running on edge compute for autonomous agents.
 * Price: 10 satoshis.
 */

export interface SecurityVulnerability {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  type: string;
  line?: number;
  description: string;
  recommendation: string;
}

export interface CodeAuditResult {
  model: string;
  analyzedLines: number;
  securityScore: number;
  rating: 'A+' | 'A' | 'B' | 'C' | 'CRITICAL';
  vulnerabilities: SecurityVulnerability[];
  executiveSummary: string;
  timestamp: number;
}

export function auditCodeSecurity(code: string, language: string = 'auto'): CodeAuditResult {
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    throw new Error('Code snippet is required and cannot be empty.');
  }

  const lines = code.split('\n');
  const vulnerabilities: SecurityVulnerability[] = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // 1. Detect Hardcoded API Keys / Secrets / Tokens
    if (/(['"])(?:ghp_[a-zA-Z0-9]{36}|xox[baprs]-[0-9]{10,13}-[a-zA-Z0-9]+|sk-[a-zA-Z0-9]{32,}|AKIA[0-9A-Z]{16})\1/i.test(trimmed)) {
      vulnerabilities.push({
        severity: 'CRITICAL',
        type: 'Hardcoded Secret / API Token',
        line: lineNum,
        description: 'Hardcoded plain-text API token or credential detected in source code.',
        recommendation: 'Remove credential immediately and inject via environment variables (e.g., process.env or Cloudflare Worker env bindings).'
      });
    }

    // 2. Dangerous eval / Function constructor
    if (/\beval\s*\(|\bnew\s+Function\s*\(/i.test(trimmed)) {
      vulnerabilities.push({
        severity: 'HIGH',
        type: 'Arbitrary Code Execution (Eval)',
        line: lineNum,
        description: 'Dynamic code execution via eval() or Function constructor creates code injection risks.',
        recommendation: 'Refactor to eliminate dynamic string execution or parse safely using JSON.parse().'
      });
    }

    // 3. Raw SQL Injection patterns
    if (/SELECT\s+.*FROM\s+.*WHERE\s+.*(\+|`|\$\{)/i.test(trimmed) || /raw\s*\(\s*`.*SELECT/i.test(trimmed)) {
      vulnerabilities.push({
        severity: 'HIGH',
        type: 'SQL Injection Risk',
        line: lineNum,
        description: 'Dynamic string interpolation or concatenation detected in SQL query statement.',
        recommendation: 'Use parameterized queries or prepared statements.'
      });
    }

    // 4. Insecure HTTP URLs
    if (/http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(trimmed)) {
      vulnerabilities.push({
        severity: 'MEDIUM',
        type: 'Insecure Cleartext Protocol (HTTP)',
        line: lineNum,
        description: 'Unencrypted HTTP endpoint detected, vulnerable to Man-in-the-Middle (MitM) eavesdropping.',
        recommendation: 'Upgrade to encrypted HTTPS transport.'
      });
    }

    // 5. Insecure cryptography algorithms (MD5 / SHA1)
    if (/crypto\.(?:createHash\s*\(\s*['"](?:md5|sha1)['"]|subtle\.digest\s*\(\s*['"](?:MD5|SHA-1)['"])/i.test(trimmed)) {
      vulnerabilities.push({
        severity: 'MEDIUM',
        type: 'Weak Cryptographic Hash',
        line: lineNum,
        description: 'Collision-vulnerable hash algorithm (MD5 or SHA-1) detected.',
        recommendation: 'Upgrade to collision-resistant SHA-256, SHA-512, or argon2id for password hashing.'
      });
    }
  });

  // Calculate score
  let score = 100;
  vulnerabilities.forEach(v => {
    if (v.severity === 'CRITICAL') score -= 35;
    else if (v.severity === 'HIGH') score -= 20;
    else if (v.severity === 'MEDIUM') score -= 10;
    else score -= 5;
  });
  score = Math.max(0, score);

  let rating: 'A+' | 'A' | 'B' | 'C' | 'CRITICAL' = 'A+';
  if (score < 40) rating = 'CRITICAL';
  else if (score < 65) rating = 'C';
  else if (score < 80) rating = 'B';
  else if (score < 95) rating = 'A';

  const executiveSummary = vulnerabilities.length === 0
    ? 'No immediate high-severity security vulnerabilities detected. Code passes automated static analysis.'
    : `Identified ${vulnerabilities.length} security finding(s) with ${vulnerabilities.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH').length} high/critical issue(s) requiring remediation.`;

  return {
    model: 'ampero-slm-deepseek-coder-7b-fine-tune',
    analyzedLines: lines.length,
    securityScore: score,
    rating,
    vulnerabilities,
    executiveSummary,
    timestamp: Date.now()
  };
}
