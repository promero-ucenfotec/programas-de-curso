# Asistente Curricular · DCD

App web estática (GitHub Pages) para armar los programas de curso de CENFOTEC sección por sección.

## Estructura

- `index.html`: solo el marcado de las pantallas y la lista de archivos que se cargan.
- `css/`: estilos generales (`app.css`), pantalla de inicio (`inicio.css`) y oficina (`oficina.css`).
- `js/`: un archivo por parte de la app. Se cargan en el orden de `index.html` y comparten el ámbito global, así que una función de un archivo se puede usar desde otro.
  - `config.js` va primero: configuración de Google y estado global.
  - `arranque.js` va de último entre los archivos de la vista clásica: ahí están las instrucciones que se ejecutan al abrir la app. Todo lo demás solo declara funciones, para que el orden de carga no rompa nada.
  - `oficina.js` es la vista de juego; expone sus funciones en el objeto `Office`.
  - `plantilla-docx.js` guarda la plantilla institucional del Word en base64.
  - `asistente-proyecto.js` es el asistente que configura un proyecto paso a paso (nuevo o existente).

## Al publicar una versión

1. Subir el número `?v=` de todos los `<link>` y `<script>` de `index.html` (evita que el navegador use archivos viejos).
2. El mensaje del commit sigue el formato `Versión N. Descripción`.
3. Los cambios van directo a `main`.
