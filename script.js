// ---------------------------------------------------------------------------
// À personnaliser
// ---------------------------------------------------------------------------
const WEDDING_DATE = new Date("2027-05-29T14:30:00"); // date et heure de la cérémonie
const RSVP_EMAIL = "contact@exemple.fr";              // adresse qui reçoit les réponses

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
const nav = document.getElementById("nav");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

function closeMenu() {
  navLinks.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
});

navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

// ---------------------------------------------------------------------------
// Défilement : fond de la nav
// ---------------------------------------------------------------------------
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let ticking = false;

function onScroll() {
  nav.classList.toggle("is-scrolled", window.scrollY > 40);
  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(onScroll);
    ticking = true;
  }
}, { passive: true });
onScroll();

// ---------------------------------------------------------------------------
// Apparitions au défilement
// ---------------------------------------------------------------------------
const revealEls = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && !reduceMotion) {
  const observer = new IntersectionObserver((entries) => {
    // décalage en cascade des éléments qui entrent en même temps
    entries.filter((e) => e.isIntersecting).forEach((entry, i) => {
      entry.target.style.setProperty("--delay", `${i * 0.09}s`);
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -5% 0px" });

  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// ---------------------------------------------------------------------------
// Compte à rebours
// ---------------------------------------------------------------------------
const cd = {
  days: document.getElementById("cdDays"),
  hours: document.getElementById("cdHours"),
  minutes: document.getElementById("cdMinutes"),
  seconds: document.getElementById("cdSeconds"),
};
const pad = (n) => String(n).padStart(2, "0");

function updateCountdown() {
  const diff = WEDDING_DATE - Date.now();

  if (diff <= 0) {
    document.getElementById("countdownGrid").hidden = true;
    document.querySelector(".countdown .kicker").hidden = true;
    document.getElementById("countdownDone").hidden = false;
    clearInterval(countdownTimer);
    return;
  }

  const s = Math.floor(diff / 1000);
  cd.days.textContent = Math.floor(s / 86400);
  cd.hours.textContent = pad(Math.floor((s % 86400) / 3600));
  cd.minutes.textContent = pad(Math.floor((s % 3600) / 60));
  cd.seconds.textContent = pad(s % 60);
}

const countdownTimer = setInterval(updateCountdown, 1000);
updateCountdown();

// ---------------------------------------------------------------------------
// RSVP
// Premier jet sans serveur : le formulaire ouvre un e-mail pré-rempli.
// À remplacer plus tard par un service de formulaire (Formspree, Netlify Forms…).
// ---------------------------------------------------------------------------
const form = document.getElementById("rsvpForm");
const formStatus = document.getElementById("formStatus");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  // Sécurité : tant que l'adresse de réception est provisoire, on n'envoie rien.
  if (RSVP_EMAIL.endsWith("@exemple.fr")) {
    formStatus.textContent = "Le formulaire sera bientôt disponible. Merci de votre patience !";
    return;
  }

  if (!form.checkValidity()) {
    formStatus.textContent = "Il manque votre nom ou votre réponse.";
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const present = data.get("presence") === "Oui";
  const body = [
    `Nom : ${data.get("nom")}`,
    `Présence : ${data.get("presence")}`,
    present ? `Nombre de personnes : ${data.get("personnes")}` : null,
    data.get("message") ? `Message : ${data.get("message")}` : null,
  ].filter(Boolean).join("\n");

  const subject = `Réponse mariage — ${data.get("nom")}`;
  window.location.href =
    `mailto:${RSVP_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  formStatus.textContent = present
    ? "Merci, on a hâte de vous voir !"
    : "Merci de nous avoir prévenus, vous allez nous manquer.";
});

// ---------------------------------------------------------------------------
// Dormir : carte des hébergements (Leaflet + fond CARTO, données data/hebergements.js)
// ---------------------------------------------------------------------------
(function initMap() {
  const el = document.getElementById("map");
  const data = window.HEBERGEMENTS;
  if (!el || !window.L || !data) return;

  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const map = L.map(el, {
    scrollWheelZoom: false,       // ne pas bloquer le défilement de la page
    dragging: !isTouch,           // sur mobile : on déplace la carte avec deux doigts
    tap: !isTouch,
    zoomControl: true,
    zoomSnap: 0.25,
  });
  if (isTouch) map.touchZoom.enable();

  // Fond gris clair Esri (sans clé) + couche des noms de lieux
  const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
  L.tileLayer(esri + "World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 16,
    attribution: 'Fond &copy; Esri · Hébergements &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  L.tileLayer(esri + "World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16 }).addTo(map);

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const km = (d) => `${d.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
  const bounds = [];

  // Les deux lieux du mariage
  data.lieux.forEach((lieu) => {
    const icon = L.divIcon({
      className: "venue-pin",
      html: `<span class="venue-pin__mark"></span><span class="venue-pin__label">${esc(lieu.nom)}</span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    L.marker([lieu.lat, lieu.lon], { icon, keyboard: false, zIndexOffset: 1000, title: lieu.nom }).addTo(map);
    bounds.push([lieu.lat, lieu.lon]);
  });

  // Les hébergements
  const pinIcon = L.divIcon({ className: "", html: '<span class="pin"></span>', iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -8] });
  const list = document.getElementById("lodgingList");

  data.hebergements.forEach((h) => {
    const popup = `
      <p class="popup__type">${esc(h.type)}</p>
      <p class="popup__name">${esc(h.nom)}</p>
      <p class="popup__meta">${h.commune ? esc(h.commune) + " · " : ""}${km(h.distance_km)} de La Colonie</p>
      <a class="popup__link" href="${esc(h.site)}" target="_blank" rel="noopener">Voir le site ↗</a>`;
    L.marker([h.lat, h.lon], { icon: pinIcon, title: h.nom, alt: h.nom }).bindPopup(popup, { maxWidth: 260 }).addTo(map);
    bounds.push([h.lat, h.lon]);

    if (list) {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${esc(h.site)}" target="_blank" rel="noopener">${esc(h.nom)}</a><span>${esc(h.type)} · ${km(h.distance_km)}</span>`;
      list.appendChild(li);
    }
  });

  map.fitBounds(bounds, { paddingTopLeft: [20, 20], paddingBottomRight: [120, 20] }); // place pour les étiquettes
})();

// ---------------------------------------------------------------------------
// S'habiller : tableau d'inspirations (contenu dans inspirations.js)
// ---------------------------------------------------------------------------
(function initMoodboard() {
  const board = document.getElementById("moodboard");
  if (!board) return;
  const items = window.INSPIRATIONS || [];

  if (items.length === 0) {
    // Cases d'attente, hauteurs variées pour l'effet mosaïque
    ["3 / 4", "1 / 1", "4 / 5", "1 / 1", "3 / 4", "4 / 5"].forEach((ratio) => {
      const fig = document.createElement("figure");
      fig.className = "mood__item";
      fig.innerHTML = `<div class="mood__placeholder" style="aspect-ratio:${ratio}">Inspiration à venir</div>`;
      board.appendChild(fig);
    });
    return;
  }

  items.forEach((it) => {
    const fig = document.createElement("figure");
    fig.className = "mood__item";
    const img = document.createElement("img");
    img.src = it.image;
    img.alt = it.legende || "Inspiration de tenue";
    img.loading = "lazy";
    fig.appendChild(img);
    if (it.legende) {
      const cap = document.createElement("figcaption");
      cap.textContent = it.legende;
      fig.appendChild(cap);
    }
    board.appendChild(fig);
  });
})();
