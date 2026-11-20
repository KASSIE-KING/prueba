const searchButton = document.getElementById("searchButton");
const searchOverlay = document.getElementById("searchOverlay");
const closeSearch = document.getElementById("closeSearch");
const searchInput = document.getElementById("searchInput");
const menuButton = document.getElementById("menuButton");
const mainNav = document.querySelector(".main-nav");
const newsletterForm = document.getElementById("newsletterForm");
const newsletterStatus = document.getElementById("newsletterStatus");
let previousFocus = null;

searchButton.addEventListener("click", () => {
  previousFocus = document.activeElement;
  searchOverlay.classList.add("open");
  searchOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  window.setTimeout(() => searchInput.focus(), 100);
});

function closeSearchOverlay() {
  searchOverlay.classList.remove("open");
  searchOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (previousFocus) previousFocus.focus();
}

closeSearch.addEventListener("click", closeSearchOverlay);

searchOverlay.addEventListener("click", (event) => {
  if (event.target === searchOverlay) closeSearch.click();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && searchOverlay.classList.contains("open")) {
    closeSearchOverlay();
  }
  if (event.key === "Tab" && searchOverlay.classList.contains("open")) {
    const focusable = [closeSearch, searchInput];
    const currentIndex = focusable.indexOf(document.activeElement);
    if (event.shiftKey) {
      event.preventDefault();
      focusable[(currentIndex - 1 + focusable.length) % focusable.length].focus();
    } else {
      event.preventDefault();
      focusable[(currentIndex + 1) % focusable.length].focus();
    }
  }
});

menuButton.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
});

newsletterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = newsletterForm.querySelector("button");
  button.textContent = "¡Suscrito!";
  button.setAttribute("aria-disabled", "true");
  newsletterStatus.textContent = "Te has suscrito correctamente.";
});

const newsHero = document.getElementById("newsHero");
const newsGrid = document.getElementById("newsGrid");
const feedStatus = document.getElementById("feedStatus");
const articleView = document.getElementById("articleView");
const articleContent = document.getElementById("articleContent");
const closeArticle = document.getElementById("closeArticle");
const filterButtons = Array.from(document.querySelectorAll(".news-filter"));
let newsItems = [];
let visibleNewsItems = [];
let activeCategory = "all";
let latestNewsRequest = 0;
let articlePreviousFocus = null;

const categoryNames = {
  all: "Todas",
  economy: "Economía y finanzas",
  markets: "Mercados y trading",
  business: "Empresas",
  technology: "Tecnología financiera"
};

const categoryImages = {
  economy: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=85",
  markets: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=85",
  business: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85",
  technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85"
};

function imageFor(item) {
  return item.image || fallbackImageFor(item);
}

function fallbackImageFor(item) {
  return categoryImages[item.category] || categoryImages.economy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function categoryLabel(item) {
  if (item.category === "markets") return "Mercados";
  if (item.category === "economy") return "Economía";
  if (item.category === "business") return "Empresas";
  if (item.category === "technology") return "Fintech";
  return "Finanzas";
}

function heroTemplate(item, index) {
  if (!item) return '<div class="news-empty">No hay titulares disponibles para esta selección.</div>';
  return `
    <article class="lead-story">
      <button class="lead-image story-image" type="button" data-article-index="${index}" aria-label="Abrir noticia: ${escapeHtml(item.title)}">
        <img src="${escapeHtml(imageFor(item))}" data-fallback="${escapeHtml(fallbackImageFor(item))}" alt="Imagen relacionada con ${escapeHtml(item.title)}" fetchpriority="high">
      </button>
      <div class="lead-content">
        <div class="meta"><span>${escapeHtml(categoryLabel(item))}</span><time datetime="${escapeHtml(item.published)}">${escapeHtml(formatDate(item.published))}</time></div>
        <h1>${escapeHtml(item.title)}</h1>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
        <div class="meta"><span class="news-source">${escapeHtml(item.source || "Fuente original")}</span></div>
        <button class="read-link" type="button" data-article-index="${index}">Leer noticia <span aria-hidden="true">→</span></button>
      </div>
    </article>
    <aside class="side-stories" aria-label="Más titulares"></aside>
  `;
}

function sideTemplate(item, index) {
  return `
    <article class="side-story">
      <button class="side-image story-image" type="button" data-article-index="${index}" aria-label="Abrir noticia: ${escapeHtml(item.title)}">
        <img src="${escapeHtml(imageFor(item))}" data-fallback="${escapeHtml(fallbackImageFor(item))}" alt="Imagen relacionada con ${escapeHtml(item.title)}" loading="lazy">
      </button>
      <div>
        <div class="meta"><span>${escapeHtml(categoryLabel(item))}</span><time datetime="${escapeHtml(item.published)}">${escapeHtml(formatDate(item.published))}</time></div>
        <h2><button class="story-title" type="button" data-article-index="${index}">${escapeHtml(item.title)}</button></h2>
        <div class="meta"><span class="news-source">${escapeHtml(item.source || "Fuente original")}</span></div>
      </div>
    </article>
  `;
}

function cardTemplate(item, index) {
  return `
    <article class="news-card">
      <button class="card-image story-image" type="button" data-article-index="${index}" aria-label="Abrir noticia: ${escapeHtml(item.title)}">
        <img src="${escapeHtml(imageFor(item))}" data-fallback="${escapeHtml(fallbackImageFor(item))}" alt="Imagen relacionada con ${escapeHtml(item.title)}" loading="lazy">
      </button>
      <div class="card-body">
        <div class="meta"><span>${escapeHtml(categoryLabel(item))}</span><time datetime="${escapeHtml(item.published)}">${escapeHtml(formatDate(item.published))}</time></div>
        <h3><button class="story-title" type="button" data-article-index="${index}">${escapeHtml(item.title)}</button></h3>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
        <div class="meta"><span class="news-source">${escapeHtml(item.source || "Fuente original")}</span></div>
      </div>
    </article>
  `;
}

function renderNews(query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const visible = newsItems.filter((item) =>
    (activeCategory === "all" || item.category === activeCategory) &&
    (!normalizedQuery || `${item.title} ${item.description} ${item.content} ${item.source}`.toLowerCase().includes(normalizedQuery))
  );
  visibleNewsItems = visible;

  if (!visible.length) {
    newsHero.innerHTML = '<div class="news-empty">No hay titulares disponibles para esta selección.</div>';
    newsGrid.innerHTML = "";
    newsGrid.setAttribute("aria-busy", "false");
    feedStatus.textContent = "0 noticias";
    return;
  }

  newsHero.innerHTML = heroTemplate(visible[0], 0);
  const side = newsHero.querySelector(".side-stories");
  if (side) side.innerHTML = visible.slice(1, 4).map((item, index) => sideTemplate(item, index + 1)).join("");
  newsGrid.innerHTML = visible.slice(4).map((item, index) => cardTemplate(item, index + 4)).join("");
  newsGrid.setAttribute("aria-busy", "false");
  feedStatus.textContent = `${visible.length} noticias reales · ${categoryNames[activeCategory]}`;
}

function articleBodyTemplate(item) {
  const content = item.content || item.description;
  if (!content) return "<p>La fuente no proporcionó un resumen adicional para esta noticia.</p>";
  return content.split(/\n{2,}/).filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

function relatedStoryTemplate(item, index) {
  return `
    <article class="related-story">
      <div class="meta"><span>${escapeHtml(item.source || "Fuente original")}</span><time datetime="${escapeHtml(item.published)}">${escapeHtml(formatDate(item.published))}</time></div>
      <h3>${escapeHtml(item.title)}</h3>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
      <button class="related-story-link" type="button" data-article-index="${index}">Ver noticia <span aria-hidden="true">→</span></button>
    </article>
  `;
}

function openArticle(index) {
  const item = visibleNewsItems[index];
  if (!item) return;
  if (!articleView.classList.contains("open")) articlePreviousFocus = document.activeElement;
  const relatedStories = visibleNewsItems
    .map((story, storyIndex) => ({ story, storyIndex }))
    .filter(({ story, storyIndex }) => storyIndex !== index && story.category === item.category)
    .slice(0, 3);
  articleContent.innerHTML = `
    <img class="article-image" src="${escapeHtml(imageFor(item))}" data-fallback="${escapeHtml(fallbackImageFor(item))}" alt="Imagen relacionada con ${escapeHtml(item.title)}">
    <div class="article-body">
      <div class="meta"><span>${escapeHtml(categoryLabel(item))}</span><time datetime="${escapeHtml(item.published)}">${escapeHtml(formatDate(item.published))}</time></div>
      <h1 id="articleTitle">${escapeHtml(item.title)}</h1>
      <section class="article-section" aria-labelledby="articleDetailsHeading">
        <h2 id="articleDetailsHeading">Resumen y detalles</h2>
        <div class="article-copy">${articleBodyTemplate(item)}</div>
      </section>
      <dl class="article-facts">
        <div><dt>Fuente</dt><dd>${escapeHtml(item.source || "Fuente original")}</dd></div>
        <div><dt>Publicado</dt><dd>${escapeHtml(formatDate(item.published))}</dd></div>
        <div><dt>Sección</dt><dd>${escapeHtml(categoryLabel(item))}</dd></div>
      </dl>
      ${relatedStories.length ? `
        <section class="article-section related-section" aria-labelledby="relatedHeading">
          <h2 id="relatedHeading">Más noticias de ${escapeHtml(categoryLabel(item))}</h2>
          <div class="related-stories">${relatedStories.map(({ story, storyIndex }) => relatedStoryTemplate(story, storyIndex)).join("")}</div>
        </section>
      ` : ""}
    </div>
  `;
  articleView.classList.add("open");
  articleView.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  closeArticle.focus();
}

function closeArticleView() {
  articleView.classList.remove("open");
  articleView.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (articlePreviousFocus) articlePreviousFocus.focus();
}

function handleStoryClick(event) {
  const trigger = event.target.closest("[data-article-index]");
  if (trigger) openArticle(Number(trigger.dataset.articleIndex));
}

newsHero.addEventListener("click", handleStoryClick);
newsGrid.addEventListener("click", handleStoryClick);
articleContent.addEventListener("click", handleStoryClick);
closeArticle.addEventListener("click", closeArticleView);
articleView.addEventListener("click", (event) => {
  if (event.target === articleView) closeArticleView();
});
document.addEventListener("keydown", (event) => {
  if (!articleView.classList.contains("open")) return;
  if (event.key === "Escape") {
    closeArticleView();
  } else if (event.key === "Tab") {
    event.preventDefault();
    closeArticle.focus();
  }
});

document.addEventListener("error", (event) => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  const fallback = image.dataset.fallback;
  if (!fallback) return;
  if (image.src !== fallback) image.src = fallback;
}, true);

async function loadNews(category = "all") {
  const requestId = ++latestNewsRequest;
  newsHero.setAttribute("aria-busy", "true");
  newsGrid.setAttribute("aria-busy", "true");
  feedStatus.textContent = "Actualizando noticias…";
  try {
    const response = await fetch(`/api/news?category=${encodeURIComponent(category)}&limit=24`, {
      headers: { "Accept": "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Respuesta ${response.status}`);
    const payload = await response.json();
    if (!payload.items || !Array.isArray(payload.items)) throw new Error("Formato de noticias no válido");
    if (requestId !== latestNewsRequest) return;
    newsItems = payload.items;
    renderNews(searchInput.value);
  } catch (error) {
    if (requestId !== latestNewsRequest) return;
    newsHero.setAttribute("aria-busy", "false");
    newsGrid.setAttribute("aria-busy", "false");
    newsHero.innerHTML = '<div class="news-error"><div><strong>No se pudieron cargar las noticias.</strong><br>Comprueba la conexión y vuelve a intentarlo.<br><button class="retry-news" id="retryNews" type="button">Volver a intentar</button></div></div>';
    document.getElementById("retryNews").addEventListener("click", () => loadNews(activeCategory));
    newsGrid.innerHTML = "";
    feedStatus.textContent = "Noticias no disponibles";
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    filterButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    loadNews(activeCategory);
  });
});

document.querySelector(".search-overlay form").addEventListener("submit", (event) => {
  event.preventDefault();
  renderNews(searchInput.value);
  closeSearchOverlay();
});

searchInput.addEventListener("input", () => {
  renderNews(searchInput.value);
});

document.querySelectorAll("[data-nav-category]").forEach((link) => {
  link.addEventListener("click", () => {
    const category = link.dataset.navCategory;
    const button = filterButtons.find((item) => item.dataset.category === category);
    if (button) button.click();
  });
});

const editionDate = document.getElementById("editionDate");
if (editionDate) {
  editionDate.textContent = new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date()).replaceAll(".", "").toUpperCase();
  editionDate.innerHTML = editionDate.textContent.replace(" ", "<br>");
}

loadNews();
