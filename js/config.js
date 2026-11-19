/* =========================================================
   DATOS DE PROPIA — edita aquí y se actualiza toda la web
   ========================================================= */
window.PROPIA = {
  name: "PROPIA",
  legalName: "PropiaRealEstate",            // nombre que aparece en la web, ofertas y aceptaciones
  cif: "",                                   // CIF (aparece en las ofertas si se rellena)
  email: "info@propiarealestate.es",
  phone: "",                                 // ej. "+34 600 000 000" (si se deja vacío no se muestra)
  whatsapp: "",                              // ej. "34600000000" (sin + ni espacios)
  address: "Pg. de la Zona Franca, 83-95, Planta 3, Sants-Montjuïc, 08038 Barcelona",

  // ===== Datos del titular para el AVISO LEGAL (aviso-legal.html) =====
  // Rellenar con los datos exactos de la sociedad. Mientras estén vacíos se muestran marcados en amarillo.
  legal: {
    titular: "ESPRESIVITY SL",
    nif: "B64794241",
    domicilio: "Paseo de la Zona Franca, 83-95, 3ª planta (08038 Barcelona)",
    registro: "Registro Mercantil de Barcelona, en el Tomo 40.303, Folio 221, Hoja B-362.938",
    telefono: "934872824",
    actualizado: "19 de noviembre de 2026"
  },

  // ===== Integración con Make (y desde Make → Slack, Sheets, CRM…) =====
  // Pega aquí la URL del "Custom webhook" de cada escenario de Make (https://hook.eu2.make.com/...)
  makeWebhookSolicitudes: "https://hook.eu1.make.com/hlpxabjctdie9wj5l986tk336sjve8hv",   // "PROPIA Web - Leads de la calculadora": email con cada lead
  makeWebhookOfertas: "",       // se dispara al pulsar "Guardar oferta" en el generador
  // Escenario "PROPIA Web - Leer oferta de Knack": devuelve los datos de una oferta de Knack
  // por su nº. Pide una clave que NO está en el código (se escribe en el generador la primera vez).
  makeWebhookKnack: "https://hook.eu1.make.com/k6pobf8kmzh49ketmmj26hx57kbesvxi",

  // Alternativa sin Make: URL de Formspree u otro servicio. Si todo está vacío,
  // se abre el correo del visitante con la solicitud ya redactada.
  formEndpoint: "",

  // URL pública de la web (para el enlace "Abrir en el generador" que llega con cada solicitud)
  siteUrl: "https://propiarealestate.es"
};

/* Envío a un webhook de Make. Se manda como formulario (x-www-form-urlencoded), que Make
   interpreta automáticamente, y en modo no-cors para que el navegador no lo bloquee. */
window.sendToMake = (url, data) => fetch(url, {
  method: "POST",
  mode: "no-cors",
  body: new URLSearchParams(Object.entries(data).map(([k, v]) => [k, v == null ? "" : String(v)]))
});
