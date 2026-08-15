(() => {
  const editorialStylesheet = document.createElement("link");
  editorialStylesheet.rel = "stylesheet";
  editorialStylesheet.href = "/assets/editorial.css";
  document.head.appendChild(editorialStylesheet);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const extraRevealTargets = document.querySelectorAll(
    ".cw-hero-facts,.cw-story-copy,.cw-story-detail,.cw-direction-head"
  );
  extraRevealTargets.forEach((el) => el.classList.add("cw-reveal"));

  if (reducedMotion || !("IntersectionObserver" in window)) {
    extraRevealTargets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries, instance) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      instance.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  extraRevealTargets.forEach((el) => observer.observe(el));
})();