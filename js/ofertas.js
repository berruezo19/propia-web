/* =========================================================
   PROPIA · GENERADOR DE OFERTAS DE COMPRA DIRECTA (uso interno)
   ========================================================= */
(() => {
  const C = window.PROPIA;
  const $ = s => document.querySelector(s);
  const f = $("#of");
  const STORE = "propia_ofertas_v1";

  const eur = n => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" }).format(Math.round(n || 0));
  const pct = n => (n > 0 ? "+" : "") + n.toFixed(1).replace(".", ",") + " %";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fecha = d => d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const num = k => parseFloat(f.elements[k].value) || 0;

  /* ---------- Zonas de referencia (€/m² vivienda reformada) ----------
     Valores ORIENTATIVOS: actualízalos con vuestros testigos/tasaciones. */
  const ZONAS = [
    ["", "— Introducir manualmente —"],
    [5600, "BCN · Eixample"], [6400, "BCN · Sarrià-Sant Gervasi"], [5400, "BCN · Les Corts"],
    [5100, "BCN · Gràcia"], [4800, "BCN · Sant Martí"], [4600, "BCN · Ciutat Vella"],
    [4000, "BCN · Sants-Montjuïc"], [3800, "BCN · Horta-Guinardó"], [3700, "BCN · Sant Andreu"],
    [3000, "BCN · Nou Barris"], [2900, "L'Hospitalet de Llobregat"], [2900, "Badalona"],
    [3300, "Área metropolitana (media)"]
  ];
  ZONAS.forEach(([v, t]) => f.zona.add(new Option(v ? `${t} · ${v.toLocaleString("es-ES")} €/m²` : t, v)));
  f.zona.addEventListener("change", () => { if (f.zona.value) f.eurm2.value = f.zona.value; update(); });
  f.estado.addEventListener("change", () => { f.reformam2.value = f.estado.value; update(); });

  /* ---------- Nº de oferta ---------- */
  const newNo = () => "OF-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  let current = { no: newNo(), fecha: new Date().toISOString() };

  /* ---------- Cálculo ---------- */
  function calc() {
    const m2 = num("m2c"), base = num("eurm2");
    const valorActual = m2 * base;                                // valor de mercado reformado, sin ajustes
    const arv = valorActual * (1 + num("ajuste") / 100);          // valor de reventa estimado
    const reforma = m2 * num("reformam2");
    const venta = arv * num("gventa") / 100;
    const margenObj = arv * num("margen") / 100;
    const tenencia = num("tenencia");
    const gc = num("gcompra") / 100;

    const disponible = arv - venta - margenObj - reforma - tenencia;
    const calculada = Math.max(0, Math.floor(disponible / (1 + gc) / 500) * 500);
    const final = num("precioFinal") || calculada;

    const inversion = final * (1 + gc) + reforma + tenencia;
    const beneficio = arv - venta - inversion;
    const solicitado = num("precio");
    return {
      m2, arv, reforma, venta, tenencia, gastosCompra: final * gc, margenObj, calculada, final, beneficio,
      margenReal: arv ? beneficio / arv * 100 : 0,
      roi: inversion ? beneficio / inversion * 100 : 0,
      sobreValor: arv ? final / arv * 100 : 0,
      vsSolicitado: solicitado ? (final - solicitado) / solicitado * 100 : null,
      neto: final - num("cargas"),
      ok: m2 > 0 && num("eurm2") > 0
    };
  }

  function update() {
    const c = calc(), v = Object.fromEntries(new FormData(f));
    const on = k => f.elements[k].checked;

    // Aviso de ajuste por planta sin ascensor
    const planta = parseInt(v.planta) || 0;
    $("#autoAdjust").textContent = v.ascensor === "No" && planta >= 2
      ? `ℹ️ ${planta}ª planta sin ascensor: se suele aplicar un ajuste de −10 % a −20 % sobre el valor.` : "";

    // Desglose interno
    $("#calc").innerHTML = c.ok ? `
      <table>
        <tr><td>Valor de reventa estimado (${c.m2} m² × ${eur(num("eurm2"))}${num("ajuste") ? ` ${pct(num("ajuste"))}` : ""})</td><td>${eur(c.arv)}</td></tr>
        <tr><td>− Gastos de reventa (${num("gventa")} %)</td><td>${eur(c.venta)}</td></tr>
        <tr><td>− Margen objetivo (${num("margen")} %)</td><td>${eur(c.margenObj)}</td></tr>
        <tr><td>− Reforma (${eur(num("reformam2"))}/m²)</td><td>${eur(c.reforma)}</td></tr>
        <tr><td>− Tenencia</td><td>${eur(c.tenencia)}</td></tr>
        <tr><td>÷ Gastos de compra (${num("gcompra")} %)</td><td></td></tr>
        <tr class="tot"><td>Oferta máxima calculada</td><td>${eur(c.calculada)}</td></tr>
      </table>` : `<p class="calc__empty">Introduce los m² construidos y el valor €/m² para calcular la oferta.</p>`;
    f.precioFinal.placeholder = c.calculada ? `Calculado: ${eur(c.calculada)}` : "Calculado automáticamente";

    // KPIs
    const mCls = c.margenReal >= num("margen") - 0.01 ? "good" : c.margenReal >= num("margen") / 2 ? "mid" : "bad";
    $("#kpis").innerHTML = `
      <div class="kpi kpi--main"><span>Oferta</span><strong>${eur(c.final)}</strong></div>
      <div class="kpi ${mCls}"><span>Margen real</span><strong>${c.ok ? c.margenReal.toFixed(1).replace(".", ",") + " %" : "—"}</strong><em>${c.ok ? eur(c.beneficio) : ""}</em></div>
      <div class="kpi"><span>% s/ valor reventa</span><strong>${c.ok ? c.sobreValor.toFixed(0) + " %" : "—"}</strong><em>ROI ${c.ok ? c.roi.toFixed(1).replace(".", ",") + " %" : "—"}</em></div>
      <div class="kpi"><span>vs. solicitado</span><strong>${c.vsSolicitado === null ? "—" : pct(c.vsSolicitado)}</strong><em>${num("precio") ? eur(num("precio")) : ""}</em></div>`;

    // Documento
    const hoy = new Date(current.fecha);
    const validoHasta = new Date(hoy); validoHasta.setDate(hoy.getDate() + (num("validez") || 7));
    const ph = t => `<em class="ph">${t}</em>`;
    const conds = [
      `El pago se realizará <strong>al contado</strong>, mediante transferencia bancaria o cheque bancario, en el momento del otorgamiento de la escritura pública de compraventa.`,
      `La escritura se otorgará ante el notario designado por PROPIA en un plazo máximo de <strong>${num("plazo") || 15} días naturales</strong> desde la aceptación de la presente oferta.`,
      num("senal") ? `A la aceptación, PROPIA entregará una señal de <strong>${eur(num("senal"))}</strong> a cuenta del precio, que se descontará del importe a pagar en la firma.` : "",
      on("c_comision") && "La operación no conlleva comisiones ni honorarios de intermediación para la parte vendedora.",
      on("c_gastos") && "PROPIA asume los gastos de notaría, registro de la propiedad y gestoría derivados de la compraventa.",
      on("c_estado") && "PROPIA adquiere el inmueble en su estado actual de conservación, sin que la parte vendedora deba realizar reformas, reparaciones ni vaciar el inmueble, salvo pacto en contrario.",
      on("c_cancel") && "Las hipotecas, embargos u otras cargas existentes se cancelarán con cargo al precio en el mismo acto de la firma, encargándose PROPIA de su gestión.",
      on("c_plusvalia") && "El Impuesto sobre el Incremento de Valor de los Terrenos de Naturaleza Urbana (plusvalía municipal) será a cargo de la parte vendedora, conforme a la legislación vigente.",
      `Entrega de llaves y posesión: <strong>${esc(v.llaves).toLowerCase()}</strong>, con el inmueble libre de ocupantes${v.ocupacion === "Alquilado" ? ", salvo los arrendatarios con contrato en vigor que se detallen" : ""}.`,
      "La oferta está sujeta a la verificación de la información registral (nota simple) y a que la situación legal y física del inmueble coincida con la analizada en el estudio técnico y legal.",
      v.obs && esc(v.obs)
    ].filter(Boolean);

    $("#doc").innerHTML = `
      <header class="doc__head">
        <div class="logo"><img src="img/logo.svg" alt="" width="30" height="30"><span>Propia</span></div>
        <div class="doc__meta"><strong>Oferta de compra directa</strong><span>Nº ${current.no}</span><span>Barcelona, ${fecha(hoy)}</span></div>
      </header>

      <p class="doc__to">A la atención de <strong>${esc(v.nombre) || ph("Nombre del propietario")}</strong>${v.dni ? `, con DNI/NIE ${esc(v.dni)}` : ""}:</p>
      <p>Tras la visita técnica y el estudio legal y de viabilidad realizados, <strong>${esc(C.legalName)}</strong>${C.cif ? ` (CIF ${esc(C.cif)})` : ""} le presenta la siguiente oferta firme de compra directa del inmueble de su propiedad:</p>

      <div class="doc__prop">
        <div><span>Inmueble</span><strong>${esc(v.direccion) || ph("Dirección del inmueble")}${v.cp ? `, ${esc(v.cp)}` : ""}</strong></div>
        <div class="doc__specs">${[v.tipo, num("m2c") && `${num("m2c")} m² construidos`, num("m2u") && `${num("m2u")} m² útiles`, v.habban && `${esc(v.habban)} hab./baños`, v.planta && `Planta ${esc(v.planta)}`, v.anio && `Año ${esc(v.anio)}`].filter(Boolean).join(" · ")}</div>
      </div>

      <div class="doc__price">
        <span>Precio ofertado</span>
        <strong>${eur(c.final)}</strong>
        <em>Pago íntegro al contado en notaría</em>
      </div>
      ${on("c_neto") && num("cargas") ? `<table class="doc__net">
        <tr><td>Precio de compraventa</td><td>${eur(c.final)}</td></tr>
        <tr><td>Cancelación de hipoteca / cargas (estimado)</td><td>− ${eur(num("cargas"))}</td></tr>
        <tr class="tot"><td>Importe neto estimado a recibir</td><td>${eur(c.neto)}</td></tr></table>` : ""}

      <h4>Condiciones</h4>
      <ol>${conds.map(x => `<li>${x}</li>`).join("")}</ol>

      <h4>Validez</h4>
      <p>La presente oferta es válida hasta el <strong>${fecha(validoHasta)}</strong>. Para aceptarla basta con firmar este documento y remitirlo a ${esc(C.email)}. Transcurrido dicho plazo sin aceptación, quedará sin efecto.</p>

      <div class="doc__signs">
        <div><span></span><strong>Por PROPIA</strong>${esc(v.firmante) || ""}</div>
        <div><span></span><strong>Aceptación del propietario</strong>${esc(v.nombre) || ""}<br>Fecha: ____ / ____ / ________</div>
      </div>
      <footer class="doc__foot">${esc(C.legalName)}${C.cif ? " · CIF " + esc(C.cif) : ""} · ${esc(C.address)} · ${esc(C.email)}${C.phone ? " · " + esc(C.phone) : ""}</footer>`;
  }

  f.addEventListener("input", update);
  f.addEventListener("change", update);

  /* ---------- Validación ---------- */
  const msg = t => { $("#msg").textContent = t; if (t) setTimeout(() => $("#msg").textContent === t && ($("#msg").textContent = ""), 4000); };
  function valid() {
    let first = null;
    f.querySelectorAll("[required]").forEach(el => {
      const ok = el.value.trim() !== "";
      el.closest("label").classList.toggle("invalid", !ok);
      if (!ok && !first) first = el;
    });
    if (first) { first.focus(); msg("Completa los campos obligatorios (*)."); return false; }
    return true;
  }

  /* ---------- Acciones ---------- */
  $("#btnPrint").addEventListener("click", () => {
    if (!valid()) return;
    const t = document.title;
    document.title = `Oferta PROPIA ${current.no} - ${f.nombre.value}`;
    window.print();
    document.title = t;
  });

  $("#btnMail").addEventListener("click", () => {
    if (!valid()) return;
    const c = calc();
    const body = `Estimado/a ${f.nombre.value}:

Tras la visita técnica y el estudio de su inmueble en ${f.direccion.value}, le hacemos llegar nuestra oferta de compra directa (Nº ${current.no}):

· Precio ofertado: ${eur(c.final)}, al contado en notaría
· Firma ante notario en un máximo de ${num("plazo")} días desde la aceptación
· Sin comisiones${f.c_gastos.checked ? " y sin gastos de notaría ni registro para usted" : ""}

Le adjuntamos el documento completo con todas las condiciones. La oferta es válida durante ${num("validez")} días.

Quedamos a su disposición para cualquier duda.

Un saludo,
${f.firmante.value || "Equipo PROPIA"}
${C.email}${C.phone ? " · " + C.phone : ""}`;
    location.href = `mailto:${encodeURIComponent(f.email.value)}?subject=${encodeURIComponent("Oferta de compra de su inmueble – PROPIA")}&body=${encodeURIComponent(body)}`;
    msg("Recuerda adjuntar el PDF descargado al correo.");
  });

  /* ---------- Guardado (localStorage) ---------- */
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } };
  const store = list => { try { localStorage.setItem(STORE, JSON.stringify(list)); return true; } catch { return false; } };
  const snapshot = () => {
    const d = {};
    [...f.elements].forEach(el => { if (!el.name) return; d[el.name] = el.type === "checkbox" ? el.checked : el.value; });
    return d;
  };
  const fill = d => {
    [...f.elements].forEach(el => {
      if (!el.name || !(el.name in d)) return;
      if (el.type === "checkbox") el.checked = !!d[el.name]; else el.value = d[el.name];
    });
  };
  const refreshCount = () => $("#histCount").textContent = load().length;

  $("#btnSave").addEventListener("click", () => {
    if (!valid()) return;
    const list = load().filter(o => o.no !== current.no);
    list.unshift({ ...current, guardada: new Date().toISOString(), oferta: calc().final, data: snapshot() });
    msg(store(list) ? "Oferta guardada." : "No se pudo guardar en este navegador.");
    refreshCount();
  });

  function reset() {
    f.reset(); current = { no: newNo(), fecha: new Date().toISOString() };
    f.querySelectorAll(".invalid").forEach(l => l.classList.remove("invalid"));
    $("#importMsg").hidden = true; update();
  }
  $("#btnNew").addEventListener("click", () => { if (confirm("¿Empezar una oferta nueva? Los cambios sin guardar se perderán.")) reset(); });

  // Historial
  const hist = $("#hist");
  function renderHist() {
    const list = load();
    $("#histList").innerHTML = list.length ? list.map(o => `
      <li><div><strong>${esc(o.data.direccion)}</strong><span>${esc(o.data.nombre)} · ${o.no} · ${new Date(o.guardada).toLocaleDateString("es-ES")}</span></div>
        <b>${eur(o.oferta)}</b>
        <button class="btn btn--line btn--sm" data-open="${o.no}">Abrir</button>
        <button class="x" data-del="${o.no}" aria-label="Eliminar">×</button></li>`).join("")
      : `<li class="empty">Todavía no hay ofertas guardadas.</li>`;
  }
  $("#btnHistory").addEventListener("click", () => { renderHist(); hist.showModal(); });
  $("#histClose").addEventListener("click", () => hist.close());
  hist.addEventListener("click", e => {
    if (e.target === hist) hist.close();
    const o = e.target.dataset.open, d = e.target.dataset.del;
    if (o) { const it = load().find(x => x.no === o); reset(); fill(it.data); current = { no: it.no, fecha: it.fecha }; update(); hist.close(); msg(`Oferta ${it.no} abierta.`); }
    if (d && confirm("¿Eliminar esta oferta?")) { store(load().filter(x => x.no !== d)); renderHist(); refreshCount(); }
  });
  $("#histExport").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" }));
    a.download = `ofertas-propia-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  });
  $("#histImport").addEventListener("change", async e => {
    try {
      const inc = JSON.parse(await e.target.files[0].text());
      const map = new Map(load().map(o => [o.no, o])); inc.forEach(o => o.no && map.set(o.no, o));
      store([...map.values()]); renderHist(); refreshCount();
    } catch { alert("Archivo no válido."); }
    e.target.value = "";
  });

  /* ---------- Importar solicitud desde el enlace del email (#d=...) ---------- */
  function importFromHash() {
    const m = location.hash.match(/d=([^&]+)/); if (!m) return;
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
      const estados = { "A estrenar / reformado": "0", "Buen estado": "120", "Necesita reforma parcial": "450", "Necesita reforma integral": "850" };
      fill({
        nombre: d.nombre, dni: d.dni, telefono: d.telefono, email: d.email, direccion: d.direccion, cp: d.cp,
        tipo: d.tipo, anio: d.anio, m2c: d.m2c, m2u: d.m2u, planta: d.planta, ascensor: d.ascensor, ocupacion: d.ocupacion,
        precio: d.precio, habban: [d.hab, d.banos].filter(Boolean).join(" / "),
        obs: ""
      });
      if (estados[d.estado]) { f.estado.value = estados[d.estado]; f.reformam2.value = estados[d.estado]; }
      const info = [d.cargas && `Libre de cargas: ${d.cargas}`, d.hipoteca && `Hipoteca: ${d.hipoteca}`, d.obs && `Obs.: ${d.obs}`].filter(Boolean).join(" · ");
      $("#importMsg").innerHTML = `✓ Solicitud importada (${new Date(d.recibida || Date.now()).toLocaleDateString("es-ES")}).${info ? " " + esc(info) : ""} <b>Completa la valoración en el apartado 3.</b>`;
      $("#importMsg").hidden = false;
      history.replaceState(null, "", location.pathname);
    } catch { msg("No se pudo leer la solicitud del enlace."); }
  }

  importFromHash();
  refreshCount();
  update();
})();
