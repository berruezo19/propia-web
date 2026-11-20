(() => {
  const C = window.PROPIA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Menú ---------- */
  const burger = $("#burger"), nav = $("#nav");
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open);
  });
  $$("#nav a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("is-open"); burger.classList.remove("is-open"); }));
  const header = $(".header");
  addEventListener("scroll", () => header.classList.toggle("is-scrolled", scrollY > 10), { passive: true });

  /* ---------- Contacto (desde config) ---------- */
  const items = [
    C.phone && `<li><svg><use href="#i-phone"/></svg><a href="tel:${C.phone.replace(/\s/g, "")}">${C.phone}</a></li>`,
    `<li><svg><use href="#i-mail"/></svg><a href="mailto:${C.email}">${C.email}</a></li>`,
    `<li><svg><use href="#i-pin"/></svg><span>${C.address}</span></li>`
  ].filter(Boolean).join("");
  $$("[data-contact]").forEach(ul => ul.innerHTML = items);
  $("#copy").textContent = `© ${new Date().getFullYear()} ${C.legalName}. Todos los derechos reservados.`;

  /* ---------- Aparición suave ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
  $$(".compare__card, .step, .cases article, .panel, .faq details").forEach(el => { el.classList.add("reveal"); io.observe(el); });

  /* ---------- Calculadora de oferta (formulario público) ---------- */
  const form = $("#requestForm"), err = $("#formError"), btn = $("#submitBtn");
  const steps = $$("#progress li"), panels = $$(".panel[data-step]", form);
  const eur = n => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" }).format(Math.round(n || 0));
  const ZONAS = { CT: "Cataluña", MD: "Comunidad de Madrid", VC: "Comunidad Valenciana" };
  const box = el => el.closest(".radio") || el.closest("label");

  function goStep(n) {
    panels.forEach(p => p.hidden = +p.dataset.step !== n);
    steps.forEach((li, i) => { li.classList.toggle("is-on", i <= n); li.classList.toggle("is-done", i < n); });
    $("#formulario").scrollIntoView({ behavior: "smooth", block: "start" });
    const first = panels[n] && panels[n].querySelector("input,select");
    if (first) first.focus({ preventScroll: true });
  }

  function check(panel) {
    let first = null;
    $$("[required]", panel).forEach(el => {
      let ok;
      if (el.type === "radio") ok = !!panel.querySelector(`[name="${el.name}"]:checked`);
      else if (el.type === "checkbox") ok = el.checked;
      else ok = el.checkValidity() && el.value.trim() !== "";
      box(el).classList.toggle("invalid", !ok);
      if (!ok && !first) first = el;
    });
    if (first) { err.textContent = "Revisa los campos marcados en rojo."; first.focus(); return false; }
    err.textContent = ""; return true;
  }
  const clearInvalid = e => { const b = box(e.target); if (b) b.classList.remove("invalid"); };
  form.addEventListener("input", clearInvalid);
  form.addEventListener("change", clearInvalid);
  /* ---------- Municipio y barrio: precios por m² de zona (Radar inmobiliario, js/precios-zona.js) ---------- */
  const ZP = window.PROPIA_ZONAS || {};
  const PRIMA_REFORMADO = 0.10;   // +10 % sobre el precio medio de la zona = precio de venta del piso ya reformado
  const TOPE_OFERTA = 0.85, TOPE_MAXIMO = 0.90;   // % del valor que indica el cliente (nunca le ofrecemos lo que pide)
  const zonaSel = $("#zonaSel"), muniSel = $("#muniSel"), poblInput = $("#poblInput"), barrioSel = $("#barrioSel");
  const show = (sel, on) => { $(sel).hidden = !on; };
  const opt = (v, t = v) => { const o = document.createElement("option"); o.value = v; o.textContent = t; return o; };
  const setManual = on => { show("#poblWrap", on); poblInput.required = on; if (!on) poblInput.value = muniSel.value; };
  function fillBarrios() {
    const z = ZP[muniSel.value], bs = z ? Object.keys(z.b) : [];
    barrioSel.replaceChildren(opt("", "No lo sé"), ...bs.map(b => opt(b)));
    show("#barrioWrap", bs.length > 0);
  }
  function fillMunis() {
    const list = Object.keys(ZP).filter(m => ZP[m].c === zonaSel.value).sort((a, b) => a.localeCompare(b, "es"));
    muniSel.replaceChildren(opt("", "Selecciona"), ...list.map(m => opt(m)), opt("__otro", "Otro municipio"));
    show("#muniWrap", list.length > 0); muniSel.required = list.length > 0;
    poblInput.value = ""; setManual(list.length === 0);
    fillBarrios();
  }
  zonaSel.addEventListener("change", fillMunis);
  muniSel.addEventListener("change", () => {
    const otro = muniSel.value === "__otro";
    setManual(otro); if (otro) { poblInput.value = ""; poblInput.focus(); }
    fillBarrios();
  });
  // €/m² de la zona: barrio elegido → municipio. 0 si la zona no está en la tabla.
  const precioZona = (pobl, barrio) => { const z = ZP[pobl]; return z ? (barrio && z.b[barrio]) || z.p || 0 : 0; };

  $("[data-next]", form).addEventListener("click", () => { if (check(panels[0])) goStep(1); });
  $("[data-prev]", form).addEventListener("click", () => goStep(0));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!check(panels[0])) return goStep(0);
    if (!check(panels[1])) return;
    const d = Object.fromEntries(new FormData(form)); delete d.rgpd;

    // Precio de venta para la cuenta: m² × €/m² de la zona + 10 % (piso reformado). Si la zona no está en la
    // tabla, se usa el valor que indica el cliente. Tope: nunca se muestra más de lo que el cliente dice que vale.
    const eurM2 = precioZona(d.poblacion, d.barrio);
    const ventaCalc = eurM2 ? Math.round(+d.m2 * eurM2 * (1 + PRIMA_REFORMADO) / 1000) * 1000 : +d.valor;
    const r = window.PROPIA_CALC.calcular({ venta: ventaCalc, reforma: d.reforma === "SI", redis: false, sup: +d.m2, zona: d.zona });
    // Siempre por debajo de lo que pide el cliente: oferta ≤ 85 % y precio máximo ≤ 90 % de su valor.
    const abajo100 = n => Math.floor(n / 100) * 100;
    const tope = abajo100(+d.valor * TOPE_OFERTA), topeAplicado = r.calculada > tope;
    const oferta = Math.min(r.calculada, tope), precioMax = Math.min(r.precioMax, abajo100(+d.valor * TOPE_MAXIMO));
    const calculo = (eurM2
      ? `Precio de zona: ${d.barrio || d.poblacion} ${eur(eurM2)}/m² × ${d.m2} m² + 10 %`
      : "Valor indicado por el cliente (zona sin precio en el Radar)") +
      (topeAplicado ? ` · tope 85 % del valor del cliente (la cuenta con margen 25 % daba ${eur(r.calculada)})` : "");

    // Enlace que abre la solicitud en el generador interno con todo rellenado
    const gen = { nombre: d.nombre, telefono: d.telefono, email: d.email, direccion: d.direccion, poblacion: d.poblacion,
      m2c: d.m2, sup: d.m2, venta: ventaCalc, zona: d.zona, reforma: d.reforma, hipoteca: d.hipoteca, obs: d.obs, recibida: new Date().toISOString() };
    const enc = btoa(unescape(encodeURIComponent(JSON.stringify(gen))));
    const genLink = `${location.origin}/ofertas#d=${encodeURIComponent(enc)}`;

    const lead = {
      _subject: `Nuevo lead web – ${d.direccion}, ${d.poblacion}`,
      nombre: d.nombre, telefono: d.telefono, email: d.email,
      direccion: d.direccion, poblacion: d.poblacion, barrio: d.barrio || "", comunidad: ZONAS[d.zona] || d.zona, m2: d.m2,
      valor_mercado: d.valor, reforma: d.reforma === "SI" ? "Sí" : "No", hipoteca: d.hipoteca || "", observaciones: d.obs || "",
      eur_m2_zona: eurM2 || "", precio_venta_estimado: ventaCalc, calculo, tope_aplicado: topeAplicado ? "Sí" : "No",
      oferta_orientativa: oferta, precio_maximo: precioMax, margen_pct: Math.round(r.margen * 10) / 10,
      generador: genLink, recibida: new Date().toLocaleString("es-ES"), origen: location.href
    };
    lead.resumen = [
      `Nombre: ${lead.nombre}`, `Teléfono: ${lead.telefono}`, `Email: ${lead.email}`,
      `Inmueble: ${lead.direccion}, ${lead.poblacion}${lead.barrio ? " – " + lead.barrio : ""} (${lead.comunidad})`, `Superficie: ${lead.m2} m²`,
      `Valor de mercado estimado: ${eur(+lead.valor_mercado)}`, `Reforma: ${lead.reforma}`, `Hipoteca: ${lead.hipoteca || "—"}`,
      `Observaciones: ${lead.observaciones || "—"}`, "",
      `Oferta orientativa mostrada al cliente (margen 25 %): ${eur(oferta)}`, `Precio máximo (margen 20 %): ${eur(precioMax)}`,
      `Precio de venta estimado: ${eur(ventaCalc)} · ${calculo}`, "",
      `Abrir en el generador: ${genLink}`
    ].join("\n");

    btn.disabled = true; btn.classList.add("is-loading");
    let sent = true;
    try {
      if (C.makeWebhookSolicitudes) await window.sendToMake(C.makeWebhookSolicitudes, lead);
      else if (C.formEndpoint) {
        const res = await fetch(C.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(lead) });
        if (!res.ok) throw new Error(res.status);
      } else sent = false;
    } catch { sent = false; }
    btn.disabled = false; btn.classList.remove("is-loading");

    // Mostrar resultado
    $("#resultAddr").textContent = `${d.direccion}, ${d.poblacion}${d.barrio ? " (" + d.barrio + ")" : ""}`;
    $("#resultPrice").textContent = oferta > 0 ? eur(oferta) : "A valorar en visita";
    $(".result__next").innerHTML = sent
      ? "<strong>¿Y ahora?</strong> Un asesor de PropiaRealEstate te llamará en menos de 24 h para concertar la visita técnica y confirmarte la oferta definitiva."
      : `<strong>¿Y ahora?</strong> Escríbenos a <a href="mailto:${C.email}?subject=${encodeURIComponent("Oferta para " + d.direccion)}&body=${encodeURIComponent(lead.resumen)}">${C.email}</a> para concertar la visita técnica y confirmarte la oferta definitiva.`;
    form.hidden = true; $("#result").hidden = false;
    steps.forEach(li => li.classList.add("is-on", "is-done"));
    $("#formulario").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#newRequest").addEventListener("click", () => {
    form.reset(); fillMunis(); form.hidden = false; $("#result").hidden = true; goStep(0);
  });
})();
