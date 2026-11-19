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
const filterButtons = Array.from(document.querySelectorAll(".news-filter"));
let newsItems = [];
let activeCategory = "all";
let latestNewsRequest = 0;

const categoryNames = {
  all: "Todas",
  economy: "Economía y finanzas",
  markets: "Mercados y trading",
  business: "Empresas",
  technology: "Tecnología financiera"
};

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

function heroTemplate(item) {
  if (!item) return '<div class="news-empty">No hay titulares disponibles para esta selección.</div>';
  return `
    <article class="lead-story">
      <div class="lead-content">
        <div class="meta"><span>${escapeHtml(categoryLabel(item))}</span><time datetime="${escapeHtml(item.published)}">${escapeHtml(formatDate(item.published))}</time></div>
        <h1>${escapeHtml(item.title)}</h1>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
        <div class="meta"><span class="news-source">${escapeHtml(item.source || "Fuente original")}</span></div>
        <a class="read-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Leer en la fuente <span aria-hidden="true">→</span></a>
      </div>
    </article>
    <aside class="side-stories" aria-label="Más titulares"></aside>
  `;
}

function sideTemplate(item) {
  return `
    <article class="side-story">
      <div>
        <div class="meta"><span>${escapeHtml(categoryLabel(item))}</span><time datetime="${escapeHtml(item.published)}">${escapeHtml(formatDate(item.published))}</time></div>
        <h2><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h2>
        <div class="meta"><span class="news-source">${escapeHtml(item.source || "Fuente original")}</span></div>
      </div>
    </article>
  `;
}

function cardTemplate(item) {
  return `
    <article class="news-card">
      <div class="card-body">
        <div class="meta"><span>${escapeHtml(categoryLabel(item))}</span><time datetime="${escapeHtml(item.published)}">${escapeHtml(formatDate(item.published))}</time></div>
        <h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
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
    (!normalizedQuery || `${item.title} ${item.description} ${item.source}`.toLowerCase().includes(normalizedQuery))
  );

  if (!visible.length) {
    newsHero.innerHTML = '<div class="news-empty">No hay titulares disponibles para esta selección.</div>';
    newsGrid.innerHTML = "";
    newsGrid.setAttribute("aria-busy", "false");
    feedStatus.textContent = "0 noticias";
    return;
  }

  newsHero.innerHTML = heroTemplate(visible[0]);
  const side = newsHero.querySelector(".side-stories");
  if (side) side.innerHTML = visible.slice(1, 4).map(sideTemplate).join("");
  newsGrid.innerHTML = visible.slice(4).map(cardTemplate).join("");
  newsGrid.setAttribute("aria-busy", "false");
  feedStatus.textContent = `${visible.length} noticias reales · ${categoryNames[activeCategory]}`;
}

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
