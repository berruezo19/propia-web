/* =========================================================
   GENERADOR DE OFERTAS DE COMPRA
   - Vista previa en tiempo real
   - Cálculo de arras, diferencia con precio de salida, pendiente en notaría
   - Imprimir / PDF, enviar por email, guardar borrador (localStorage)
   ========================================================= */
(() => {
  const C = window.CONFIG, P = window.PROPERTIES, eur = window.fmtEUR;
  const form = document.getElementById("offerForm");
  const doc = document.getElementById("offerDoc");
  const summary = document.getElementById("offerSummary");
  const msg = document.getElementById("offerMsg");
  const sel = document.getElementById("offerProperty");
  const KEY = "propia_offer_draft";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = d => d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  // Rellenar selector con los inmuebles en venta
  P.filter(p => p.op === "venta").forEach(p => sel.add(new Option(`${p.id} · ${p.title} (${eur(p.price)})`, p.id)));

  // Fecha de notaría por defecto: +60 días
  const d60 = new Date(); d60.setDate(d60.getDate() + 60);
  form.deedDate.value = d60.toISOString().slice(0, 10);

  // Número de oferta único
  const offerNo = () => "OF-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  let currentNo = offerNo();

  function selectProperty(id) {
    sel.value = id;
    const p = P.find(x => x.id === id);
    if (p) {
      form.address.value = `${p.title}, ${p.zone}`;
      form.ref.value = p.id;
      form.askPrice.value = p.price;
      if (!form.offerPrice.value) form.offerPrice.value = Math.round(p.price * 0.95 / 1000) * 1000;
    }
    update();
  }
  window.selectOfferProperty = selectProperty;
  sel.addEventListener("change", () => selectProperty(sel.value));

  function calc() {
    const f = Object.fromEntries(new FormData(form));
    const offer = +f.offerPrice || 0, ask = +f.askPrice || 0;
    const deposit = Math.round(offer * (+f.depositPct || 0) / 100);
    const signal = Math.min(+f.signal || 0, deposit || +f.signal || 0);
    const valid = new Date(); valid.setDate(valid.getDate() + (+f.validDays || 5));
    return {
      f, offer, ask, deposit, signal,
      restDeposit: Math.max(deposit - signal, 0),
      atDeed: Math.max(offer - deposit, 0),
      diff: ask ? ((offer - ask) / ask) * 100 : null,
      valid,
      mortgage: form.mortgageCondition.checked && f.financing !== "contado",
      freeCharges: form.freeCharges.checked,
      furniture: form.furniture.checked
    };
  }

  const depositText = {
    penitenciales: "en concepto de arras penitenciales conforme al artículo 1454 del Código Civil, de modo que, si la parte compradora desiste, perderá las cantidades entregadas, y si desiste la parte vendedora, deberá devolverlas duplicadas",
    confirmatorias: "en concepto de arras confirmatorias, como parte del precio y prueba de la perfección del contrato, pudiendo las partes exigir su cumplimiento o la resolución con indemnización de daños y perjuicios",
    penales: "en concepto de arras penales, como garantía del cumplimiento, sin perjuicio de que la parte cumplidora pueda exigir el cumplimiento del contrato"
  };
  const financingText = { hipoteca: "mediante préstamo hipotecario", contado: "al contado, con fondos propios", mixta: "mediante fondos propios y préstamo hipotecario" };

  function update() {
    const c = calc(), f = c.f;
    const today = new Date();

    // Resumen rápido
    const diffCls = c.diff === null ? "" : c.diff < -10 ? "warn" : c.diff < 0 ? "ok" : "good";
    summary.innerHTML = `
      <div><span>Oferta</span><strong>${eur(c.offer)}</strong></div>
      <div><span>Arras</span><strong>${eur(c.deposit)}</strong></div>
      <div><span>En notaría</span><strong>${eur(c.atDeed)}</strong></div>
      <div class="${diffCls}"><span>vs. salida</span><strong>${c.diff === null ? "—" : (c.diff > 0 ? "+" : "") + c.diff.toFixed(1) + " %"}</strong></div>`;

    const cond = [
      c.freeCharges && "El inmueble se transmitirá libre de cargas, gravámenes, arrendatarios y ocupantes, y al corriente de pago de IBI, comunidad de propietarios y suministros.",
      c.furniture && "La venta incluye el mobiliario y electrodomésticos existentes en el inmueble en el momento de la visita.",
      c.mortgage && "La presente oferta queda condicionada a la concesión de financiación hipotecaria a la parte compradora. De no obtenerse antes de la fecha de firma, la señal será devuelta íntegramente.",
      "Los gastos e impuestos derivados de la compraventa se abonarán conforme a ley.",
      f.notes && esc(f.notes)
    ].filter(Boolean);

    doc.innerHTML = `
      <header class="doc__head">
        <div class="logo"><span class="logo__mark">P</span><span class="logo__text">Propia<small>Real Estate</small></span></div>
        <div class="doc__meta"><strong>Propuesta de compra</strong><br>Nº ${currentNo}<br>${fmtDate(today)}</div>
      </header>

      <h3>Datos del inmueble</h3>
      <p><strong>${esc(f.address) || "<em class='ph'>Dirección del inmueble</em>"}</strong>${f.ref ? ` · Ref. ${esc(f.ref)}` : ""}${c.ask ? ` · Precio de salida: ${eur(c.ask)}` : ""}</p>

      <h3>Parte compradora</h3>
      <p>D./Dña. <strong>${esc(f.buyerName) || "<em class='ph'>Nombre del comprador</em>"}</strong>, con DNI/NIE <strong>${esc(f.buyerId) || "<em class='ph'>________</em>"}</strong>${f.buyerPhone ? `, teléfono ${esc(f.buyerPhone)}` : ""}${f.buyerEmail ? `, email ${esc(f.buyerEmail)}` : ""}.</p>

      <h3>Oferta</h3>
      <p>Manifiesta su interés firme en adquirir el inmueble descrito por un precio total de
        <strong class="doc__price">${eur(c.offer)}</strong>, a abonar ${financingText[f.financing]}, del siguiente modo:</p>
      <table class="doc__table">
        <tr><td>Señal entregada con esta propuesta</td><td>${eur(c.signal)}</td></tr>
        <tr><td>Resto hasta completar arras (${f.depositPct || 0} %) a la firma del contrato</td><td>${eur(c.restDeposit)}</td></tr>
        <tr><td>Importe a abonar en la escritura pública</td><td>${eur(c.atDeed)}</td></tr>
        <tr class="total"><td>Precio total</td><td>${eur(c.offer)}</td></tr>
      </table>
      <p>Las cantidades entregadas lo serán ${depositText[f.depositType]}. La escritura de compraventa se otorgará ante notario antes del <strong>${f.deedDate ? fmtDate(new Date(f.deedDate)) : "__/__/____"}</strong>.</p>

      <h3>Condiciones</h3>
      <ol>${cond.map(x => `<li>${x}</li>`).join("")}</ol>

      <h3>Validez</h3>
      <p>Esta propuesta tiene validez hasta el <strong>${fmtDate(c.valid)}</strong>. Si no es aceptada por escrito por la parte vendedora en dicho plazo, quedará sin efecto y la señal será devuelta íntegramente a la parte compradora en un plazo máximo de 5 días hábiles.</p>

      <div class="doc__signs">
        <div><span></span>La parte compradora</div>
        <div><span></span>Aceptación parte vendedora</div>
        <div><span></span>${esc(C.agent)}<br>${esc(C.name)}</div>
      </div>
      <footer class="doc__foot">${esc(C.legalName)} · CIF ${esc(C.cif)} · ${esc(C.address)} · ${esc(C.phone)} · ${esc(C.email)}</footer>`;
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("reset", () => setTimeout(() => {
    form.deedDate.value = d60.toISOString().slice(0, 10);
    currentNo = offerNo(); localStorage.removeItem?.(KEY); update();
  }));

  function validate() {
    if (form.checkValidity()) return true;
    form.reportValidity();
    msg.textContent = "Completa los campos obligatorios: dirección, comprador, DNI y precio.";
    return false;
  }

  document.getElementById("printOffer").addEventListener("click", () => {
    if (!validate()) return;
    msg.textContent = "";
    document.title = `Oferta ${currentNo} - ${form.buyerName.value}`;
    window.print();
    document.title = "Propia Real Estate · Inmobiliaria";
  });

  document.getElementById("mailOffer").addEventListener("click", () => {
    if (!validate()) return;
    const c = calc();
    const body = `Propuesta de compra Nº ${currentNo}

Inmueble: ${c.f.address} ${c.f.ref ? "(Ref. " + c.f.ref + ")" : ""}
Comprador: ${c.f.buyerName} · DNI/NIE ${c.f.buyerId}
Precio ofertado: ${eur(c.offer)}
Arras (${c.f.depositPct}%): ${eur(c.deposit)} — ${c.f.depositType}
Pago: ${financingText[c.f.financing]}${c.mortgage ? " (condicionado a hipoteca)" : ""}
Firma en notaría antes de: ${c.f.deedDate}
Válida hasta: ${fmtDate(c.valid)}
${c.f.notes ? "\nOtras condiciones: " + c.f.notes : ""}

(Se adjunta el documento PDF firmado.)
${C.name} · ${C.phone}`;
    location.href = `mailto:${encodeURIComponent(c.f.buyerEmail || "")}?cc=${encodeURIComponent(C.email)}&subject=${encodeURIComponent("Propuesta de compra " + currentNo)}&body=${encodeURIComponent(body)}`;
  });

  document.getElementById("saveOffer").addEventListener("click", () => {
    try {
      const data = Object.fromEntries(new FormData(form));
      ["mortgageCondition", "freeCharges", "furniture"].forEach(k => data[k] = form[k].checked);
      data._no = currentNo;
      localStorage.setItem(KEY, JSON.stringify(data));
      msg.textContent = "Borrador guardado en este navegador.";
    } catch { msg.textContent = "No se pudo guardar el borrador en este navegador."; }
  });

  // Restaurar borrador
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved) {
      Object.entries(saved).forEach(([k, v]) => {
        const el = form.elements[k]; if (!el) return;
        if (el.type === "checkbox") el.checked = !!v; else el.value = v;
      });
      if (saved._no) currentNo = saved._no;
      msg.textContent = "Borrador recuperado.";
    }
  } catch {}

  update();
})();
