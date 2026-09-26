(() => {
  "use strict";

  if (document.body?.dataset.siteAgent === "off") return;

  const cfg = Object.assign({
    endpoint: "https://helper.clintware.com",
    label: "Ask Clintware"
  }, window.CLINTWARE_SITE_AGENT || {});

  const endpoint = String(cfg.endpoint || "").replace(/\/$/, "");
  if (!endpoint) return;

  const timeoutFetch = async (url, options = {}, timeout = 3000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, {...options, signal: controller.signal});
    } finally {
      clearTimeout(timer);
    }
  };

  const sessionKey = "cw_site_agent_session";
  let sessionId = sessionStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : ("cw-" + Date.now() + "-" + Math.random().toString(16).slice(2));
    sessionStorage.setItem(sessionKey, sessionId);
  }

  const messages = [];
  let escalated = false;
  let handoffTimer = null;

  const addMessage = (list, role, text) => {
    const item = document.createElement("div");
    item.className = "cw-agent-message cw-agent-message-" + role;
    item.textContent = text;
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
  };

  const page = () => ({
    url: location.origin + location.pathname,
    path: location.pathname,
    title: document.title
  });

  async function checkHandoff(list) {
    if (!escalated) return;
    try {
      const response = await timeoutFetch(endpoint + "/api/handoff?session_id=" + encodeURIComponent(sessionId), {
        headers:{"accept":"application/json"}
      }, 3500);
      if (!response.ok) return;
      const data = await response.json();
      const ownerReply = data?.data?.reply || data?.data?.owner_reply || "";
      if (ownerReply) {
        escalated = false;
        if (handoffTimer) clearInterval(handoffTimer);
        addMessage(list, "assistant", "Clint replied: " + String(ownerReply));
      }
    } catch (_error) {}
  }

  async function boot() {
    let health;
    try {
      const response = await timeoutFetch(endpoint + "/api/health", {headers:{"accept":"application/json"}}, 2800);
      if (!response.ok) return;
      health = await response.json();
      if (!health?.ok) return;
    } catch (_error) {
      return;
    }

    const root = document.createElement("section");
    root.className = "cw-agent-root";
    root.setAttribute("aria-label","Clintware AI helper");

    const toggle = document.createElement("button");
    toggle.className = "cw-agent-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded","false");
    toggle.textContent = cfg.label;

    const panel = document.createElement("div");
    panel.className = "cw-agent-panel";
    panel.hidden = true;
    panel.innerHTML = [
      '<div class="cw-agent-head">',
      '<div><strong>Clint\'s AI helper</strong><span>Answers from verified context. Escalates when needed.</span></div>',
      '<button type="button" class="cw-agent-close" aria-label="Close chat">×</button>',
      '</div>',
      '<div class="cw-agent-log" role="log" aria-live="polite"></div>',
      '<form class="cw-agent-form">',
      '<label class="sr-only" for="cw-agent-input">Ask a question</label>',
      '<textarea id="cw-agent-input" rows="2" maxlength="3000" placeholder="Ask about Clintware, products, projects, or working with Clint."></textarea>',
      '<div class="cw-agent-form-row"><span class="cw-agent-status">AI helper, not a human.</span><button type="submit">Send</button></div>',
      '</form>'
    ].join("");

    root.append(toggle,panel);
    document.body.appendChild(root);

    const close = panel.querySelector(".cw-agent-close");
    const form = panel.querySelector(".cw-agent-form");
    const input = panel.querySelector("textarea");
    const list = panel.querySelector(".cw-agent-log");
    const status = panel.querySelector(".cw-agent-status");
    const send = form.querySelector('button[type="submit"]');

    addMessage(list,"assistant","I’m Clint’s AI helper. I can answer from verified Clintware context and route questions to Clint when I do not have a reliable answer.");

    const setOpen = (open) => {
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded",String(open));
      if (open) input.focus();
    };

    toggle.addEventListener("click", () => setOpen(panel.hidden));
    close.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      messages.push({role:"user",content:text});
      addMessage(list,"user",text);
      input.value = "";
      send.disabled = true;
      status.textContent = "Checking verified context…";

      try {
        const response = await timeoutFetch(endpoint + "/api/chat", {
          method:"POST",
          headers:{"content-type":"application/json","accept":"application/json"},
          body:JSON.stringify({
            session_id:sessionId,
            page:page(),
            messages:messages.slice(-12)
          })
        }, 25000);

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.detail || data?.error || "request_failed");

        const reply = String(data.reply || "I do not have a verified answer yet.");
        messages.push({role:"assistant",content:reply});
        addMessage(list,"assistant",reply);

        if (data.action?.requires_visitor_confirmation) {
          const confirm = document.createElement("button");
          confirm.type = "button";
          confirm.className = "cw-agent-confirm";
          confirm.textContent = "Confirm requested action";
          confirm.addEventListener("click", async () => {
            confirm.disabled = true;
            messages.push({role:"user",content:"I confirm the exact action you just proposed."});
            addMessage(list,"user","I confirm that action.");
            status.textContent = "Requesting the confirmed action…";
            try {
              const r = await timeoutFetch(endpoint + "/api/chat", {
                method:"POST",
                headers:{"content-type":"application/json","accept":"application/json"},
                body:JSON.stringify({
                  session_id:sessionId,
                  page:page(),
                  messages:messages.slice(-12),
                  visitor_confirmed:true
                })
              },25000);
              const d = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error(d?.detail || d?.error || "action_failed");
              const actionReply = String(d.reply || (d.action?.ok ? "The confirmed action completed." : "The action could not be completed."));
              messages.push({role:"assistant",content:actionReply});
              addMessage(list,"assistant",actionReply);
              status.textContent = d.action?.ok ? "Action completed." : "Action not completed.";
            } catch (_error) {
              addMessage(list,"assistant","I could not complete that action. I did not mark it as completed.");
              status.textContent = "Action failed safely.";
            }
          });
          list.appendChild(confirm);
        }

        if (data.escalated) {
          escalated = Boolean(data.handoff_delivered);
          status.textContent = data.handoff_delivered ? "Question routed to Clint." : "Owner relay is not connected.";
          if (escalated && !handoffTimer) {
            handoffTimer = setInterval(() => checkHandoff(list), 10000);
            setTimeout(() => {
              if (handoffTimer) clearInterval(handoffTimer);
              handoffTimer = null;
            }, 5 * 60 * 1000);
          }
        } else if (!data.action?.requires_visitor_confirmation) {
          status.textContent = "Ready.";
        }
      } catch (_error) {
        addMessage(list,"assistant","The helper is temporarily unavailable. No action was taken.");
        status.textContent = "Unavailable.";
      } finally {
        send.disabled = false;
        input.focus();
      }
    });
  }

  boot();
})();
