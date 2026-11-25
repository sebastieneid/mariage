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
