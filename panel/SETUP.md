# Configurar el panel privado (una sola vez)

## 1. Crear el proyecto en Supabase
1. Entrá a https://supabase.com y creá una cuenta gratis (podés usar tu Google).
2. "New project" → elegí un nombre (ej. `bc-informatica`) y una contraseña de base de datos (guardala, no la vas a necesitar de nuevo pero por las dudas).
3. Esperá a que termine de crearse (1-2 minutos).

## 2. Crear las tablas
1. En el menú lateral, andá a **SQL Editor** → **New query**.
2. Pegá todo el contenido de [`supabase/schema.sql`](../supabase/schema.sql) y tocá **Run**.
3. Esto crea las tablas `projects` y `transactions`, con seguridad para que cada dato solo lo puedas ver vos.

## 3. Crear tu usuario
1. Andá a **Authentication → Users → Add user → Create new user**.
2. Cargá tu email y una contraseña. Marcá **Auto Confirm User** para no tener que confirmar por mail.
3. Andá a **Authentication → Settings** (o **Providers → Email**) y desactivá **"Allow new users to sign up"** — así nadie más se puede registrar, solo entra quien vos crees a mano.

## 4. Conectar el panel
1. Andá a **Project Settings → API**.
2. Copiá el **Project URL** y la **anon public key**.
3. Abrí [`panel/config.js`](./config.js) y reemplazá:
   ```js
   window.SUPABASE_CONFIG = {
     url: "https://tu-proyecto.supabase.co",
     anonKey: "tu-anon-key",
   };
   ```
   (Estos dos valores no son secretos — están pensados para usarse en el navegador. Lo que protege tus datos es la seguridad configurada en el paso 2.)

## 5. Listo
- El panel queda en `tusitio.com/panel`.
- Entrás con el email y contraseña que creaste en el paso 3.
- Desde **Proyectos** cargás tus trabajos, desde **Movimientos** tus ingresos y egresos, y en **Resumen** tenés el balance y el gráfico mensual.

## Más adelante: mostrar datos en la landing
Cada proyecto tiene un campo `is_featured` y `featured_result` (ej. "Redujo tiempos de facturación 40%") pensados para marcar qué casos de éxito mostrar públicamente, sin exponer montos ni datos sensibles. Cuando quieras activarlo, avisame y armamos esa parte.
