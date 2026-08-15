(() => {
  const ventureStylesheet = document.createElement("link");
  ventureStylesheet.rel = "stylesheet";
  ventureStylesheet.href = "/assets/venture.css";
  document.head.appendChild(ventureStylesheet);

  const typographyStylesheet = document.createElement("link");
  typographyStylesheet.rel = "stylesheet";
  typographyStylesheet.href = "/assets/typography-lock.css";
  document.head.appendChild(typographyStylesheet);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Site-wide ambient flow. Kept deliberately low contrast so content remains primary. */
  if (!reducedMotion) {
    const canvas = document.createElement("canvas");
    canvas.className = "cw-ambient-flow";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };

    const resizeFlow = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!pointer.x && !pointer.y) {
        pointer.x = pointer.tx = width * 0.58;
        pointer.y = pointer.ty = height * 0.28;
      }
    };

    const drawFlow = () => {
      frame += 0.006;
      pointer.x += (pointer.tx - pointer.x) * 0.045;
      pointer.y += (pointer.ty - pointer.y) * 0.045;
      ctx.clearRect(0, 0, width, height);

      const strands = width < 700 ? 8 : 13;
      const span = height / (strands + 1);
      for (let i = 0; i < strands; i += 1) {
        const baseY = span * (i + 1);
        const phase = frame * (0.7 + i * 0.025) + i * 0.72;
        const pointerDistance = Math.abs(baseY - pointer.y);
        const influence = Math.exp(-(pointerDistance * pointerDistance) / (2 * 170 * 170));
        const bendY = (pointer.y - baseY) * influence * 0.14;
        const bendX = (pointer.x - width * 0.5) * influence * 0.07;

        ctx.beginPath();
        ctx.moveTo(-80, baseY + Math.sin(phase) * 10);
        ctx.bezierCurveTo(
          width * 0.27 + bendX,
          baseY + Math.sin(phase + 0.8) * 20 + bendY * 0.35,
          width * 0.68 + bendX * 0.5,
          baseY + Math.sin(phase + 1.6) * 24 + bendY,
          width + 80,
          baseY + Math.sin(phase + 2.2) * 11
        );
        ctx.lineWidth = i % 4 === 0 ? 1.05 : 0.7;
        ctx.strokeStyle = i % 5 === 0
          ? `rgba(157,135,255,${0.026 + influence * 0.025})`
          : `rgba(94,231,247,${0.025 + influence * 0.032})`;
        ctx.stroke();
      }

      requestAnimationFrame(drawFlow);
    };

    window.addEventListener("pointermove", (event) => {
      pointer.tx = event.clientX;
      pointer.ty = event.clientY;
      pointer.active = true;
    }, { passive: true });
    document.addEventListener("pointerleave", () => {
      pointer.tx = width * 0.58;
      pointer.ty = height * 0.28;
      pointer.active = false;
    }, { passive: true });
    window.addEventListener("resize", resizeFlow, { passive: true });
    resizeFlow();
    drawFlow();
  }

  /* Refined entrance motion based on reading flow, not decorative bouncing. */
  const revealTargets = document.querySelectorAll(
    ".cw-simple-hero-copy,.cw-demo-wrap,.cw-centered-heading,.cw-three-up,.cw-orbit-wrap,.cw-feature-grid,.cw-progress-strip,.cw-product-cards,.cw-cta-panel"
  );
  revealTargets.forEach((el) => el.classList.add("cw-reveal"));
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    revealTargets.forEach((el) => revealObserver.observe(el));
  }

  /* Legacy AgentBridge topology support for any page that still uses it. */
  const network = document.querySelector("[data-cw-network]");
  const networkCanvas = network?.querySelector("[data-cw-network-canvas]");
  if (network && networkCanvas) {
    const ctx = networkCanvas.getContext("2d", { alpha: true });
    const nodeEls = new Map(
      [...network.querySelectorAll("[data-cw-net-node]")].map((el) => [el.dataset.cwNetNode, el])
    );
    const links = [["planner", "broker"], ["broker", "local"], ["local", "result"]];
    let width = 0;
    let height = 0;
    let dpr = Math.min(devicePixelRatio || 1, 1.5);
    let raf = 0;
    let time = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const resize = () => {
      const rect = network.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      networkCanvas.width = Math.floor(width * dpr);
      networkCanvas.height = Math.floor(height * dpr);
      networkCanvas.style.width = `${width}px`;
      networkCanvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!pointer.tx && !pointer.ty) {
        pointer.x = pointer.tx = width * 0.72;
        pointer.y = pointer.ty = height * 0.28;
      }
    };

    const centerOf = (el) => {
      const panelRect = network.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      return { x: rect.left - panelRect.left + rect.width / 2, y: rect.top - panelRect.top + rect.height / 2 };
    };

    const cubicPoint = (p0, p1, p2, p3, t) => {
      const mt = 1 - t;
      const mt2 = mt * mt;
      const t2 = t * t;
      return {
        x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
        y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
      };
    };

    const controlPoints = (a, b) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const mid = { x: a.x + dx * 0.5, y: a.y + dy * 0.5 };
      const distance = Math.hypot(pointer.x - mid.x, pointer.y - mid.y);
      const influence = Math.exp(-(distance * distance) / (2 * 220 * 220));
      let c1;
      let c2;
      if (Math.abs(dx) >= Math.abs(dy)) {
        c1 = { x: a.x + dx * 0.42, y: a.y };
        c2 = { x: b.x - dx * 0.42, y: b.y };
      } else {
        c1 = { x: a.x, y: a.y + dy * 0.42 };
        c2 = { x: b.x, y: b.y - dy * 0.42 };
      }
      const bend = reducedMotion ? 0 : influence * 0.095;
      c1.x += (pointer.x - c1.x) * bend;
      c1.y += (pointer.y - c1.y) * bend;
      c2.x += (pointer.x - c2.x) * bend;
      c2.y += (pointer.y - c2.y) * bend;
      return { c1, c2 };
    };

    const strokeCurve = (a, c1, c2, b) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
      ctx.stroke();
    };

    const draw = () => {
      if (!width || !height) resize();
      time += reducedMotion ? 0 : 0.014;
      pointer.x += (pointer.tx - pointer.x) * 0.075;
      pointer.y += (pointer.ty - pointer.y) * 0.075;
      ctx.clearRect(0, 0, width, height);
      links.forEach(([from, to], index) => {
        const fromEl = nodeEls.get(from);
        const toEl = nodeEls.get(to);
        if (!fromEl || !toEl) return;
        const a = centerOf(fromEl);
        const b = centerOf(toEl);
        const { c1, c2 } = controlPoints(a, b);
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(184,202,222,0.18)";
        strokeCurve(a, c1, c2, b);
        ctx.setLineDash([4, 8]);
        ctx.lineDashOffset = -(time * 24 + index * 7);
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = index === 1 ? "rgba(94,231,247,0.60)" : index === 2 ? "rgba(157,135,255,0.42)" : "rgba(94,231,247,0.34)";
        strokeCurve(a, c1, c2, b);
        ctx.setLineDash([]);
        const t = reducedMotion ? 0.64 : (time * 0.12 + index * 0.29) % 1;
        const dot = cubicPoint(a, c1, c2, b, t);
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, index === 1 ? 2.2 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = index === 1 ? "rgba(186,247,255,0.96)" : index === 2 ? "rgba(157,135,255,0.86)" : "rgba(94,231,247,0.80)";
        ctx.fill();
      });
      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };

    network.addEventListener("pointermove", (event) => {
      const rect = network.getBoundingClientRect();
      pointer.tx = clamp(event.clientX - rect.left, 0, rect.width);
      pointer.ty = clamp(event.clientY - rect.top, 0, rect.height);
      network.style.setProperty("--px", `${(pointer.tx / rect.width) * 100}%`);
      network.style.setProperty("--py", `${(pointer.ty / rect.height) * 100}%`);
    }, { passive: true });
    network.addEventListener("pointerleave", () => {
      pointer.tx = width * 0.72;
      pointer.ty = height * 0.28;
      network.style.setProperty("--px", "72%");
      network.style.setProperty("--py", "28%");
    }, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(network);
    resize();
    draw();
    window.addEventListener("pagehide", () => { if (raf) cancelAnimationFrame(raf); }, { once: true });
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