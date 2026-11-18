/* =========================================================
   DATOS DE PROPIA — edita aquí y se actualiza toda la web
   ========================================================= */
window.PROPIA = {
  name: "PROPIA",
  legalName: "PROPIA Real Estate",          // razón social completa (ej. "Propia Real Estate S.L.")
  cif: "",                                   // CIF (aparece en las ofertas si se rellena)
  email: "info@propiarealestate.es",
  phone: "",                                 // ej. "+34 600 000 000" (si se deja vacío no se muestra)
  whatsapp: "",                              // ej. "34600000000" (sin + ni espacios)
  address: "Pg. de la Zona Franca, 83-95, Planta 3, Sants-Montjuïc, 08038 Barcelona",

  // Envío del formulario de solicitud:
  // - Vacío  → se abre el correo del visitante con la solicitud ya redactada.
  // - URL de Formspree (https://formspree.io/f/XXXX) u otro servicio → se envía directamente.
  formEndpoint: "",

  // URL pública de la web (para el enlace "Abrir en el generador" que llega con cada solicitud)
  siteUrl: "https://propiarealestate.es"
};
