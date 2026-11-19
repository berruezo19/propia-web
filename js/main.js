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
  $("[data-next]", form).addEventListener("click", () => { if (check(panels[0])) goStep(1); });
  $("[data-prev]", form).addEventListener("click", () => goStep(0));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!check(panels[0])) return goStep(0);
    if (!check(panels[1])) return;
    const d = Object.fromEntries(new FormData(form)); delete d.rgpd;

    const r = window.PROPIA_CALC.calcular({ venta: +d.valor, reforma: d.reforma === "SI", redis: false, sup: +d.m2, zona: d.zona });
    const oferta = r.calculada;

    // Enlace que abre la solicitud en el generador interno con todo rellenado
    const gen = { nombre: d.nombre, telefono: d.telefono, email: d.email, direccion: d.direccion, poblacion: d.poblacion,
      m2c: d.m2, sup: d.m2, venta: d.valor, zona: d.zona, reforma: d.reforma, hipoteca: d.hipoteca, obs: d.obs, recibida: new Date().toISOString() };
    const enc = btoa(unescape(encodeURIComponent(JSON.stringify(gen))));
    const genLink = `${location.origin}/ofertas#d=${encodeURIComponent(enc)}`;

    const lead = {
      _subject: `Nuevo lead web – ${d.direccion}, ${d.poblacion}`,
      nombre: d.nombre, telefono: d.telefono, email: d.email,
      direccion: d.direccion, poblacion: d.poblacion, comunidad: ZONAS[d.zona] || d.zona, m2: d.m2,
      valor_mercado: d.valor, reforma: d.reforma === "SI" ? "Sí" : "No", hipoteca: d.hipoteca || "", observaciones: d.obs || "",
      oferta_orientativa: oferta, precio_maximo: r.precioMax, margen_pct: Math.round(r.margen * 10) / 10,
      generador: genLink, recibida: new Date().toLocaleString("es-ES"), origen: location.href
    };
    lead.resumen = [
      `Nombre: ${lead.nombre}`, `Teléfono: ${lead.telefono}`, `Email: ${lead.email}`,
      `Inmueble: ${lead.direccion}, ${lead.poblacion} (${lead.comunidad})`, `Superficie: ${lead.m2} m²`,
      `Valor de mercado estimado: ${eur(+lead.valor_mercado)}`, `Reforma: ${lead.reforma}`, `Hipoteca: ${lead.hipoteca || "—"}`,
      `Observaciones: ${lead.observaciones || "—"}`, "",
      `Oferta orientativa mostrada al cliente (margen 25 %): ${eur(oferta)}`, `Precio máximo (margen 20 %): ${eur(r.precioMax)}`, "",
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
    $("#resultAddr").textContent = `${d.direccion}, ${d.poblacion}`;
    $("#resultPrice").textContent = oferta > 0 ? eur(oferta) : "A valorar en visita";
    $(".result__next").innerHTML = sent
      ? "<strong>¿Y ahora?</strong> Un asesor de PropiaRealEstate te llamará en menos de 24 h para concertar la visita técnica y confirmarte la oferta definitiva."
      : `<strong>¿Y ahora?</strong> Escríbenos a <a href="mailto:${C.email}?subject=${encodeURIComponent("Oferta para " + d.direccion)}&body=${encodeURIComponent(lead.resumen)}">${C.email}</a> para concertar la visita técnica y confirmarte la oferta definitiva.`;
    form.hidden = true; $("#result").hidden = false;
    steps.forEach(li => li.classList.add("is-on", "is-done"));
    $("#formulario").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#newRequest").addEventListener("click", () => {
    form.reset(); form.hidden = false; $("#result").hidden = true; goStep(0);
  });
})();
