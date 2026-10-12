
const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  const closeMenu = () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };
  nav.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (!link) return;
    closeMenu();
    const destination = new URL(link.href);
    if (destination.pathname === location.pathname && destination.hash) {
      const section = document.getElementById(destination.hash.slice(1));
      if (section) {
        section.setAttribute("tabindex", "-1");
        section.focus({ preventScroll: true });
        section.addEventListener("blur", () => section.removeAttribute("tabindex"), { once: true });
      }
    }
  });
  nav.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenu();
      toggle.focus();
    }
  });
  matchMedia("(max-width: 1100px)").addEventListener("change", closeMenu);
}
document.querySelectorAll(".faq-q").forEach(btn => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".faq-item");
    const open = item.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
    btn.querySelector("span:last-child").textContent = open ? "−" : "+";
  });
});
document.querySelectorAll("[data-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach(x => {
      x.classList.remove("active");
      x.setAttribute("aria-pressed", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
    const filter = btn.dataset.filter;
    document.querySelectorAll("[data-project]").forEach(card => {
      card.hidden = filter !== "all" && card.dataset.project !== filter;
    });
  });
});
const initialFilter = new URLSearchParams(location.search).get("filter");
if (initialFilter) {
  Array.from(document.querySelectorAll("[data-filter]"))
    .find(button => button.dataset.filter === initialFilter)?.click();
}
const form = document.querySelector("#estimate-form");
if (form) {
  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = new FormData(form);
    const status = document.querySelector("#form-status");
    const required = ["name","phone","email","projectType","details"];
    if (required.some(k => !String(data.get(k) || "").trim())) {
      status.textContent = "Please complete all required fields.";
      return;
    }
    const subject = encodeURIComponent("Legacy TileWorks estimate request - " + data.get("projectType"));
    const body = encodeURIComponent(
`Name: ${data.get("name")}
Phone: ${data.get("phone")}
Email: ${data.get("email")}
Location: ${data.get("location")}
Project type: ${data.get("projectType")}
Timeline: ${data.get("timeline")}
Budget: ${data.get("budget")}

Project details:
${data.get("details")}`
    );
    status.textContent = "Opening your email application. Replace estimates@example.com before launch.";
    window.location.href = `mailto:estimates@example.com?subject=${subject}&body=${body}`;
  });
}
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();


const lightbox = document.querySelector("#lightbox");
if (lightbox) {
  // A body-level dialog lets every other page region become inert independently.
  document.body.append(lightbox);
  const lightboxImage = lightbox.querySelector("img");
  const lightboxCaption = lightbox.querySelector("p");
  const closeButton = lightbox.querySelector(".lightbox-close");
  let trigger;
  let previousOverflow;
  let background = [];
  const closeLightbox = () => {
    lightbox.hidden = true;
    lightboxImage.removeAttribute("src");
    background.forEach(([element, wasInert]) => { element.inert = wasInert; });
    document.body.style.overflow = previousOverflow;
    trigger?.focus({ preventScroll: true });
  };
  document.querySelectorAll(".gallery-open").forEach(button => {
    button.addEventListener("click", () => {
      trigger = button;
      previousOverflow = document.body.style.overflow;
      lightboxImage.src = button.dataset.full;
      lightboxImage.alt = button.dataset.title || "Project image";
      lightboxCaption.textContent = button.dataset.title || "";
      lightbox.hidden = false;
      background = Array.from(document.body.children)
        .filter(element => element !== lightbox && !["SCRIPT", "STYLE"].includes(element.tagName))
        .map(element => [element, element.inert]);
      background.forEach(([element]) => { element.inert = true; });
      document.body.style.overflow = "hidden";
      closeButton.focus();
    });
  });
  lightbox.querySelector(".lightbox-close")?.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", event => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", event => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    }
    if (event.key === "Tab") {
      // The close button is the only interactive control in this image viewer.
      event.preventDefault();
      closeButton.focus();
    }
  });
}
