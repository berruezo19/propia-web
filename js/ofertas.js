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

  /* Parámetros y cálculo: js/calculadora.js (compartido con la web pública) */
  const P = window.PROPIA_CALC.P;

  // Superficie de reforma = m² construidos por defecto
  f.m2c.addEventListener("input", () => { if (!f.sup.dataset.touched) f.sup.value = f.m2c.value; });
  f.sup.addEventListener("input", () => f.sup.dataset.touched = "1");

  /* ---------- Nº de oferta ---------- */
  const newNo = () => "OF-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  let current = { no: newNo(), fecha: new Date().toISOString() };

  /* ---------- Cálculo ---------- */
  function calc() {
    const c = window.PROPIA_CALC.calcular({
      venta: num("venta"), sup: num("sup"), zona: f.zonaItp.value, precioManual: num("precioFinal"),
      reforma: f.reforma.value === "SI", redis: f.redis.value === "SI"
    });
    const solicitado = num("precio");
    c.vsSolicitado = solicitado ? (c.final - solicitado) / solicitado * 100 : null;
    c.neto = c.final - num("cargas");
    return c;
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
        <tr><td>Precio máximo (margen ${P.margenMinimo * 100} %)</td><td>${eur(c.precioMax)}</td></tr>
        <tr class="tot"><td>Precio de compra neto (margen ${P.margenOferta * 100} %)</td><td>${eur(c.calculada)}</td></tr>
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
    const lo = P.margenMinimo * 100, hi = P.margenOferta * 100;
    const mCls = c.margen >= hi - 0.05 ? "good" : c.margen >= lo - 0.05 ? "mid" : "bad";
    $("#kpis").innerHTML = `
      <div class="kpi kpi--main"><span>Oferta</span><strong>${eur(c.final)}</strong></div>
      <div class="kpi ${c.ok ? mCls : ""}"><span>Margen</span><strong>${c.ok ? p1(c.margen) : "—"}</strong><em>horquilla ${lo}–${hi} %</em></div>
      <div class="kpi ${c.ok && c.sobreMax ? "bad" : ""}"><span>Precio máximo</span><strong>${c.ok ? eur(c.precioMax) : "—"}</strong><em>margen ${lo} %${c.ok && c.sobreMax ? " · ¡superado!" : ""}</em></div>
      <div class="kpi"><span>vs. solicitado</span><strong>${c.vsSolicitado === null ? "—" : pct(c.vsSolicitado)}</strong><em>${num("precio") ? eur(num("precio")) : ""}</em></div>`;

    // ---------- Documentos ----------
    const hoy = new Date(current.fecha);
    const validoHasta = new Date(hoy); validoHasta.setDate(hoy.getDate() + (num("validez") || 7));
    const ph = t => `<em class="ph">${t}</em>`;
    const lugar = esc(v.poblacion) || "Barcelona";
    const pago = payments(c.final);
    const dir = `${esc(v.direccion) || ph("Dirección del inmueble")}${v.poblacion ? `, ${esc(v.poblacion)}` : ""}${v.cp ? ` (${esc(v.cp)})` : ""}`;
    const head = titulo => `
      <header class="doc__head">
        <div class="logo"><img class="logo__img" src="img/logo-full.svg?v=2" alt="Propia" width="111" height="36"></div>
        <div class="doc__meta"><strong>${titulo}</strong><span>Nº ${esc(current.no)}</span><span>${lugar}, ${fecha(hoy)}</span></div>
      </header>`;
    const tablaPago = `
      <table class="doc__net doc__pay">
        <tr><td>Señal, a la firma de la aceptación de esta oferta</td><td>${eur(pago.senal)}</td></tr>
        <tr><td>Resto de arras hasta el ${pago.pct} % del precio, a la firma del contrato de arras</td><td>${eur(pago.restoArras)}</td></tr>
        <tr><td>Resto del precio (${100 - pago.pct} %), en el otorgamiento de la escritura pública</td><td>${eur(pago.restante)}</td></tr>
        <tr class="tot"><td>Precio total</td><td>${eur(c.final)}</td></tr>
      </table>`;
    const interv = [v.agencia && `Agencia: <strong>${esc(v.agencia)}</strong>`, v.franquiciado && `Franquiciado: <strong>${esc(v.franquiciado)}</strong>`].filter(Boolean).join(" · ");
    const foot = `<footer class="doc__foot">${esc(C.legalName)}${C.cif ? " · CIF " + esc(C.cif) : ""} · ${esc(C.address)} · ${esc(C.email)}${C.phone ? " · " + esc(C.phone) : ""}</footer>`;

    const conds = [
      `El precio se abonará conforme al calendario de pagos indicado. Las cantidades entregadas antes de la escritura tendrán la consideración de arras y se descontarán del precio.`,
      `La escritura pública de compraventa se otorgará a favor de <strong>${esc(C.legalName)}</strong> (o de la persona física o jurídica que al efecto esta designe), ante el notario designado por ${esc(C.legalName)}, en un plazo máximo de <strong>${num("plazo") || 15} días naturales</strong> desde la firma del contrato de arras.`,
      on("c_comision") && "La operación no conlleva comisiones ni honorarios de intermediación para la parte vendedora.",
      on("c_gastos") && `${esc(C.legalName)} asume los gastos de notaría, registro de la propiedad y gestoría derivados de la compraventa.`,
      on("c_estado") && "El inmueble se adquiere en su estado actual de conservación, sin que la parte vendedora deba realizar reformas, reparaciones ni vaciar el inmueble, salvo pacto en contrario.",
      on("c_cancel") && "Las hipotecas, embargos u otras cargas existentes se cancelarán con cargo al precio en el mismo acto de la firma de la escritura.",
      on("c_plusvalia") && "El Impuesto sobre el Incremento de Valor de los Terrenos de Naturaleza Urbana (plusvalía municipal) será a cargo de la parte vendedora, conforme a la legislación vigente.",
      `Entrega de llaves y posesión: <strong>${esc(v.llaves).toLowerCase()}</strong>, con el inmueble libre de ocupantes${v.ocupacion === "Alquilado" ? ", salvo los arrendatarios con contrato en vigor que se detallen" : ""}.`,
      "La oferta está sujeta a la verificación de la información registral (nota simple) y a que la situación legal y física del inmueble coincida con la analizada en el estudio técnico y legal.",
      v.obs && esc(v.obs)
    ].filter(Boolean);

    // 1) OFERTA DE COMPRA
    $("#doc").innerHTML = `${head("Oferta de compra")}
      <p class="doc__to">A la atención de <strong>${esc(v.nombre) || "la propiedad del inmueble"}</strong>${v.dni ? `, con DNI/NIE ${esc(v.dni)}` : ""}:</p>
      <p><strong>${esc(C.legalName)}</strong>${C.cif ? ` (CIF ${esc(C.cif)})` : ""} presenta la siguiente oferta de compra del inmueble que se describe a continuación:</p>
      <div class="doc__prop">
        <div><span>Inmueble</span><strong>${dir}</strong></div>
        <div class="doc__specs">${[v.catastro && `Ref. catastral ${esc(v.catastro)}`, (num("sup") || num("m2c")) && `${num("sup") || num("m2c")} m²`, v.tipo, v.planta && `Planta ${esc(v.planta)}`].filter(Boolean).join(" · ")}</div>
      </div>
      <div class="doc__price"><span>Precio ofertado</span><strong>${eur(c.final)}</strong><em>Pago al contado</em></div>
      ${tablaPago}
      ${on("c_neto") && num("cargas") ? `<table class="doc__net">
        <tr><td>Cancelación de hipoteca / cargas (estimado)</td><td>− ${eur(num("cargas"))}</td></tr>
        <tr class="tot"><td>Importe neto estimado a recibir por la propiedad</td><td>${eur(c.neto)}</td></tr></table>` : ""}
      <h4>Condiciones</h4>
      <ol>${conds.map(x => `<li>${x}</li>`).join("")}</ol>
      <h4>Validez</h4>
      <p>La presente oferta es válida hasta el <strong>${fecha(validoHasta)}</strong>. Transcurrido dicho plazo sin aceptación por escrito, quedará sin efecto.</p>
      ${interv ? `<p class="doc__interv">Operación presentada por: ${interv}</p>` : ""}
      <div class="doc__signs doc__signs--one">
        <div><span></span><strong>Por ${esc(C.legalName)}</strong>${esc(v.firmante) || ""}</div>
      </div>
      ${foot}`;

    // 2) ACEPTACIÓN DE LA OFERTA (generada con los datos de Knack)
    $("#doc2").innerHTML = `${head("Aceptación de la oferta de compra")}
      <p>En ${lugar}, a ${fecha(hoy)}.</p>
      <p>D./Dña. <strong>${esc(v.nombre) || "_______________________________________"}</strong>, con DNI/NIE <strong>${esc(v.dni) || "________________"}</strong>,
        en su condición de propietario/a${v.nombre ? "" : " (o en representación de la propiedad)"} del inmueble sito en <strong>${dir}</strong>${v.catastro ? `, con referencia catastral <strong>${esc(v.catastro)}</strong>` : ""},</p>
      <h4>Manifiesta</h4>
      <ol>
        <li>Que <strong>ACEPTA</strong> la oferta de compra nº <strong>${esc(current.no)}</strong> formulada por <strong>${esc(C.legalName)}</strong>${C.cif ? ` (CIF ${esc(C.cif)})` : ""} por un precio total de <strong>${eur(c.final)}</strong>, que se abonará del siguiente modo:</li>
      </ol>
      ${tablaPago}
      <ol start="2">
        <li>Que con la firma del presente documento recibe la cantidad de <strong>${eur(pago.senal)}</strong> en concepto de señal, que forma parte de las arras y se descontará del precio.</li>
        <li>Que se compromete a firmar el contrato de arras por importe total del ${pago.pct} % del precio y a otorgar la escritura pública de compraventa a favor de <strong>${esc(C.legalName)}</strong> (o de la persona física o jurídica que al efecto esta designe) en un plazo máximo de <strong>${num("plazo") || 15} días naturales</strong> desde la firma de dicho contrato.</li>
        <li>Que el inmueble se transmitirá ${on("c_cancel") ? "libre de cargas, o con las cargas existentes canceladas con cargo al precio en el acto de la escritura," : "libre de cargas y gravámenes,"} al corriente de pago de IBI, comunidad de propietarios y suministros, y libre de ocupantes en la fecha de entrega.</li>
        <li>Que facilitará la documentación necesaria para la operación: nota simple, último recibo del IBI, certificado de deudas de la comunidad, certificado de eficiencia energética y cédula de habitabilidad, en su caso.</li>
        <li>Que la aceptación queda sujeta a las mismas condiciones recogidas en la oferta de compra nº ${esc(current.no)}.</li>
      </ol>
      ${interv ? `<p class="doc__interv">Operación presentada por: ${interv}</p>` : ""}
      <div class="doc__signs">
        <div><span></span><strong>La propiedad</strong>${esc(v.nombre) || "Nombre y DNI"}</div>
        <div><span></span><strong>Por ${esc(C.legalName)}</strong>${esc(v.firmante) || ""}</div>
      </div>
      <p class="doc__rgpd">Los datos personales se tratarán por ${esc(C.legalName)} con la finalidad de gestionar la presente operación de compraventa, conforme al RGPD. Puede ejercer sus derechos escribiendo a ${esc(C.email)}.</p>
      ${foot}`;
  }

  // Calendario de pagos: señal + resto de arras hasta el X % + resto en escritura
  // (como la plantilla de Make: ARRAS = precio × 10 % − 5.000 €; RESTANTE = precio × 90 %)
  function payments(precio) {
    const pct = num("arrasPct") || 10;
    const arras = precio * pct / 100;
    const senal = Math.min(num("senal"), arras);
    return { pct, senal, restoArras: arras - senal, restante: precio - arras };
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
  // Descarga directa del PDF (sin ventana de impresión) con html2pdf.js
  // El logo SVG con degradado no lo pinta html2canvas: se convierte a PNG una vez
  let logoPng = null;
  const getLogoPng = () => logoPng || (logoPng = new Promise(res => {
    const img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = 570; c.height = 184; c.getContext("2d").drawImage(img, 0, 0, 570, 184); try { res(c.toDataURL("image/png")); } catch { res(null); } };
    img.onerror = () => res(null);
    img.src = "img/logo-full.svg?v=2";
  }));
  const safeName = s => String(s || "").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
  $("#btnPrint").addEventListener("click", async () => {
    if (!valid()) return;
    const what = $("#printWhat").value;
    const nombre = { both: "Oferta y aceptacion", oferta: "Oferta", aceptacion: "Aceptacion" }[what];
    const filename = `${safeName(current.no)} - ${nombre} - ${safeName(f.direccion.value)}.pdf`;

    if (typeof window.html2pdf !== "function") {            // sin librería: se usa la impresión del navegador
      document.body.dataset.print = what; window.print(); return;
    }
    const btn = $("#btnPrint"), label = btn.textContent;
    btn.disabled = true; btn.textContent = "Generando PDF…";
    const holder = document.createElement("div"); holder.className = "pdf-holder";
    const wrap = document.createElement("div");
    wrap.className = "pdf-export";
    holder.appendChild(wrap);
    (what === "both" ? ["doc", "doc2"] : what === "oferta" ? ["doc"] : ["doc2"]).forEach((id, i) => {
      const c = $("#" + id).cloneNode(true);
      c.removeAttribute("id"); c.hidden = false; c.classList.add("doc--pdf");
      if (i > 0) c.classList.add("pdf-break");
      wrap.appendChild(c);
    });
    const png = await getLogoPng();
    if (png) wrap.querySelectorAll('img[src$="logo-full.svg?v=2"]').forEach(i => { i.src = png; });
    document.body.appendChild(holder);
    try {
      await window.html2pdf().set({
        margin: [10, 12, 10, 12], filename,
        image: { type: "jpeg", quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", scrollX: 0, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], before: ".pdf-break", avoid: ["tr", "li", ".doc__price", ".doc__signs", ".doc__prop"] }
      }).from(wrap).save();
      msg(`PDF descargado: ${filename}`);
    } catch {
      msg("No se pudo generar el PDF. Inténtalo de nuevo.");
    } finally {
      holder.remove(); btn.disabled = false; btn.textContent = label;
    }
  });

  // Pestañas de vista previa
  document.querySelectorAll(".doc-tabs button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".doc-tabs button").forEach(x => x.classList.toggle("is-on", x === b));
    $("#doc").hidden = b.dataset.tab !== "doc"; $("#doc2").hidden = b.dataset.tab !== "doc2";
  }));

  $("#btnMail").addEventListener("click", () => {
    if (!valid()) return;
    const c = calc();
    const body = `${f.nombre.value ? `Estimado/a ${f.nombre.value}` : "Buenos días"}:

Le hacemos llegar la oferta de compra Nº ${current.no} para el inmueble en ${f.direccion.value}:

· Precio ofertado: ${eur(c.final)}, al contado
· Señal: ${eur(payments(c.final).senal)} · Arras: ${payments(c.final).pct} % · Resto en escritura: ${eur(payments(c.final).restante)}
· Firma ante notario en un máximo de ${num("plazo")} días desde la aceptación
· Sin comisiones${f.c_gastos.checked ? " y sin gastos de notaría ni registro para usted" : ""}

Adjuntamos la oferta y el documento de aceptación con todas las condiciones. La oferta es válida durante ${num("validez")} días.

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
    const c = calc();
    list.unshift({ ...current, guardada: new Date().toISOString(), oferta: c.final, data: snapshot() });
    const saved = store(list);
    refreshCount();

    if (!C.makeWebhookOfertas) { msg(saved ? "Oferta guardada." : "No se pudo guardar en este navegador."); return; }
    const r1 = n => Math.round(n * 10) / 10;
    window.sendToMake(C.makeWebhookOfertas, {
      numero: current.no, fecha: new Date().toISOString().slice(0, 10),
      propietario: f.nombre.value, dni: f.dni.value, telefono: f.telefono.value, email: f.email.value,
      direccion: f.direccion.value, poblacion: f.poblacion.value, cp: f.cp.value, catastro: f.catastro.value, m2: f.sup.value || f.m2c.value,
      agencia: f.agencia.value, franquiciado: f.franquiciado.value, asesor: f.asesor.value,
      senal: payments(c.final).senal, resto_arras: payments(c.final).restoArras, restante: payments(c.final).restante,
      precio_solicitado: num("precio"), precio_venta_estimado: c.venta,
      oferta: c.final, oferta_calculada: c.calculada, precio_manual: num("precioFinal") ? "Sí" : "No",
      gastos_total: Math.round(c.g.total), coste_total: Math.round(c.coste), beneficio: Math.round(c.beneficio),
      margen_pct: r1(c.margen), rentabilidad_pct: r1(c.rent),
      zona: P.zonas[c.zona] || c.zona, reforma: f.reforma.value === "SI" ? "Sí" : "No", redistribucion: f.redis.value === "SI" ? "Sí" : "No",
      validez_dias: num("validez"), plazo_notaria_dias: num("plazo"), firmante: f.firmante.value
    }).then(() => msg(`Oferta guardada y enviada a Make${saved ? "" : " (no se pudo guardar en este navegador)"}.`))
      .catch(() => msg("Oferta guardada, pero no se pudo enviar a Make. Revisa la conexión."));
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
      const reforma = d.reforma ? (d.reforma === "SI" ? "SI" : "NO") : (d.estado === "A estrenar / reformado" ? "NO" : "SI");
      fill({
        sup: d.sup || d.m2c, reforma, venta: d.venta || "",
        zonaItp: ["VC", "CT", "MD", "VC3"].includes(d.zona) ? d.zona : f.zonaItp.value,
        nombre: d.nombre, dni: d.dni, telefono: d.telefono, email: d.email, direccion: d.direccion, poblacion: d.poblacion, cp: d.cp,
        tipo: d.tipo, anio: d.anio, m2c: d.m2c, m2u: d.m2u, planta: d.planta, ascensor: d.ascensor, ocupacion: d.ocupacion,
        precio: d.precio, habban: [d.hab, d.banos].filter(Boolean).join(" / "),
        obs: ""
      });
      if (d.sup || d.m2c) f.sup.dataset.touched = "1";
      update();
      const info = [d.cargas && `Libre de cargas: ${d.cargas}`, d.hipoteca && `Hipoteca: ${d.hipoteca}`, d.obs && `Obs.: ${d.obs}`].filter(Boolean).join(" · ");
      $("#importMsg").innerHTML = `✓ Lead de la web importado (${new Date(d.recibida || Date.now()).toLocaleDateString("es-ES")}).${info ? " " + esc(info) : ""} <b>Revisa la valoración en el apartado 3.</b>`;
      $("#importMsg").hidden = false;
      history.replaceState(null, "", location.pathname);
    } catch { msg("No se pudo leer la solicitud del enlace."); }
  }

  /* ---------- Cargar oferta desde Knack (vía Make) ---------- */
  const KEY_STORE = "propia_knack_key";
  const getKey = () => { try { return localStorage.getItem(KEY_STORE) || ""; } catch { return ""; } };
  const setKey = k => { try { k ? localStorage.setItem(KEY_STORE, k) : localStorage.removeItem(KEY_STORE); } catch {} };
  const kMsg = (t, err) => { const m = $("#knackMsg"); m.textContent = t; m.classList.toggle("is-err", !!err); };
  const showKey = () => { $("#knackKeyWrap").hidden = !!getKey(); };
  showKey();
  if (!C.makeWebhookKnack) { $("#btnKnack").disabled = true; kMsg("Falta configurar makeWebhookKnack en js/config.js."); }

  const strip = h => String(h ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  const ident = raw => (Array.isArray(raw) ? raw : raw ? [raw] : []).map(x => strip(x.identifier ?? x)).filter(Boolean).join(", ");
  const toNum = x => {
    if (typeof x === "number") return x;
    const t = strip(x).replace(/[^\d,.-]/g, "");
    if (!t) return 0;
    return parseFloat(/,\d{1,2}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/[.,]/g, "")) || 0;
  };
  const yes = x => x === true || /^(s[ií]|yes|true)$/i.test(strip(Array.isArray(x) ? x[0] : x));

  async function loadKnack() {
    const numero = $("#knackNum").value.trim();
    const clave = getKey() || $("#knackKey").value.trim();
    if (!numero) return kMsg("Escribe el nº de oferta.", true);
    if (!clave) return kMsg("Escribe la clave de acceso.", true);
    const btn = $("#btnKnack"); btn.disabled = true; kMsg("Buscando en Knack…");
    try {
      const r = await fetch(C.makeWebhookKnack, { method: "POST", body: new URLSearchParams({ numero, clave }) });
      const txt = (await r.text()).trim();
      let k = null;   // oferta normalizada
      if (/^ok=1(&|$)/.test(txt)) {                       // respuesta actual de Make (campo=valor&…)
        const q = new URLSearchParams(txt), g = n => strip(q.get(n));
        if (g("id")) k = {
          id: g("id"), numero: g("numero"),
          direccion: [g("calle"), g("calle2")].filter(Boolean).join(" ") || g("direccion_txt"),
          poblacion: g("ciudad"), cp: g("cp"), catastro: g("catastro"), zona: g("zona"),
          venta: toNum(q.get("venta")) || toNum(q.get("venta_txt")), reforma: yes(g("reforma")), redis: yes(g("redis")),
          sup: toNum(q.get("sup")), agencia: g("agencia"), franquiciado: g("franquiciado"), asesor: g("asesor"),
          estado: g("estado"), precioCompra: toNum(q.get("precio_compra"))
        };
      } else {                                              // compatibilidad: registro de Knack en JSON
        let d; try { d = JSON.parse(txt); } catch { d = null; }
        if (Array.isArray(d)) d = d[0];
        if (d && d.id) { const a = d.field_246_raw || {}; k = {
          id: d.id, numero: strip(d.field_317_raw ?? d.field_317),
          direccion: strip([a.street, a.street2].filter(Boolean).join(" ")) || strip(d.field_246),
          poblacion: strip(a.city), cp: strip(a.zip), catastro: strip(d.field_314_raw ?? d.field_314), zona: strip(d.field_269_raw ?? d.field_269),
          venta: toNum(d.field_234_raw ?? d.field_234), reforma: yes(d.field_235_raw ?? d.field_235), redis: yes(d.field_247_raw ?? d.field_247),
          sup: toNum(d.field_236_raw ?? d.field_236), agencia: ident(d.field_346_raw), franquiciado: ident(d.field_316_raw), asesor: ident(d.field_347_raw),
          estado: strip(d.field_320), precioCompra: toNum(d.field_325_raw ?? d.field_325)
        }; }
      }
      if (!k) { kMsg(`No se ha encontrado la oferta nº ${numero} o la clave no es correcta.`, true); return; }
      setKey(clave); showKey();

      reset();
      const zona = (k.zona || "").toUpperCase();
      fill({
        direccion: k.direccion, poblacion: k.poblacion, cp: k.cp, catastro: k.catastro,
        agencia: k.agencia, franquiciado: k.franquiciado, asesor: k.asesor, estadoKnack: k.estado,
        venta: k.venta || "", reforma: k.reforma ? "SI" : "NO", redis: k.redis ? "SI" : "NO",
        sup: k.sup || "", m2c: k.sup || "", zonaItp: ["VC", "CT", "MD"].includes(zona) ? zona : "VC"
      });
      f.sup.dataset.touched = "1";
      current = { no: String(k.numero || numero), fecha: new Date().toISOString(), knackId: k.id };
      update();
      const prev = k.precioCompra;
      kMsg(`✓ Oferta nº ${current.no} cargada de Knack${prev ? ` · precio de compra guardado en Knack: ${eur(prev)}` : ""}.`);
    } catch {
      kMsg("No se pudo conectar con Make. Revisa la conexión e inténtalo de nuevo.", true);
    } finally { btn.disabled = !C.makeWebhookKnack; }
  }
  $("#btnKnack").addEventListener("click", loadKnack);
  $("#knackNum").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); loadKnack(); } });
  $("#knackMsg").addEventListener("dblclick", () => { setKey(""); showKey(); kMsg("Clave olvidada en este navegador."); });

  importFromHash();
  refreshCount();
  update();
})();
