export interface NewsItem {
  title: string;
  description: string;
  link: string;
  publishedAt?: string;
}

/**
 * Parser tolerante de RSS 2.0 y Atom sin dependencias.
 * Extrae título, descripción, enlace y fecha de cada <item>/<entry>.
 */
export function parseFeed(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = matchBlocks(xml, 'item');
  const isAtom = blocks.length === 0;
  const entries = isAtom ? matchBlocks(xml, 'entry') : blocks;

  for (const block of entries) {
    const title = extractTag(block, 'title');
    if (!title) continue;

    const description =
      extractTag(block, 'description') ||
      extractTag(block, 'summary') ||
      extractTag(block, 'content') ||
      '';

    let link = '';
    if (isAtom) {
      const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = linkMatch?.[1] || extractTag(block, 'link');
    } else {
      link = extractTag(block, 'link');
    }

    const rawDate =
      extractTag(block, 'pubDate') ||
      extractTag(block, 'published') ||
      extractTag(block, 'updated') ||
      extractTag(block, 'dc:date');
    const publishedAt = rawDate ? toIso(rawDate) : undefined;

    items.push({
      title: cleanText(title),
      description: cleanText(description),
      link: link.trim(),
      publishedAt,
    });
  }

  return items;
}

function matchBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`, 'gi');
  return xml.match(re) || [];
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(re);
  if (!match) return '';
  return stripCdata(match[1]);
}

function stripCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function cleanText(value: string): string {
  return decodeEntities(stripCdata(value))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function toIso(raw: string): string | undefined {
  const time = Date.parse(raw);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}
