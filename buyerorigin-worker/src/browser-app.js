export const SAMPLE_CSV = `order_id,email,phone,address,discount_code,order_date,order_total,discount_amount,is_new_customer_offer
BO-1001,alex.smith+first@gmail.com,(512) 555-0101,10 Oak Street Apt 2,WELCOME20,2026-08-01,100.00,20.00,true
BO-1002,jordan@example.com,512-555-0144,55 Pine Road,WELCOME20,2026-08-03,85.00,17.00,true
BO-1003,alexsmith@gmail.com,5125550101,902 Lake Avenue,WELCOME20,2026-08-09,120.00,24.00,true
BO-1004,taylor@example.com,512-555-0188,77 Hill Boulevard,SUMMER10,2026-08-12,64.00,6.40,false
BO-1005,jordan.new@example.com,5125550144,55 Pine Rd Unit B,WELCOME20,2026-08-16,95.00,19.00,true
BO-1006,casey@example.com,512-555-0199,42 Cedar Street,WELCOME20,2026-08-20,72.00,14.40,true`;
export const BROWSER_APP = String.raw`
(function () {
  "use strict";
  const sample = ${JSON.stringify(SAMPLE_CSV)}; const el = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0); let lastAudit = null;
  function setStatus(message, kind) { const node = el("statusMessage"); node.textContent = message; node.dataset.kind = kind || "info"; }
  function clearTable() { el("resultsBody").replaceChildren(); el("resultsEmpty").hidden = false; el("exportButton").disabled = true; }
  function render(audit) {
    lastAudit = audit; el("ordersValue").textContent = audit.totals.orders; el("promoValue").textContent = audit.totals.promotion_uses; el("flaggedValue").textContent = audit.totals.flagged; el("leakageValue").textContent = money(audit.totals.estimated_leakage);
    const body = el("resultsBody"); body.replaceChildren();
    audit.results.forEach((row) => { const tr = document.createElement("tr"); const values = [row.order_id, row.order_date, row.discount_code || "None", row.status, row.risk, row.action, row.reason_codes.join(" + ") || row.note, row.matched_order_id || "None", money(row.discount_amount)]; values.forEach((value, index) => { const cell = document.createElement("td"); cell.textContent = value; if (index === 3) cell.dataset.status = row.status.toLowerCase(); tr.appendChild(cell); }); body.appendChild(tr); });
    el("resultsEmpty").hidden = audit.results.length > 0; el("exportButton").disabled = !audit.results.length;
    setStatus("Audit complete in " + (audit.mode === "enforce" ? "enforcement simulation" : "monitor mode") + ".  " + audit.totals.flagged + " order(s) need merchant review.", "success");
  }
  function analyze() { try { const allowlist = el("allowlist").value.split(/[\n,]/).map((value) => value.trim()).filter(Boolean); render(window.BuyerOriginEngine.audit(el("csvInput").value, { mode: el("mode").value, allowlist })); } catch (error) { clearTable(); setStatus(error && error.message ? error.message : "The audit could not be completed.", "error"); } }
  function csvEscape(value) { const text = String(value == null ? "" : value); return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text; }
  function exportCsv() { if (!lastAudit) return; const header = ["order_id","order_date","discount_code","status","risk","action","reason_codes","matched_order_id","discount_amount","note"]; const rows = lastAudit.results.map((row) => header.map((key) => csvEscape(key === "reason_codes" ? row.reason_codes.join("|") : row[key])).join(",")); const blob = new Blob([[header.join(","), ...rows].join("\n") + "\n"], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "buyerorigin-audit-results.csv"; document.body.appendChild(link); link.click(); URL.revokeObjectURL(link.href); link.remove(); }
  el("sampleButton").addEventListener("click", () => { el("csvInput").value = sample; setStatus("Sample orders loaded.  Run the audit to see the two-signal rule."); }); el("analyzeButton").addEventListener("click", analyze); el("exportButton").addEventListener("click", exportCsv);
  el("csvFile").addEventListener("change", (event) => { const file = event.target.files && event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { el("csvInput").value = String(reader.result || ""); setStatus("CSV loaded in this browser only.  Run the audit when ready."); }; reader.onerror = () => setStatus("The CSV could not be read.", "error"); reader.readAsText(file); }); clearTable();
})();
`;
