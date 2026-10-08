/**
 * Outil MCP haute valeur ajoutée : Extracteur de page Web vers Markdown optimisé pour LLM.
 * Nettoie le bruit (publicités, scripts, bannières, styles) et structure le contenu pour les contextes d'IA.
 */

export interface ExtractedPageResult {
  url: string;
  title: string;
  description?: string;
  author?: string;
  publishedTime?: string;
  wordCount: number;
  readingTimeMinutes: number;
  markdown: string;
}

/**
 * Nettoie et convertit un document HTML brut en Markdown structuré
 */
export function htmlToCleanMarkdown(html: string, url: string): ExtractedPageResult {
  // 1. Extraction des métadonnées essentielles
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : url;

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1].trim() : undefined;

  const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i);
  const author = authorMatch ? authorMatch[1].trim() : undefined;

  const dateMatch = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i);
  const publishedTime = dateMatch ? dateMatch[1].trim() : undefined;

  // 2. Suppression agressive des éléments parasites
  let sanitized = html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<canvas\b[^<]*(?:(?!<\/canvas>)<[^<]*)*<\/canvas>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, ''); // Commentaires HTML

  // Isoler le conteneur principal si identifiable (article ou main)
  const mainMatch = sanitized.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
                    sanitized.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    sanitized = mainMatch[1];
  }

  // 3. Transformation des balises sémantiques en Markdown
  let md = sanitized
    // Titres
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
    // Paragraphes et retours
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    // Emphase
    .replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, '**$1**')
    .replace(/<(?:em|i)[^>]*>(.*?)<\/(?:em|i)>/gi, '*$1*')
    // Blocs de code et inline code
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    // Citations
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n')
    // Éléments de liste
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n* $1')
    .replace(/<\/?[ou]l[^>]*>/gi, '\n')
    // Liens utiles (texte + URL absolue ou relative)
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // 4. Nettoyage final des balises résiduelles et espaces superflus
  md = md
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n|\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Limite raisonnable pour éviter l'explosion de contexte LLM (max ~15 000 caractères)
  if (md.length > 15000) {
    md = md.substring(0, 15000) + '\n\n*(Contenu tronqué à 15 000 caractères pour optimiser le contexte LLM)*';
  }

  // 5. Calcul des métriques de contenu
  const words = md.match(/\b\S+\b/g) || [];
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Entête enrichie pour agent IA
  const headerParts = [
    `# ${title}`,
    `**Source :** [${url}](${url}) | **Mots :** ${wordCount} | **Temps de lecture :** ~${readingTimeMinutes} min`
  ];
  if (author) headerParts.push(`**Auteur :** ${author}`);
  if (publishedTime) headerParts.push(`**Date :** ${publishedTime}`);
  if (description) headerParts.push(`> ${description}`);

  const formattedMarkdown = `${headerParts.join('\n')}\n\n---\n\n${md}`;

  return {
    url,
    title,
    description,
    author,
    publishedTime,
    wordCount,
    readingTimeMinutes,
    markdown: formattedMarkdown
  };
}

/**
 * Récupère et convertit une URL distante de manière défensive
 */
export async function fetchAndExtractUrl(url: string, fetchFn: typeof fetch = fetch): Promise<ExtractedPageResult> {
  const targetUrl = new URL(url);

  // Sécurité SSRF de base : bloquer les adresses internes ou non HTTP
  if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    throw new Error('Protocole non supporté. Seules les adresses HTTP et HTTPS sont autorisées.');
  }

  const hostname = targetUrl.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.endsWith('.local')
  ) {
    throw new Error('Accès interdit aux adresses réseau locales (SSRF protection).');
  }

  const response = await fetchFn(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; L402DeepExtractorBot/1.0; +https://l402.org/agent-bot)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-CA,fr;q=0.9,en;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error(`Échec de récupération de la page distante (HTTP ${response.status}): ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
    throw new Error(`Type de contenu non supporté : ${contentType}. Seules les pages HTML/texte sont acceptées.`);
  }

  const html = await response.text();
  return htmlToCleanMarkdown(html, url);
}
