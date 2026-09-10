export const siteConfig = {
  name: "BC Informática",
  brandCode: "</BC>",
  role: "Analista en Sistemas",
  founder: "Belén",
  location: "Paraná · Entre Ríos",
  coverage: "Presencial en Paraná y a distancia a todo el país",
  tagline: "Soluciones informáticas para tu casa y tu empresa.",
  subtagline: "Sin vueltas y en tu idioma.",
  instagram: {
    handle: "@bc.informatica",
    url: "https://www.instagram.com/bc.informatica",
  },
  // Reemplazá con tu número cuando quieras (formato internacional sin signos, ej: 549343XXXXXXX)
  whatsapp: {
    number: "5493434689033", // Número predeterminado o editable
    defaultMessage: "Hola Belén! Vi la web de BC Informática y quería hacerte una consulta.",
  },
  github: {
    user: "bcinformaticapna",
    url: "https://github.com/bcinformaticapna",
  }
};

export const methodCode = `// ~/bc-informatica/about.ts
01 // lo que me importa
02 const metodo = {
03   explicar: "sin tecnicismos",
04   responder: "rápido",
05   resolver: "de verdad"
06 };`;

export const services = [
  {
    id: "service-tecnico",
    num: "01",
    tag: "// SERVICIOS",
    title: "SERVICE TÉCNICO",
    punchline: "¿ANDA LENTA? SE ARREGLA.",
    description: "Mantenimiento, optimización y reparación para que tu computadora funcione como el primer día.",
    theme: "dark", // dark or cream
    items: [
      "Reparación de PC y notebooks de todas las marcas",
      "Formateo, limpieza profunda y cambio de piezas",
      "Recuperación de archivos perdidos y backups seguros",
      "Diagnóstico transparente antes de cobrarte nada"
    ],
    inquiryTopic: "reparación o service técnico de mi PC/Notebook"
  },
  {
    id: "sistemas-a-medida",
    num: "02",
    tag: "// SERVICIOS",
    title: "SISTEMAS A MEDIDA",
    punchline: "DEJÁ EL EXCEL ETERNO.",
    description: "Software diseñado y programado específicamente para la forma real en que funciona tu negocio.",
    theme: "cream",
    items: [
      "Software pensado para tu forma de trabajar",
      "Control de stock, ventas, clientes, turnos y pedidos",
      "Se adapta a la empresa, no al revés",
      "Capacitación paso a paso y soporte continuo incluidos"
    ],
    inquiryTopic: "desarrollo de un sistema a medida para mi negocio"
  },
  {
    id: "clases-personalizadas",
    num: "03",
    tag: "// SERVICIOS",
    title: "CLASES PERSONALIZADAS",
    punchline: "NADIE NACIÓ SABIENDO.",
    description: "Aprendé tecnología práctica con paciencia, sin tecnicismos complicados y a tu propio ritmo.",
    theme: "dark",
    items: [
      "Desde cero o para sacarte el miedo y las dudas",
      "Manejo de Office, internet, celular e Inteligencia Artificial",
      "Al ritmo de cada persona, sin apuros",
      "Clases presenciales en Paraná o por videollamada"
    ],
    inquiryTopic: "clases personalizadas de computación / tecnología"
  },
  {
    id: "asesoramiento-tecnico",
    num: "04",
    tag: "// SERVICIOS",
    title: "ASESORAMIENTO TÉCNICO",
    punchline: "PREGUNTÁ ANTES DE COMPRAR.",
    description: "Una opinión honesta y profesional para no malgastar plata en compras equivocadas.",
    theme: "cream",
    items: [
      "Qué equipo comprar y cuál no según tu presupuesto",
      "Cómo ordenar y proteger la tecnología de tu negocio",
      "Políticas de seguridad, respaldos y contraseñas",
      "Una opinión honesta antes de que gastes de más"
    ],
    inquiryTopic: "asesoramiento técnico para compras o negocio"
  }
];

export const carouselSlides = [
  { id: 1, src: "./assets/bc-carrusel-01.png", title: "Presentación BC Informática" },
  { id: 2, src: "./assets/bc-carrusel-02.png", title: "Quién Soy - Belén Analista" },
  { id: 3, src: "./assets/bc-carrusel-03.png", title: "01. Service Técnico" },
  { id: 4, src: "./assets/bc-carrusel-04.png", title: "02. Sistemas a Medida" },
  { id: 5, src: "./assets/bc-carrusel-05.png", title: "03. Clases Personalizadas" },
  { id: 6, src: "./assets/bc-carrusel-06.png", title: "04. Asesoramiento Técnico" },
  { id: 7, src: "./assets/bc-carrusel-07.png", title: "Contame qué necesitás" }
];
