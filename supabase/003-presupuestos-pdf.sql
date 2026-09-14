-- BC Informática — Panel privado · 003: presupuestos con PDF para el cliente
-- Va después de 002. Se puede correr dos veces sin romper nada.
--
-- Guarda en cada presupuesto el texto del documento que se le manda al cliente
-- (Nº, qué me contaste, qué no incluye, plazos, renglones de precio, condiciones...),
-- para poder volver a generar el mismo PDF más adelante.
-- Es una columna nueva y vacía: no cambia nada de lo que ya está cargado.

alter table quotes add column if not exists doc jsonb;
