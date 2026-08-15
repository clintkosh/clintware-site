(() => {
  const ventureStylesheet = document.createElement("link");
  ventureStylesheet.rel = "stylesheet";
  ventureStylesheet.href = "/assets/venture.css";
  document.head.appendChild(ventureStylesheet);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion) {
    const canvas = document.createElement("canvas");
    canvas.className = "cw-flow-field";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });
    const pointer = { x: innerWidth * 0.68, y: innerHeight * 0.34, tx: innerWidth * 0.68, ty: innerHeight * 0.34 };
    let dpr = Math.min(devicePixelRatio || 1, 1.5);
    let width = innerWidth;
    let height = innerHeight;
    let particles = [];
    let frame = 0;

    const makeParticle = (index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      px: 0,
      py: 0,
      speed: 0.28 + Math.random() * 0.42,
      phase: Math.random() * Math.PI * 2,
      seed: index * 0.37 + Math.random() * 4,
    });

    const reset = () => {
      width = innerWidth;
      height = innerHeight;
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(32, Math.min(78, Math.floor(width / 18)));
      particles = Array.from({ length: count }, (_, index) => makeParticle(index));
    };

    const movePointer = (event) => {
      pointer.tx = event.clientX;
      pointer.ty = event.clientY;
    };
    window.addEventListener("pointermove", movePointer, { passive: true });
    window.addEventListener("resize", reset, { passive: true });
    reset();

    const draw = () => {
      frame += 0.006;
      pointer.x += (pointer.tx - pointer.x) * 0.045;
      pointer.y += (pointer.ty - pointer.y) * 0.045;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 0.72;

      particles.forEach((p, index) => {
        p.px = p.x;
        p.py = p.y;

        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const dist = Math.max(80, Math.hypot(dx, dy));
        const influence = Math.min(1, 250 / dist);
        const base = Math.sin((p.y / Math.max(height, 1)) * 4.8 + frame * 2 + p.seed) * 0.62;
        const curl = Math.cos((p.x / Math.max(width, 1)) * 3.7 - frame * 1.3 + p.phase) * 0.42;
        const angle = base + curl + Math.atan2(dy, dx) * influence * 0.17;

        p.x += Math.cos(angle) * p.speed * (1 + influence * 0.35);
        p.y += Math.sin(angle) * p.speed * (1 + influence * 0.35);

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        const alpha = 0.07 + influence * 0.13 + (index % 5 === 0 ? 0.035 : 0);
        ctx.strokeStyle = `rgba(104,228,246,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      });

      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

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
    routeTools.setAttribute("aria-label", "Page navigation");
    routeTools.innerHTML = '<button type="button" data-cw-back>← Back</button><span aria-hidden="true">/</span><a href="/">Home</a>';
    const firstSection = main.firstElementChild;
    if (firstSection?.classList.contains("page-hero")) {
      routeTools.className = "cw-route-tools";
      const target = firstSection.querySelector(".container");
      if (target) target.prepend(routeTools);
      else firstSection.prepend(routeTools);
    } else {
      routeTools.className = "cw-route-tools container";
      main.prepend(routeTools);
    }
    routeTools.querySelector("[data-cw-back]")?.addEventListener("click", () => {
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