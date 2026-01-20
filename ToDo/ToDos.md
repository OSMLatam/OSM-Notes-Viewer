## ✅ Completado

- Montar la página bajo notes.osm.lat ✅
- Actualizar estructura de archivos de usuarios con hash hexadecimal ✅

## 📋 En Progreso - Visor de Notas y Funcionalidades

Ver el TODO detallado en: [NOTES_VIEWER_TODO.md](./NOTES_VIEWER_TODO.md)

### Resumen de Funcionalidades Planificadas:

1. **Página Principal**
   - Buscador de nota por ID
   - Link a sección Mapa

2. **Visor de Nota Individual** (`/pages/note.html`)
   - Estado de la nota, mapa con ubicación
   - Panel de interacciones cronológicas
   - Links a perfiles de usuarios y países
   - Identificación de hashtags con links
   - Campo de comentario y botones de acción
   - Recomendación de hashtags (#surveyme #invalid)
   - Integración con ML de Analytics (recomendación: cerrar/comentar/mapear)
   - Etiquetas JOSM si recomendación es "mapear"

3. **Página de Hashtag** (`/pages/hashtag.html`)
   - Listado de notas con un hashtag específico

4. **Página de Mapa** (`/pages/map.html`)
   - Mapa de notas abiertas (zoom 500km desde ubicación usuario)
   - Mapa de notas cerradas (zoom 500km desde ubicación usuario)
   - Mapa de boundaries (países y zonas marítimas)
   - Documentación de uso del WMS

## 📋 Pendiente

- Incluir una herramienta de gestión de traducción (weblate, transifex, crowdin o poeditor)

## ✅ Completado Adicional

- Tener una sección de manifiesto que explique la perspectiva de las notas, la historia del trabajo
  en notas, con links a todo lo hecho, y la historia de este proyecto ✅
- Mencionar que hay una comunidad en Latam dedicada a resolver notas ✅
- Indicar correo de contacto ✅
- Mostrar la arquitectura de los 8 repositorios y 2 bases de datos ✅
- Tener una sección en la página que apunte a Grafana para monitoreo ✅
