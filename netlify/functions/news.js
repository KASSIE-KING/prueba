const categoryQueries = {
  all: "(business OR economy OR markets OR trading OR finance)",
  economy: "(economy OR inflation OR central bank OR finance)",
  markets: "(stock market OR trading OR shares OR bonds OR commodities)",
  business: "(companies OR business OR earnings OR corporate)",
  technology: "(fintech OR technology finance OR financial technology)"
};

function decodeXml(value) {
  return String(value || "")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function tagValue(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim()) : "";
}

function stripHtml(value) {
  return decodeXml(String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function imageFrom(block) {
  const imageTag = block.match(/<(?:media:thumbnail|media:content|enclosure)\b[^>]*\burl=["']([^"']+)["'][^>]*>/i);
  const descriptionImage = block.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  const candidate = decodeXml((imageTag || descriptionImage || [])[1] || "").trim();
  try {
    const imageUrl = new URL(candidate);
    return imageUrl.protocol === "https:" ? imageUrl.href : "";
  } catch {
    return "";
  }
}

function inferCategory(title) {
  const text = title.toLowerCase();
  if (/trading|stock|market|bond|share|commodity|forex|bitcoin|crypto|nasdaq|ibex|sp 500/.test(text)) return "markets";
  if (/company|companies|earnings|corporate|business|bank|fintech|startup/.test(text)) return "business";
  if (/technology|ai |artificial intelligence|software/.test(text) && !/fintech/.test(text)) return "technology";
  if (/econom|inflation|central bank|interest rate|gdp|finance|fiscal|debt/.test(text)) return "economy";
  return "economy";
}

exports.handler = async (event) => {
  const category = event.queryStringParameters?.category || "all";
  const limit = Math.min(Number(event.queryStringParameters?.limit || 24), 30);
  const query = categoryQueries[category] ? categoryQueries[category] : categoryQueries.all;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es&gl=ES&ceid=ES:es`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Pulso-news-reader/1.0", "Accept": "application/rss+xml, application/xml" }
    });
    if (!response.ok) throw new Error(`Google News respondió ${response.status}`);

    const xml = await response.text();
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const seen = new Set();
    const items = [];

    for (const block of blocks) {
      const title = stripHtml(tagValue(block, "title"));
      const url = stripHtml(tagValue(block, "link"));
      if (!title || !url) continue;

      const source = stripHtml(tagValue(block, "source"));
      const description = stripHtml(tagValue(block, "description"));
      const published = tagValue(block, "pubDate");
      const image = imageFrom(block);
      const parts = title.split(" - ");
      const cleanTitle = parts.length > 1 ? parts.slice(0, -1).join(" - ").trim() : title;
      const cleanSource = source || (parts.length > 1 ? parts.at(-1).trim() : "Google News");

      if (seen.has(url)) continue;
      seen.add(url);
      items.push({
        title: cleanTitle,
        description: description && description !== title ? description : "",
        url,
        image,
        source: cleanSource,
        published,
        category: category === "all" ? inferCategory(cleanTitle) : category
      });
      if (items.length >= limit) break;
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=900"
      },
      body: JSON.stringify({ items, fetchedAt: new Date().toISOString() })
    };
  } catch (error) {
    console.error("No se pudo obtener el feed de Google News:", error);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ items: [], error: "No fue posible obtener el feed de noticias." })
    };
  }
};
