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
    const pointer = {
      x: innerWidth * 0.68,
      y: innerHeight * 0.34,
      tx: innerWidth * 0.68,
      ty: innerHeight * 0.34,
    };
    let dpr = Math.min(devicePixelRatio || 1, 1.5);
    let width = innerWidth;
    let height = innerHeight;
    let time = 0;

    const reset = () => {
      width = innerWidth;
      height = innerHeight;
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener("pointermove", (event) => {
      pointer.tx = event.clientX;
      pointer.ty = event.clientY;
    }, { passive: true });

    window.addEventListener("pointerleave", () => {
      pointer.tx = width * 0.68;
      pointer.ty = height * 0.34;
    }, { passive: true });

    window.addEventListener("resize", reset, { passive: true });
    reset();

    const draw = () => {
      time += 0.006;
      pointer.x += (pointer.tx - pointer.x) * 0.055;
      pointer.y += (pointer.ty - pointer.y) * 0.055;
      ctx.clearRect(0, 0, width, height);

      const lineCount = width < 700 ? 10 : 18;
      const top = height * 0.08;
      const fieldHeight = height * 0.72;
      const step = width < 700 ? 32 : 26;

      for (let i = 0; i < lineCount; i += 1) {
        const ratio = lineCount === 1 ? 0 : i / (lineCount - 1);
        const baseY = top + fieldHeight * ratio;
        ctx.beginPath();

        for (let x = -step; x <= width + step; x += step) {
          const wave =
            Math.sin(x * 0.006 + time * 1.15 + i * 0.41) * 7 +
            Math.sin(x * 0.0022 - time * 0.7 + i * 0.78) * 4;

          const dx = x - pointer.x;
          const dy = baseY - pointer.y;
          const radial = Math.exp(-((dx * dx) / (2 * 250 * 250) + (dy * dy) / (2 * 205 * 205)));
          const pull = (pointer.y - baseY) * 0.115 * radial;
          const curl = Math.sin(dx * 0.014 + i * 0.22) * 10 * radial;
          const y = baseY + wave + pull + curl;

          if (x === -step) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const emphasis = i % 5 === 0;
        ctx.strokeStyle = emphasis
          ? "rgba(168,148,255,0.075)"
          : "rgba(104,228,246,0.065)";
        ctx.lineWidth = emphasis ? 0.8 : 0.65;
        ctx.stroke();
      }

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