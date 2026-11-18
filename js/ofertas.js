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

  /* ---------- Parámetros de la calculadora PROPIA (hoja "Compra directa") ----------
     Cambia aquí cualquier valor si se actualiza el Excel. */
  const P = {
    rentObjetivo: 0.32,          // rentabilidad anual exigida (fórmula E2: 0,32/365 × plazo)
    plazoConReforma: 150,        // días (A3)
    plazoSinReforma: 105,
    umbralPrecio: 250000,        // € precio de venta (E4, E16, E17)
    factorBajo: 0.024,           // corrección mensual si venta < 250.000 € (E4)
    factorAlto: 0.016,           // corrección mensual si venta ≥ 250.000 €
    honCompraPct: 0.03, honCompraMin: 3000,   // honorarios de compra + IVA (E15)
    honVentaPct: 0.03, honVentaMin: 10000,    // honorarios de venta: completa hasta 10.000 € (E16)
    iva: 1.21,
    reformaRedisM2Alto: 900, reformaRedisM2Bajo: 700,   // €/m² con redistribución (E17)
    reformaSinRedisAlto: 38000, reformaSinRedisBajo: 30000,
    sinReforma: 12100,
    notaria: 1500,               // (E18)
    itp: { MD: 0.02, CT: 0.03, VC: 0.08 },  // (E19) Madrid, Cataluña, Valencia; cualquier otra: 8 %
    zonas: { MD: "Madrid", CT: "Cataluña", VC: "Valencia" }
  };

  // Superficie de reforma = m² construidos por defecto
  f.m2c.addEventListener("input", () => { if (!f.sup.dataset.touched) f.sup.value = f.m2c.value; });
  f.sup.addEventListener("input", () => f.sup.dataset.touched = "1");

  /* ---------- Nº de oferta ---------- */
  const newNo = () => "OF-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  let current = { no: newNo(), fecha: new Date().toISOString() };

  /* ---------- Cálculo ---------- */
  /* Réplica exacta de la hoja "Compra directa" de Calculadora_1.xlsx.
     La hoja tiene una referencia circular (precio de compra ↔ gastos) que Excel resuelve
     iterando; aquí se resuelve de forma exacta y, si oscila entre dos centenas, se toma la menor. */
  function calc() {
    const venta = num("venta"), sup = num("sup");
    const reforma = f.reforma.value === "SI", redis = f.redis.value === "SI";
    const zona = f.zonaItp.value, itpR = P.itp[zona] ?? 0.08;

    const plazo = reforma ? P.plazoConReforma : P.plazoSinReforma;                                   // A3
    const factor = venta < P.umbralPrecio ? plazo / 30 * P.factorBajo : plazo / 30 * P.factorAlto;    // E4
    const ventaCorr = venta * (1 - factor);                                                           // E5
    const k = P.rentObjetivo / 365 * plazo;

    const honCompra = B3 => (B3 * P.honCompraPct > P.honCompraMin ? B3 * P.honCompraPct : P.honCompraMin) * P.iva;   // E15
    const honVenta = venta * P.honVentaPct * P.iva > P.honVentaMin ? 0 : P.honVentaMin - venta * P.honVentaPct * P.iva; // E16
    const costeReforma = reforma                                                                                      // E17
      ? (redis ? (venta > P.umbralPrecio ? P.reformaRedisM2Alto : P.reformaRedisM2Bajo) * sup
               : (venta < P.umbralPrecio ? P.reformaSinRedisBajo : P.reformaSinRedisAlto))
      : P.sinReforma;

    // E2 = E5 − k·(Gastos + B3) − Gastos, con Gastos = G0(B3) + ITP·E2  →  despeje lineal en E2
    const bruto = B3 => { const G0 = honCompra(B3) + honVenta + costeReforma + P.notaria; return (ventaCorr - k * (G0 + B3) - G0) / (1 + itpR * (1 + k)); };
    let B3 = Math.floor(ventaCorr / 100) * 100;
    const vistos = [];
    for (let i = 0; i < 100; i++) {
      const nB3 = Math.floor(bruto(B3) / 100) * 100;                                                   // E3 = REDONDEAR.MENOS(E2;-2)
      if (nB3 === B3) break;
      if (vistos.includes(nB3)) { B3 = Math.min(nB3, B3); break; }
      vistos.push(B3); B3 = nB3;
    }
    const precioBruto = bruto(B3);
    const calculada = Math.max(0, B3);
    const final = num("precioFinal") || calculada;
    const baseItp = num("precioFinal") ? final : precioBruto;    // con precio manual, ITP sobre el precio real

    const g = { honCompra: honCompra(final), honVenta, reforma: costeReforma, notaria: P.notaria, itp: itpR * baseItp };
    g.total = g.honCompra + g.honVenta + g.reforma + g.notaria + g.itp;                                  // E20
    const coste = g.total + final;                                                                       // B11
    const beneficio = ventaCorr - coste;                                                                 // C11
    const margen = coste ? beneficio / coste : 0;                                                        // D11
    const solicitado = num("precio");
    return {
      venta, plazo, factor, ventaCorr, precioBruto, calculada, final, g, coste, beneficio, zona, itpR,
      margen: margen * 100,
      rent: margen / plazo * 365 * 100,                                                                  // E11
      vsSolicitado: solicitado ? (final - solicitado) / solicitado * 100 : null,
      neto: final - num("cargas"),
      ok: venta > 0 && (!reforma || !redis || sup > 0)
    };
  }

  function update() {
    const c = calc(), v = Object.fromEntries(new FormData(f));
    const on = k => f.elements[k].checked;

    // Desglose interno (mismo orden que la hoja Excel)
    const p1 = n => n.toFixed(1).replace(".", ",") + " %";
    const manual = !!num("precioFinal");
    $("#calc").innerHTML = c.ok ? `
      <div class="calc__group"><h5>General</h5><table>
        <tr><td>Plazo de operación</td><td>${c.plazo} días</td></tr>
        <tr><td>Precio de venta</td><td>${eur(c.venta)}</td></tr>
        <tr><td>Factor de corrección</td><td>${p1(c.factor * 100)}</td></tr>
        <tr><td>Precio de venta corregido</td><td>${eur(c.ventaCorr)}</td></tr>
        <tr><td>Precio de compra bruto</td><td>${eur(c.precioBruto)}</td></tr>
        <tr class="tot"><td>Precio de compra neto</td><td>${eur(c.calculada)}</td></tr>
      </table></div>
      <div class="calc__group"><h5>Gastos${manual ? " <small>(sobre el precio final manual)</small>" : ""}</h5><table>
        <tr><td>Honorarios de compra</td><td>${eur(c.g.honCompra)}</td></tr>
        <tr><td>Honorarios de venta</td><td>${eur(c.g.honVenta)}</td></tr>
        <tr><td>Reforma</td><td>${eur(c.g.reforma)}</td></tr>
        <tr><td>Notaría</td><td>${eur(c.g.notaria)}</td></tr>
        <tr><td>ITP (${P.zonas[c.zona] || c.zona} · ${p1(c.itpR * 100)})</td><td>${eur(c.g.itp)}</td></tr>
        <tr class="tot"><td>Total gastos</td><td>${eur(c.g.total)}</td></tr>
      </table></div>
      <div class="calc__group"><h5>Rentabilidad${manual ? ` <small>con ${eur(c.final)}</small>` : ""}</h5><table>
        <tr><td>Coste total</td><td>${eur(c.coste)}</td></tr>
        <tr><td>Beneficio</td><td>${eur(c.beneficio)}</td></tr>
        <tr><td>Margen</td><td>${p1(c.margen)}</td></tr>
        <tr class="tot"><td>Rentabilidad anualizada</td><td>${p1(c.rent)}</td></tr>
      </table></div>`
      : `<p class="calc__empty">Introduce el precio de venta estimado${f.reforma.value === "SI" && f.redis.value === "SI" ? " y la superficie" : ""} para calcular la oferta.</p>`;
    f.precioFinal.placeholder = c.calculada ? `Calculado: ${eur(c.calculada)}` : "Calculado automáticamente";

    // KPIs
    const obj = P.rentObjetivo * 100;
    const rCls = c.rent >= obj - 0.5 ? "good" : c.rent >= obj / 2 ? "mid" : "bad";
    $("#kpis").innerHTML = `
      <div class="kpi kpi--main"><span>Oferta</span><strong>${eur(c.final)}</strong></div>
      <div class="kpi ${c.ok ? rCls : ""}"><span>Rentabilidad anual</span><strong>${c.ok ? p1(c.rent) : "—"}</strong><em>objetivo ${obj} %</em></div>
      <div class="kpi"><span>Beneficio</span><strong>${c.ok ? eur(c.beneficio) : "—"}</strong><em>margen ${c.ok ? p1(c.margen) : "—"}</em></div>
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
    [...f.elements].forEach(el => {
      if (!el.name) return;
      if (el.type === "radio") { if (el.checked) d[el.name] = el.value; return; }
      d[el.name] = el.type === "checkbox" ? el.checked : el.value;
    });
    return d;
  };
  const fill = d => {
    [...f.elements].forEach(el => {
      if (!el.name || !(el.name in d)) return;
      if (el.type === "radio") el.checked = el.value === d[el.name];
      else if (el.type === "checkbox") el.checked = !!d[el.name];
      else el.value = d[el.name] ?? "";
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
    f.reset(); delete f.sup.dataset.touched; current = { no: newNo(), fecha: new Date().toISOString() };
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
      fill({
        sup: d.m2c, reforma: d.estado === "A estrenar / reformado" ? "NO" : "SI",
        nombre: d.nombre, dni: d.dni, telefono: d.telefono, email: d.email, direccion: d.direccion, cp: d.cp,
        tipo: d.tipo, anio: d.anio, m2c: d.m2c, m2u: d.m2u, planta: d.planta, ascensor: d.ascensor, ocupacion: d.ocupacion,
        precio: d.precio, habban: [d.hab, d.banos].filter(Boolean).join(" / "),
        obs: ""
      });
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
