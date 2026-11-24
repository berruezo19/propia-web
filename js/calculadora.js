/* =========================================================
   CALCULADORA DE COMPRA DIRECTA — compartida por la web pública y el generador
   Réplica de la hoja de Google "Compra directa" (horquilla de margen 20–25 %).
   Si cambiáis la hoja, cambiad aquí los mismos valores.
   ========================================================= */
window.PROPIA_CALC = (() => {
  const P = {
    margenOferta: 0.25,          // H3 → precio de compra neto (E3, el que lee Make)
    margenMinimo: 0.20,          // H2 → precio máximo para negociar (E2)
    plazoConReforma: 150,        // días (A3)
    plazoSinReforma: 105,
    umbralPrecio: 250000,        // € precio de venta (E4, E16, E17)
    factorBajo: 0.024,           // corrección mensual si venta < 250.000 € (E4)
    factorAlto: 0.016,           // corrección mensual si venta ≥ 250.000 €
    honCompraPct: 0.03, honCompraMin: 3000,   // honorarios de compra + IVA (E15)
    honVentaPct: 0.03, honVentaFijo: 10000, honVentaUmbral: 280000,  // honorarios de venta: 3 % + IVA si la venta ≥ 280.000 €; si no, 10.000 € (IVA incluido)
    iva: 1.21,
    reformaRedisM2Alto: 900, reformaRedisM2Bajo: 700,   // €/m² con redistribución (E17)
    reformaSinRedisAlto: 38000, reformaSinRedisBajo: 30000,
    sinReforma: 12100,
    notaria: 1500, registro: 600, gestoria: 400,   // gastos de la compra (escritura, registro y gestoría)
    itp: { MD: 0.02, CT: 0.10, VC: 0.09, VC3: 0.03, PV: 0.04 },   // H4, sobre el precio de compra
    zonas: { MD: "Madrid", CT: "Cataluña", VC: "Valencia", VC3: "Valencia (3 %)", PV: "País Vasco" }
  };

  /* venta: precio de venta reformado · reforma/redis: booleanos · sup: m² · zona: MD|CT|VC|VC3
     precioManual (opcional): calcula gastos y margen con ese precio en lugar del calculado */
  function calcular({ venta = 0, reforma = false, redis = false, sup = 0, zona = "VC", precioManual = 0 }) {
    const itpR = P.itp[zona] ?? 0.10;
    const plazo = reforma ? P.plazoConReforma : P.plazoSinReforma;                                   // A3
    const factor = venta < P.umbralPrecio ? plazo / 30 * P.factorBajo : plazo / 30 * P.factorAlto;    // E4
    const ventaCorr = venta * (1 - factor);                                                           // E5

    const honCompra = B => (B * P.honCompraPct > P.honCompraMin ? B * P.honCompraPct : P.honCompraMin) * P.iva;   // E15
    const honVenta = venta >= P.honVentaUmbral ? venta * P.honVentaPct * P.iva : P.honVentaFijo;   // los 10.000 € ya llevan IVA
    const gastosCompra = P.notaria + P.registro + P.gestoria;
    const costeReforma = reforma                                                                                      // E17
      ? (redis ? (venta > P.umbralPrecio ? P.reformaRedisM2Alto : P.reformaRedisM2Bajo) * sup
               : (venta < P.umbralPrecio ? P.reformaSinRedisBajo : P.reformaSinRedisAlto))
      : P.sinReforma;

    // Precio P tal que beneficio / coste total = m (despeje exacto, sin referencia circular)
    const hc = P.honCompraPct * P.iva, hcMin = P.honCompraMin * P.iva;
    const precioPara = m => {
      const R = ventaCorr / (1 + m) - honVenta - costeReforma - gastosCompra;
      const conPct = R / (1 + hc + itpR);
      const p = conPct > P.honCompraMin / P.honCompraPct ? conPct : (R - hcMin) / (1 + itpR);
      return Math.max(0, Math.floor(p / 100) * 100);                                                 // REDONDEAR.MENOS(;-2)
    };
    const calculada = precioPara(P.margenOferta);
    const precioMax = precioPara(P.margenMinimo);
    const final = precioManual || calculada;

    const g = { honCompra: honCompra(final), honVenta, reforma: costeReforma, notaria: gastosCompra, itp: itpR * final };
    g.total = g.honCompra + g.honVenta + g.reforma + g.notaria + g.itp;                                  // E20
    const coste = g.total + final;                                                                       // B11
    const beneficio = ventaCorr - coste;                                                                 // C11
    const margen = coste ? beneficio / coste : 0;                                                        // D11
    return {
      venta, plazo, factor, ventaCorr, calculada, precioMax, final, g, coste, beneficio, zona, itpR,
      margen: margen * 100, rent: margen / plazo * 365 * 100, sobreMax: final > precioMax,
      ok: venta > 0 && (!reforma || !redis || sup > 0)
    };
  }

  return { P, calcular };
})();
