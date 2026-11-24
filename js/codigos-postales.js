/* Código postal → municipio (y distrito en Barcelona) para la calculadora de la web.
   Al escribir el código postal se rellenan solos Comunidad, Municipio y Barrio/distrito,
   y el cliente lo puede cambiar si no es correcto. */
window.PROPIA_CP = (() => {
  const M = {};
  const add = (muni, ...cps) => cps.forEach(cp => { M[cp] = muni; });
  const rango = (muni, a, b) => { for (let n = a; n <= b; n++) M[String(n).padStart(5, "0")] = muni; };
  rango("Badalona", 8910, 8918);
  rango("Barcelona", 8001, 8042);
  add("Begues", "08859");
  add("Castelldefels", "08860");
  add("Cornellà de Llobregat", "08940");
  add("El Prat de Llobregat", "08820");
  add("Esplugues de Llobregat", "08950");
  add("Gavà", "08850");
  rango("Granollers", 8400, 8403);   // Vallès Oriental
  rango("L'Hospitalet de Llobregat", 8901, 8908);
  add("Montcada i Reixac", "08110");
  add("Ripollet", "08291");
  add("Rubí", "08191");
  rango("Sabadell", 8201, 8208);
  add("Sant Adrià de Besòs", "08930");
  add("Sant Boi de Llobregat", "08830");
  add("Sant Climent de Llobregat", "08849");
  add("Sant Cugat del Vallès", "08172", "08173", "08174", "08195", "08196", "08197", "08198");
  add("Sant Feliu de Llobregat", "08980");
  rango("Santa Coloma de Gramenet", 8921, 8924);
  rango("Terrassa", 8221, 8228);
  add("Viladecans", "08840");
  rango("València", 46001, 46026);

  // Barcelona: código postal → distrito (el distrito mayoritario cuando el código abarca varios)
  const BCN = {
    "08001": "Ciutat Vella", "08002": "Ciutat Vella", "08003": "Ciutat Vella", "08039": "Ciutat Vella",
    "08007": "Eixample", "08008": "Eixample", "08009": "Eixample", "08010": "Eixample", "08011": "Eixample",
    "08013": "Eixample", "08015": "Eixample", "08025": "Eixample", "08029": "Eixample", "08036": "Eixample", "08037": "Eixample",
    "08004": "Sants-Montjuïc", "08014": "Sants-Montjuïc", "08038": "Sants-Montjuïc", "08040": "Sants-Montjuïc",
    "08028": "les Corts", "08034": "les Corts",
    "08006": "Sarrià-Sant Gervasi", "08017": "Sarrià-Sant Gervasi", "08021": "Sarrià-Sant Gervasi", "08022": "Sarrià-Sant Gervasi",
    "08012": "Gràcia", "08023": "Gràcia", "08024": "Gràcia",
    "08032": "Horta-Guinardó", "08035": "Horta-Guinardó", "08041": "Horta-Guinardó",
    "08016": "Nou Barris", "08031": "Nou Barris", "08033": "Nou Barris", "08042": "Nou Barris",
    "08027": "Sant Andreu", "08030": "Sant Andreu",
    "08005": "Sant Martí", "08018": "Sant Martí", "08019": "Sant Martí", "08020": "Sant Martí", "08026": "Sant Martí"
  };
  // Comunidad por las dos primeras cifras (para códigos que no están en la lista)
  const PROV = { "08": "CT", "17": "CT", "25": "CT", "43": "CT", "28": "MD", "03": "VC", "12": "VC", "46": "VC" };
  return cp => {
    cp = String(cp || "").trim();
    if (!/^\d{5}$/.test(cp)) return null;
    return { comunidad: PROV[cp.slice(0, 2)] || "", municipio: M[cp] || "", barrio: M[cp] === "Barcelona" ? BCN[cp] || "" : "" };
  };
})();
