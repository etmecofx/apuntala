# Apuntala — Guía de despliegue (PWA)

Documento base: Lineamientos Técnicos de Apuntalamiento (Rev. 3, 2026), Comisión Presidencial
para la Evaluación de Habitabilidad de Infraestructuras.
Desarrollo de la aplicación: Ing. Etel Contreras · CIV 192.276.

## Qué es este paquete
Aplicación web instalable (PWA) que funciona sin conexión una vez cargada.
- NO almacena datos del usuario: sin base de datos, sin cuentas, sin servidor de datos.
  Lo único que se guarda es el caché de los archivos de la propia app (<1 MB), que habilita el uso offline.
- El asistente de clasificación por fotografía es OPCIONAL: si no hay conexión o no está
  configurado, la app lo indica y el flujo manual continúa completo.

## Requisitos
- Cuenta gratuita en https://vercel.com (recomendado) o https://netlify.com
- Node.js 18+ solo si desea probar localmente

## Opción 1 — Despliegue en Vercel (recomendado)
1. Cree una cuenta en vercel.com (puede usar GitHub o correo).
2. Suba esta carpeta a un repositorio de GitHub, o use "Add New → Project → Import" y arrastre la carpeta.
3. Vercel detecta Vite automáticamente. Pulse "Deploy". En ~1 minuto tendrá una URL tipo
   https://apuntala.vercel.app
4. Pruebe desde un teléfono: abra la URL → menú del navegador → "Añadir a pantalla de inicio".
5. Verifique el modo offline: active modo avión y vuelva a abrir la app instalada.

## Opción 2 — Netlify
1. En netlify.com: "Add new site → Deploy manually" y arrastre la carpeta `dist/`
   (generada con `npm install && npm run build`), o conecte el repositorio con
   build command `npm run build` y publish directory `dist`.
   Nota: la función /api/clasificar de este paquete está escrita para Vercel; en Netlify
   el asistente de IA quedará como "no configurado" (el resto funciona igual).

## Prueba local (opcional)
    npm install
    npm run dev        →  http://localhost:5173
    npm run build      →  genera dist/ para producción

## Dominio propio (fase 2)
En Vercel: Project → Settings → Domains → agregar su dominio y apuntar el DNS
(registro A o CNAME según lo indique Vercel). La app no requiere ningún cambio.

## Asistente de IA (opcional, se puede activar después)
1. Obtenga una clave en https://console.anthropic.com
2. En Vercel: Project → Settings → Environment Variables → agregue
   ANTHROPIC_API_KEY = su clave
3. Redeploy. El botón "Analizar con IA" quedará operativo.
Sin este paso, la app muestra "asistente no configurado" y todo lo demás funciona.
La función /api/clasificar no guarda imágenes ni datos: solo reenvía la solicitud.

## Actualizaciones
Cada nuevo deploy actualiza la app; los usuarios reciben la versión nueva al abrirla
con conexión (el service worker renueva el caché automáticamente).
