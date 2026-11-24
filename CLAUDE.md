# Instrucciones para trabajar en este repositorio

- Leé `README.md` para la estructura de archivos.
- Los cambios se suben directo a `main` (sin ramas ni pull requests).
- Cada versión sube el `?v=` de `index.html` y usa el mensaje `Versión N. Descripción`.
- Ningún archivo de `js/` ejecuta código al cargarse, salvo `arranque.js` (y `oficina.js`, que arma el objeto `Office`). Si algo debe correr al abrir la app, va en `arranque.js`.
- Textos de la interfaz en español con voseo. No enumerar tres o más elementos en una oración: usar un término que los reúna.
- Antes de subir, comprobar la sintaxis con `node --check` en cada archivo de `js/` y abrir la app en un navegador sin errores en la consola.
