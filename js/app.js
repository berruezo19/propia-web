(() => {
  const C = window.CONFIG, P = window.PROPERTIES;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const eur = (n, rent) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" }).format(n) + (rent ? "/mes" : "");
  window.fmtEUR = eur;

  /* ---- Menú móvil ---- */
  const toggle = $(".nav-toggle"), nav = $(".nav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
  });
  $$(".nav a").forEach(a => a.addEventListener("click", () => nav.classList.remove("is-open")));
  addEventListener("scroll", () => $(".header").classList.toggle("is-scrolled", scrollY > 20), { passive: true });

  /* ---- Inmuebles ---- */
  const grid = $("#propertyGrid");
  const state = { op: "", tipo: "", max: 0 };

  function render() {
    const list = P.filter(p =>
      (!state.op || p.op === state.op) &&
      (!state.tipo || p.type === state.tipo) &&
      (!state.max || p.price <= state.max));
    grid.innerHTML = list.map(p => `
      <article class="prop" data-id="${p.id}" tabindex="0">
        <div class="prop__img" style="background-image:url('${p.img}')">
          <span class="badge badge--${p.op}">${p.op === "venta" ? "Venta" : "Alquiler"}</span>
        </div>
        <div class="prop__body">
          <p class="prop__price">${eur(p.price, p.op === "alquiler")}</p>
          <h3>${p.title}</h3>
          <p class="prop__zone">${p.zone} · Ref. ${p.id}</p>
          <ul class="prop__feat">
            <li>${p.m2} m²</li>${p.rooms ? `<li>${p.rooms} hab.</li>` : ""}<li>${p.baths} baño${p.baths > 1 ? "s" : ""}</li>
          </ul>
        </div>
      </article>`).join("");
    $("#emptyMsg").hidden = list.length > 0;
  }
  render();

  $$(".chip").forEach(c => c.addEventListener("click", () => {
    $$(".chip").forEach(x => x.classList.remove("is-active"));
    c.classList.add("is-active");
    state.op = c.dataset.filter; render();
  }));

  $("#searchForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    state.op = f.get("op"); state.tipo = f.get("tipo"); state.max = +f.get("max") || 0;
    $$(".chip").forEach(x => x.classList.toggle("is-active", x.dataset.filter === state.op));
    render();
    $("#inmuebles").scrollIntoView({ behavior: "smooth" });
  });

  /* ---- Modal detalle ---- */
  const modal = $("#propertyModal");
  function openProp(id) {
    const p = P.find(x => x.id === id); if (!p) return;
    $("#modalBody").innerHTML = `
      <div class="modal__img" style="background-image:url('${p.img}')"></div>
      <div class="modal__content">
        <p class="eyebrow">${p.type} · ${p.zone} · Ref. ${p.id}</p>
        <h3>${p.title}</h3>
        <p class="prop__price">${eur(p.price, p.op === "alquiler")}</p>
        <ul class="prop__feat"><li>${p.m2} m²</li>${p.rooms ? `<li>${p.rooms} hab.</li>` : ""}<li>${p.baths} baños</li></ul>
        <p>${p.desc}</p>
        <div class="hero__cta">
          ${p.op === "venta" ? `<button class="btn" data-offer="${p.id}">Hacer una oferta</button>` : ""}
          <a class="btn btn--ghost" href="#contacto" data-close>Solicitar visita</a>
        </div>
      </div>`;
    modal.showModal();
  }
  grid.addEventListener("click", e => { const c = e.target.closest(".prop"); if (c) openProp(c.dataset.id); });
  grid.addEventListener("keydown", e => { if (e.key === "Enter") { const c = e.target.closest(".prop"); if (c) openProp(c.dataset.id); } });
  modal.addEventListener("click", e => {
    if (e.target === modal || e.target.closest(".modal__close") || e.target.closest("[data-close]")) modal.close();
    const b = e.target.closest("[data-offer]");
    if (b) { modal.close(); window.selectOfferProperty?.(b.dataset.offer); $("#ofertas").scrollIntoView({ behavior: "smooth" }); }
  });

  /* ---- Valoración ---- */
  $("#valuationForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const base = +f.get("m2") * +f.get("zona") * +f.get("estado") * +f.get("extra");
    const lo = Math.round(base * 0.93 / 1000) * 1000, hi = Math.round(base * 1.07 / 1000) * 1000;
    $("#valuationOut").innerHTML = `<span>Estimación orientativa</span><strong>${eur(lo)} – ${eur(hi)}</strong>
      <a href="#contacto">Solicitar valoración profesional gratuita →</a>`;
  });

  /* ---- Contacto ---- */
  $("#contactList").innerHTML = `
    <li><span>Teléfono</span><a href="tel:${C.phone.replace(/\s/g, "")}">${C.phone}</a></li>
    <li><span>Email</span><a href="mailto:${C.email}">${C.email}</a></li>
    <li><span>WhatsApp</span><a href="https://wa.me/${C.whatsapp}" target="_blank" rel="noopener">Escríbenos</a></li>
    <li><span>Oficina</span>${C.address}</li>
    <li><span>Horario</span>${C.hours}</li>`;
  $("#footerLegal").textContent = `© ${new Date().getFullYear()} ${C.legalName} · CIF ${C.cif} · ${C.address}`;

  $("#contactForm").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("#contactMsg"), data = Object.fromEntries(new FormData(e.target));
    try {
      if (C.formEndpoint) {
        const r = await fetch(C.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error();
      } else {
        location.href = `mailto:${C.email}?subject=${encodeURIComponent("Consulta web: " + data.topic)}&body=${encodeURIComponent(`${data.msg}\n\n${data.name} · ${data.email} · ${data.phone}`)}`;
      }
      msg.textContent = "¡Gracias! Te responderemos en menos de 24 h."; e.target.reset();
    } catch { msg.textContent = "No se pudo enviar. Llámanos al " + C.phone; }
  });

  /* ---- Contadores ---- */
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target, to = +el.dataset.count, t0 = performance.now();
    const step = t => { const k = Math.min((t - t0) / 1200, 1); el.textContent = Math.round(to * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step); io.unobserve(el);
  }), { threshold: .5 });
  $$("[data-count]").forEach(el => io.observe(el));
})();
