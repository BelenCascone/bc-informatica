// Precios de mercado para comparar los tuyos.
// Son datos públicos (listas de precios publicadas en internet), por eso viven
// en este archivo y no en la base. Se actualizan a mano: cada vez que se hace
// una búsqueda nueva, se cambian los valores y la fecha de "revisado".
//
// Cada referencia tiene una "clave". Un precio de tu lista se compara con la
// referencia cuya clave coincide con su campo "ref_key".
//   min / max  → rango en pesos (si hay un solo valor, min = max)
//   usdMin / usdMax → rango en dólares; el panel lo pasa a pesos al dólar MEP del día
window.REFERENCIAS_MERCADO = {
  revisado: "2026-09-12",
  items: [
    // ---------- Service en Paraná (Vida Informática, lista Entre Ríos – Paraná, sept. 2026) ----------
    { clave: "srv-diagnostico", categoria: "service", nombre: "Diagnóstico / revisión", min: 12986, max: 22262, unidad: "trabajo",
      nota: "Freelance / con local", zona: "Paraná", fuente: "Vida Informática", fecha: "2026-09",
      url: "https://vidainformatica.com.ar/wp-content/uploads/2026/09/19-Z2ERP.pdf" },
    { clave: "srv-formateo", categoria: "service", nombre: "Formateo + instalación de sistema, sin backup", min: 44524, max: 64931, unidad: "trabajo",
      nota: "Freelance / con local", zona: "Paraná", fuente: "Vida Informática", fecha: "2026-09",
      url: "https://vidainformatica.com.ar/wp-content/uploads/2026/09/19-Z2ERP.pdf" },
    { clave: "srv-pack-ssd", categoria: "service", nombre: "Limpieza + formateo + programas básicos + backup 100 GB + cambio a SSD", min: 74207, max: 102034, unidad: "trabajo",
      nota: "Freelance / con local. Mano de obra, el SSD va aparte", zona: "Paraná", fuente: "Vida Informática", fecha: "2026-09",
      url: "https://vidainformatica.com.ar/wp-content/uploads/2026/09/19-Z2ERP.pdf" },
    { clave: "srv-backup-100", categoria: "service", nombre: "Backup de datos, cada 100 GB extra", min: 14841, max: 24117, unidad: "trabajo",
      nota: "Freelance / con local", zona: "Paraná", fuente: "Vida Informática", fecha: "2026-09",
      url: "https://vidainformatica.com.ar/wp-content/uploads/2026/09/19-Z2ERP.pdf" },
    { clave: "srv-programa", categoria: "service", nombre: "Instalación de un programa comercial (ej. Office)", min: 14841, max: 27828, unidad: "trabajo",
      nota: "Freelance / con local", zona: "Paraná", fuente: "Vida Informática", fecha: "2026-09",
      url: "https://vidainformatica.com.ar/wp-content/uploads/2026/09/19-Z2ERP.pdf" },
    { clave: "srv-componente", categoria: "service", nombre: "Cambio de un componente (ej. RAM)", min: 29683, max: 46380, unidad: "trabajo",
      nota: "Freelance / con local", zona: "Paraná", fuente: "Vida Informática", fecha: "2026-09",
      url: "https://vidainformatica.com.ar/wp-content/uploads/2026/09/19-Z2ERP.pdf" },
    { clave: "srv-visita", categoria: "service", nombre: "Visita a domicilio, 1 hora", min: 24117, max: 46380, unidad: "hora",
      nota: "Freelance / con local", zona: "Paraná", fuente: "Vida Informática", fecha: "2026-09",
      url: "https://vidainformatica.com.ar/wp-content/uploads/2026/09/19-Z2ERP.pdf" },
    { clave: "srv-armado", categoria: "service", nombre: "Armado de PC básica desde cero", min: 83483, max: 111310, unidad: "trabajo",
      nota: "Freelance / con local", zona: "Paraná", fuente: "Vida Informática", fecha: "2026-09",
      url: "https://vidainformatica.com.ar/wp-content/uploads/2026/09/19-Z2ERP.pdf" },
    { clave: "srv-limpieza", categoria: "service", nombre: "Limpieza de hardware + pasta térmica (PC)", min: 27828, max: 83483, unidad: "trabajo",
      nota: "Freelance / con local", zona: "Paraná", fuente: "Vida Informática", fecha: "2026-09",
      url: "https://vidainformatica.com.ar/wp-content/uploads/2026/09/19-Z2ERP.pdf" },

    // ---------- Sistemas y páginas ----------
    { clave: "sis-hora", categoria: "sistemas", nombre: "Hora de desarrollo, perfil junior", usdMin: 20, usdMax: 30, unidad: "hora",
      nota: "Semi-senior USD 30–45; senior USD 45–60", zona: "Argentina", fuente: "SODI", fecha: "2026-04",
      url: "https://www.sodi.com.ar/blog/cuanto-cuesta-software-a-medida-argentina" },
    { clave: "sis-simple", categoria: "sistemas", nombre: "Software a medida simple (6 a 10 semanas)", min: 1000000, max: 1800000, unidad: "proyecto",
      nota: "Precio de agencia. Mediano: $2M–3,5M", zona: "Argentina", fuente: "SODI", fecha: "2026-04",
      url: "https://www.sodi.com.ar/blog/cuanto-cuesta-software-a-medida-argentina" },
    { clave: "sis-landing-inicial", categoria: "sistemas", nombre: "Landing de freelance que recién arranca", min: 100000, max: 250000, unidad: "proyecto",
      nota: "Suelen ser plantillas", zona: "Argentina", fuente: "La Fuerza Marketing", fecha: "2026-02",
      url: "https://lafuerzamarketing.com.ar/cuanto-cuesta-pagina-web-argentina-2026/" },
    { clave: "sis-landing-pro", categoria: "sistemas", nombre: "Landing básica profesional", min: 350000, max: 500000, unidad: "proyecto",
      nota: "Sitio institucional pyme: $800k–1,5M", zona: "Argentina", fuente: "La Fuerza Marketing", fecha: "2026-02",
      url: "https://lafuerzamarketing.com.ar/cuanto-cuesta-pagina-web-argentina-2026/" },
    { clave: "sis-gastro-enlatado", categoria: "sistemas", nombre: "Sistema gastronómico ya armado (competencia de un sistema a medida)", min: 20000, max: 20000, unidad: "mes",
      nota: "Precio del buscador, no verificado en la web del proveedor", zona: "Argentina", fuente: "Resti", fecha: "2026-09",
      url: "https://resti.com.ar/" },

    // ---------- Abonos ----------
    { clave: "abo-web-basico", categoria: "abonos", nombre: "Mantenimiento web básico (hosting, SSL, backups)", min: 25000, max: 50000, unidad: "mes",
      nota: "Profesional con soporte: $80k–150k/mes", zona: "Argentina", fuente: "SODI", fecha: "2026",
      url: "https://www.sodi.com.ar/blog/cuanto-cuesta-mantenimiento-pagina-web" },
    { clave: "abo-hosting-gestionado", categoria: "abonos", nombre: "Hosting web + mail gestionado", min: 38000, max: 38000, unidad: "mes",
      nota: "CABA", zona: "CABA", fuente: "BairesCloud", fecha: "2026-02",
      url: "https://www.bairescloud.ar/servicio-tecnico.php" },

    // ---------- Clases ----------
    { clave: "cla-particular", categoria: "clases", nombre: "Clase particular de computación, 1 hora", min: 2300, max: 3300, unidad: "hora",
      nota: "Perfiles viejos que no actualizan el precio: no sirve como referencia real", zona: "Paraná", fuente: "Superprof", fecha: "2026-09",
      url: "https://www.superprof.com.ar/clases/computacion/parana/" },
  ],
};
