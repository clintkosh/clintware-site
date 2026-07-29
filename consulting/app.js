(function () {
  "use strict";

  const CURRENCY = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  function clampNumber(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function calculateBurden(teamMembers, hoursWeekly, hourlyCost) {
    const people = clampNumber(teamMembers, 1, 50, 1);
    const hours = clampNumber(hoursWeekly, 1, 30, 1);
    const cost = clampNumber(hourlyCost, 20, 500, 20);
    const weeklyHours = people * hours;
    const monthlyHours = Math.round(weeklyHours * 52 / 12);
    const annualCost = Math.round(weeklyHours * cost * 52);

    return {
      people,
      hours,
      cost,
      weeklyHours,
      monthlyHours,
      annualCost
    };
  }

  function validateLead(values) {
    const errors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const name = String(values.name || "").trim();
    const email = String(values.email || "").trim();
    const company = String(values.company || "").trim();
    const service = String(values.service || "").trim();
    const challenge = String(values.challenge || "").trim();

    if (name.length < 2) errors.name = "Enter your name.";
    if (!emailPattern.test(email)) errors.email = "Enter a valid work email.";
    if (company.length < 2) errors.company = "Enter your company name.";
    if (!service) errors.service = "Select the primary need.";
    if (challenge.length < 20) errors.challenge = "Add at least 20 characters about the operational burden.";

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      clean: { name, email, company, service, challenge }
    };
  }

  function buildMailto(values) {
    const validation = validateLead(values);
    const clean = validation.clean;
    const subject = `Clintware Consulting request: ${clean.service || "Operational assessment"}`;
    const body = [
      "Clintware Consulting Request",
      "",
      `Name: ${clean.name}`,
      `Work email: ${clean.email}`,
      `Company: ${clean.company}`,
      `Primary need: ${clean.service}`,
      "",
      "Operational burden:",
      clean.challenge,
      "",
      "Requested next step: Support-margin and operating-process review."
    ].join("\n");

    return `mailto:hello@clintware.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function initCalculator() {
    const form = document.getElementById("burdenCalculator");
    if (!form) return;

    const teamMembers = document.getElementById("teamMembers");
    const hoursWeekly = document.getElementById("hoursWeekly");
    const hourlyCost = document.getElementById("hourlyCost");
    const teamMembersOutput = document.getElementById("teamMembersOutput");
    const hoursWeeklyOutput = document.getElementById("hoursWeeklyOutput");
    const annualBurden = document.getElementById("annualBurden");
    const burdenSummary = document.getElementById("burdenSummary");

    function update() {
      const result = calculateBurden(teamMembers.value, hoursWeekly.value, hourlyCost.value);
      teamMembers.value = String(result.people);
      hoursWeekly.value = String(result.hours);
      hourlyCost.value = String(result.cost);
      teamMembersOutput.value = String(result.people);
      teamMembersOutput.textContent = String(result.people);
      hoursWeeklyOutput.value = `${result.hours} hrs`;
      hoursWeeklyOutput.textContent = `${result.hours} hrs`;
      annualBurden.textContent = CURRENCY.format(result.annualCost);
      burdenSummary.textContent = `${result.monthlyHours.toLocaleString("en-US")} team-hours per month diverted into customer support.`;
    }

    form.addEventListener("input", update);
    update();
  }

  function initLeadForm() {
    const form = document.getElementById("consultingForm");
    if (!form) return;

    const fieldNames = ["name", "email", "company", "service", "challenge"];
    const status = document.getElementById("formStatus");

    function valuesFromForm() {
      return Object.fromEntries(fieldNames.map((name) => [name, form.elements[name].value]));
    }

    function displayErrors(errors) {
      fieldNames.forEach((name) => {
        const field = form.elements[name];
        const error = document.getElementById(`${name}Error`);
        const message = errors[name] || "";
        field.setAttribute("aria-invalid", message ? "true" : "false");
        if (error) error.textContent = message;
      });
    }

    fieldNames.forEach((name) => {
      form.elements[name].addEventListener("input", () => {
        const validation = validateLead(valuesFromForm());
        const error = document.getElementById(`${name}Error`);
        const message = validation.errors[name] || "";
        form.elements[name].setAttribute("aria-invalid", message ? "true" : "false");
        if (error) error.textContent = message;
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = valuesFromForm();
      const validation = validateLead(values);
      displayErrors(validation.errors);

      if (!validation.valid) {
        status.textContent = "Complete the highlighted fields before creating the request.";
        status.style.color = "var(--danger)";
        const firstInvalid = fieldNames.find((name) => validation.errors[name]);
        if (firstInvalid) form.elements[firstInvalid].focus();
        return;
      }

      status.textContent = "Opening a structured email request addressed to Clintware.";
      status.style.color = "var(--green)";
      window.location.href = buildMailto(values);
    });
  }

  function initNavigation() {
    const header = document.querySelector(".site-header");
    const toggle = document.getElementById("menuToggle");
    const mobileNav = document.getElementById("mobileNav");

    function updateHeader() {
      if (header) header.classList.toggle("scrolled", window.scrollY > 16);
    }

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    if (!toggle || !mobileNav) return;

    function closeMenu() {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
      mobileNav.hidden = true;
      document.body.classList.remove("menu-open");
    }

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Open navigation" : "Close navigation");
      mobileNav.hidden = open;
      document.body.classList.toggle("menu-open", !open);
    });

    mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1080) closeMenu();
    });
  }

  function initReveal() {
    const elements = document.querySelectorAll(".reveal");
    if (!elements.length) return;

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px" });

    elements.forEach((element) => observer.observe(element));
  }

  function initCursorAura() {
    const aura = document.getElementById("cursorAura");
    if (!aura || window.matchMedia("(pointer: coarse)").matches) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let frameId = null;

    function animate() {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      aura.style.transform = `translate3d(${currentX - 210}px, ${currentY - 210}px, 0)`;
      frameId = window.requestAnimationFrame(animate);
    }

    window.addEventListener("pointermove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      aura.style.opacity = "1";
      if (!frameId) frameId = window.requestAnimationFrame(animate);
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", () => {
      aura.style.opacity = "0";
    });
  }

  function initDiagnostics() {
    function updateViewportFit() {
      const fits = document.documentElement.scrollWidth <= window.innerWidth + 1;
      document.documentElement.dataset.viewportFits = String(fits);
    }

    document.documentElement.dataset.appReady = "true";
    updateViewportFit();
    window.addEventListener("resize", updateViewportFit);
  }

  function initYear() {
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function init() {
    initCalculator();
    initLeadForm();
    initNavigation();
    initReveal();
    initCursorAura();
    initDiagnostics();
    initYear();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculateBurden, validateLead, buildMailto, clampNumber };
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  }
})();
