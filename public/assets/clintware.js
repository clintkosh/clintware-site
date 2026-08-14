(() => {
  const ventureStylesheet = document.createElement("link");
  ventureStylesheet.rel = "stylesheet";
  ventureStylesheet.href = "/assets/venture.css";
  document.head.appendChild(ventureStylesheet);

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  const nav = document.querySelector("[data-site-nav]");
  const currentPath = location.pathname;
  if (nav) {
    const routes = [
      ["Home", "/", currentPath === "/"],
      ["Products", "/tools/", currentPath.startsWith("/tools/")],
      ["Skills", "/skills/", currentPath.startsWith("/skills/")],
      ["Build Notes", "/blog/", currentPath.startsWith("/blog/")],
      ["Contact", "/contact/", currentPath.startsWith("/contact/")],
    ];
    nav.innerHTML = routes.map(([label, href, active]) => `<a href="${href}"${active ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  }

  const main = document.querySelector("main");
  if (main && currentPath !== "/" && !document.querySelector(".cw-route-tools")) {
    const routeTools = document.createElement("div");
    routeTools.className = "cw-route-tools container";
    routeTools.setAttribute("aria-label", "Page navigation");
    routeTools.innerHTML = '<button type="button" data-cw-back>← Back</button><span aria-hidden="true">/</span><a href="/">Home</a>';
    const firstSection = main.firstElementChild;
    if (firstSection?.classList.contains("page-hero")) {
      const target = firstSection.querySelector(".container");
      if (target) target.prepend(routeTools);
    } else {
      main.prepend(routeTools);
    }
    const back = routeTools.querySelector("[data-cw-back]");
    back?.addEventListener("click", () => {
      if (history.length > 1) history.back();
      else location.href = "/";
    });
  }

  const toggle = document.querySelector("[data-nav-toggle]");
  if (toggle && nav) {
    const close = () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  const filterButtons = [...document.querySelectorAll("[data-tool-filter]")];
  const toolCards = [...document.querySelectorAll("[data-tool-category]")];
  if (filterButtons.length && toolCards.length) {
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.toolFilter;
        filterButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        toolCards.forEach((card) => {
          const categories = (card.dataset.toolCategory || "").split(/\s+/).filter(Boolean);
          card.hidden = filter !== "all" && !categories.includes(filter);
        });
      });
    });
  }
})();
