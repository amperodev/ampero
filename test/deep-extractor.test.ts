import { describe, it, expect, vi } from 'vitest';
import { htmlToCleanMarkdown, fetchAndExtractUrl } from '../src/tools/deep-extractor';
import { renderPlaygroundHtml } from '../src/ui/playground';

describe('Outil Haute Valeur : Deep Extractor & Assainisseur Markdown', () => {
  const SAMPLE_HTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Guide Bitcoin pour Développeurs</title>
        <meta name="description" content="Introduction complète au protocole Bitcoin et Lightning Network." />
        <meta name="author" content="Satoshi Nakamoto" />
        <style>body { color: red; }</style>
        <script>console.log("tracker");</script>
      </head>
      <body>
        <nav><a href="/home">Ignorer ce menu</a></nav>
        <header>Bannière publicitaire inutile</header>
        <main>
          <h1>Comprendre le réseau Lightning</h1>
          <p>Le <strong>Lightning Network</strong> est un réseau de canaux de paiement décentralisé.</p>
          <blockquote>Les micropaiements deviennent enfin viables pour les machines.</blockquote>
          <pre><code>const sats = 21000000;</code></pre>
          <a href="https://lightning.engineering">Documentation officielle</a>
        </main>
        <footer>Copyright 2026 - Tous droits réservés</footer>
      </body>
    </html>
  `;

  it('devrait éliminer les balises parasites et produire un Markdown structuré pour LLM', () => {
    const result = htmlToCleanMarkdown(SAMPLE_HTML, 'https://example.com/guide');

    expect(result.title).toBe('Guide Bitcoin pour Développeurs');
    expect(result.description).toContain('Introduction complète');
    expect(result.author).toBe('Satoshi Nakamoto');
    expect(result.wordCount).toBeGreaterThan(15);
    expect(result.readingTimeMinutes).toBeGreaterThanOrEqual(1);

    // Vérification du contenu Markdown épuré
    expect(result.markdown).toContain('# Comprendre le réseau Lightning');
    expect(result.markdown).toContain('**Lightning Network**');
    expect(result.markdown).toContain('> Les micropaiements deviennent enfin viables');
    expect(result.markdown).toContain('```\nconst sats = 21000000;\n```');
    expect(result.markdown).toContain('[Documentation officielle](https://lightning.engineering)');

    // Vérification que les balises polluantes sont purgées
    expect(result.markdown).not.toContain('Bannière publicitaire');
    expect(result.markdown).not.toContain('Ignorer ce menu');
    expect(result.markdown).not.toContain('tracker');
    expect(result.markdown).not.toContain('body { color: red; }');
  });

  it('devrait bloquer les tentatives de SSRF vers des adresses locales', async () => {
    await expect(fetchAndExtractUrl('http://localhost:8080/secret')).rejects.toThrow('SSRF protection');
    await expect(fetchAndExtractUrl('http://127.0.0.1/admin')).rejects.toThrow('SSRF protection');
    await expect(fetchAndExtractUrl('http://192.168.1.1/router')).rejects.toThrow('SSRF protection');
    await expect(fetchAndExtractUrl('ftp://example.com/file')).rejects.toThrow('Protocole non supporté');
  });

  it('devrait générer l\'interface Playground HTML avec Tailwind et connecteur WebLN', () => {
    const html = renderPlaygroundHtml(
      [
        {
          name: 'extract_clean_markdown',
          description: 'Extracteur Markdown pour LLM',
          priceSats: 5,
          endpoint: '/mcp/tools/extract'
        }
      ],
      { lightningAddress: 'creator@getalby.com' }
    );

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Ampero • Passerelle M2M');
    expect(html).toContain('Simulateur M2M Interactif');
    expect(html).toContain('extract_clean_markdown');
    expect(html).toContain('5 sats');
    expect(html).toContain('window.webln');
  });
});
