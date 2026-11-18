/* =========================================================
   CONFIGURACIÓN DE LA EMPRESA  —  EDITA AQUÍ TUS DATOS REALES
   ========================================================= */
window.CONFIG = {
  name: "Propia Real Estate",
  legalName: "Propia Real Estate S.L.",   // razón social
  cif: "B-00000000",                       // CIF real
  address: "Calle Ejemplo 1, 28001 Madrid",
  phone: "+34 600 000 000",
  email: "info@propiarealestate.es",
  whatsapp: "34600000000",                 // sin + ni espacios
  hours: "L–V 9:30–14:00 · 16:30–20:00",
  agent: "Departamento comercial",         // firma por defecto en las ofertas
  // Endpoint opcional para recibir formularios (Formspree, Netlify, backend propio…)
  formEndpoint: ""
};

/* =========================================================
   CARTERA DE INMUEBLES (sustituir por los reales o cargar de una API)
   ========================================================= */
window.PROPERTIES = [
  { id: "PR-1021", title: "Piso luminoso reformado", type: "Piso", op: "venta", price: 289000,
    zone: "Centro", m2: 92, rooms: 3, baths: 2, img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=70",
    desc: "Exterior, cuarta planta con ascensor. Cocina abierta equipada, suelos de roble y carpintería climalit." },
  { id: "PR-1034", title: "Ático con terraza de 40 m²", type: "Ático", op: "venta", price: 465000,
    zone: "Ensanche", m2: 110, rooms: 3, baths: 2, img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=70",
    desc: "Terraza perimetral con vistas despejadas, garaje y trastero incluidos." },
  { id: "PR-1040", title: "Casa adosada con jardín", type: "Casa", op: "venta", price: 395000,
    zone: "Periferia", m2: 180, rooms: 4, baths: 3, img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=70",
    desc: "Tres plantas, jardín privado, piscina comunitaria y dos plazas de garaje." },
  { id: "PR-2005", title: "Apartamento amueblado", type: "Piso", op: "alquiler", price: 1150,
    zone: "Centro", m2: 58, rooms: 1, baths: 1, img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=70",
    desc: "Listo para entrar a vivir. Calefacción individual, a 2 minutos del metro." },
  { id: "PR-2011", title: "Piso familiar con garaje", type: "Piso", op: "alquiler", price: 1450,
    zone: "Ensanche", m2: 105, rooms: 3, baths: 2, img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=70",
    desc: "Urbanización con zonas verdes y conserje. Cerca de colegios." },
  { id: "PR-3002", title: "Local comercial a pie de calle", type: "Local", op: "venta", price: 210000,
    zone: "Centro", m2: 130, rooms: 0, baths: 1, img: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&q=70",
    desc: "Gran escaparate en calle de alto tránsito, salida de humos y licencia vigente." }
];
