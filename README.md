# </BC> INFORMÁTICA // Software & IT

Sitio web oficial y landing page de **BC Informática** — Soluciones informáticas
para tu casa y tu empresa. Sin vueltas y en tu idioma. Paraná, Entre Ríos.

Desarrollado por **Belén Cascone** (Analista en Sistemas).

---

## ⚡ Cómo está hecho

Es un sitio estático de **un solo archivo**: todo el HTML, el CSS y el JavaScript
viven en `index.html`. No hay framework ni dependencias en el navegador; lo único
externo son las fuentes de Google.

- **Navegación por pestañas** con router propio por hash (`#/inicio`,
  `#/servicios`, `#/proyectos`, `#/precios`, `#/sobre-mi`, `#/contacto`). Al
  cambiar de pestaña se cambia de vista, no se scrollea: en el celular cada
  sección arranca arriba.
- **Sistema de diseño Dev Blueprint**: grafito `#121412`, lima `#C6FF00`, verde
  circuito `#1B4332`, crema `#FBF8E6`.
- **Tipografías**: Space Grotesk (títulos), JetBrains Mono (etiquetas y terminal),
  Inter (texto).
- **Animaciones** de tipeo, entrada de vista y barrido al navegar, todas apagadas
  cuando el sistema pide menos movimiento (`prefers-reduced-motion`).
- **Vite** se usa solamente para empaquetar y copiar `public/assets` al build.

---

## 🛠️ Servicios

1. **[01] Service Técnico** — Reparación de PC y notebooks, formateo, limpieza,
   cambio de piezas, recuperación de datos. Diagnóstico previo sin cargo.
2. **[02] Sistemas a Medida** — Software para stock, clientes, ventas, turnos y
   pedidos, entregado por etapas.
3. **[03] Clases Personalizadas** — Desde cero para perder el miedo: Office,
   internet, celular, IA aplicada. A domicilio en Paraná.
4. **[04] Asesoramiento Técnico** — Elección de equipos, orden tecnológico,
   backups y seguridad antes de gastar de más.

---

## 🚀 Desarrollo local

```bash
git clone https://github.com/BelenCascone/bc-informatica.git
cd "BC INFORMATICA"
npm install
npm run dev     # servidor de desarrollo (panel en /panel/index.html)
npm run build   # compila a dist/
npm test        # tests del panel (necesita el usuario de prueba en .env.local)
```

Para un cambio de texto o de estilo no hace falta nada de esto: se edita
`index.html` y se abre en el navegador.

## 📦 Estructura

```
index.html          → el sitio entero
logo.jpeg           → favicon e imagen para redes
public/assets/      → placas de Instagram y material de marca
public/panel/       → panel privado (Supabase): proyectos, movimientos y precios
public/panel/vistas → una pestaña del panel por archivo
supabase/           → tablas del panel y guía de configuración (SETUP.md)
tests/              → tests de Playwright del panel (casos en docs/casos/)
vercel.json         → reenvía todas las rutas a index.html
```

El deploy es automático: cada push a `main` lo publica Vercel.

Cómo está armado todo, dónde vive, qué decisiones se tomaron y qué falta:
[`BASE-CONOCIMIENTO.md`](BASE-CONOCIMIENTO.md). El plan del panel está en
[`docs/roadmap-panel.md`](docs/roadmap-panel.md).

---

## 📱 Contacto & Redes

- **WhatsApp**: [+54 9 343 503-8054](https://wa.me/5493435038054)
- **Instagram**: [@bc.informatica.pna](https://www.instagram.com/bc.informatica.pna)
- **Email**: bc.informatica.pna@gmail.com
- **Ubicación**: Paraná, Entre Ríos (atención presencial y remota)
