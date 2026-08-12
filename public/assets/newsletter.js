(() => {
  const form = document.querySelector("[data-newsletter-form]");
  if (!form) return;

  const status = form.querySelector("[data-newsletter-status]");
  const submit = form.querySelector('button[type="submit"]');

  const setStatus = (message, state = "") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const email = form.elements.email.value.trim();
    const consent = Boolean(form.elements.consent.checked);
    const website = form.elements.website.value;

    submit.disabled = true;
    setStatus("Adding you to the confirmation queue…");

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, website }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "The subscription request could not be completed.");
      }

      form.reset();
      setStatus(payload.message || "Check your inbox to confirm your subscription.", "success");
      if (typeof window.gtag === "function") {
        window.gtag("event", "newsletter_subscribe_request", { location: "blog" });
      }
    } catch (error) {
      setStatus(error.message || "The subscription request could not be completed. Please try again.", "error");
    } finally {
      submit.disabled = false;
    }
  });
})();
