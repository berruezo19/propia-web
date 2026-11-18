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

  /* ---------- Formulario ---------- */
  const form = $("#requestForm"), err = $("#formError"), btn = $("#submitBtn");
  const steps = $$("#progress li");
  const panels = $$(".panel[data-step]");

  // Barra de progreso: marca la sección en la que está el usuario
  form.addEventListener("focusin", e => {
    const p = e.target.closest(".panel[data-step]"); if (!p) return;
    const n = +p.dataset.step;
    steps.forEach((li, i) => { li.classList.toggle("is-on", i <= n); li.classList.toggle("is-done", i < n); });
  });

  // Fecha mínima de visita: mañana
  const t = new Date(); t.setDate(t.getDate() + 1);
  form.fecha.min = t.toISOString().slice(0, 10);

  form.addEventListener("input", e => e.target.closest("label")?.classList.remove("invalid"));

  function check() {
    let first = null;
    $$("[required]", form).forEach(el => {
      const ok = el.type === "checkbox" ? el.checked : el.checkValidity() && el.value.trim();
      el.closest("label").classList.toggle("invalid", !ok);
      if (!ok && !first) first = el;
    });
    if (first) {
      err.textContent = "Revisa los campos marcados en rojo.";
      first.focus({ preventScroll: true });
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    err.textContent = ""; return true;
  }

  const LABELS = { nombre: "Nombre", dni: "DNI/NIE", telefono: "Teléfono", email: "Email", direccion: "Dirección", cp: "CP / Ciudad",
    tipo: "Tipo", m2c: "Sup. construida (m²)", m2u: "Sup. útil (m²)", hab: "Habitaciones", banos: "Baños", anio: "Año construcción",
    estado: "Estado", planta: "Planta", ascensor: "Ascensor", cargas: "Libre de cargas", hipoteca: "Hipoteca pendiente",
    ocupacion: "Ocupación", precio: "Precio solicitado (€)", horario: "Horario visita", fecha: "Fecha visita", obs: "Observaciones" };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!check()) return;
    const data = Object.fromEntries(new FormData(form)); delete data.rgpd;
    data.recibida = new Date().toISOString();

    // Enlace para abrir la solicitud directamente en el generador de ofertas interno
    const enc = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const genLink = `${C.siteUrl.replace(/\/$/, "")}/ofertas#d=${encodeURIComponent(enc)}`;
    const text = Object.entries(LABELS).filter(([k]) => data[k]).map(([k, l]) => `${l}: ${data[k]}`).join("\n")
      + `\n\nAbrir en el generador de ofertas:\n${genLink}`;

    btn.disabled = true; btn.classList.add("is-loading");
    try {
      const payload = { ...data, _subject: `Nueva solicitud de oferta – ${data.direccion}`, resumen: text, generador: genLink, origen: location.href };
      if (C.makeWebhookSolicitudes) {
        await window.sendToMake(C.makeWebhookSolicitudes, payload);
      } else if (C.formEndpoint) {
        const r = await fetch(C.formEndpoint, {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error(r.status);
      } else {
        location.href = `mailto:${C.email}?subject=${encodeURIComponent("Solicitud de oferta – " + data.direccion)}&body=${encodeURIComponent(text)}`;
      }
      form.hidden = true; $("#progress").hidden = true; $("#success").hidden = false;
      $("#success").scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      err.textContent = `No se ha podido enviar. Escríbenos a ${C.email}`;
    } finally { btn.disabled = false; btn.classList.remove("is-loading"); }
  });

  $("#newRequest").addEventListener("click", () => {
    form.reset(); form.hidden = false; $("#progress").hidden = false; $("#success").hidden = true;
    steps.forEach((li, i) => { li.classList.toggle("is-on", i === 0); li.classList.remove("is-done"); });
  });
})();
