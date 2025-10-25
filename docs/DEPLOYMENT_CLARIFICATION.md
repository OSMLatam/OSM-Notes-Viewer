# Clarificación: GitHub Pages - Branch vs Actions

## Diferencias Clave

### Opción A: Deploy from a Branch
- **Qué hace**: GitHub Pages lee archivos directamente del repositorio
- **Ventaja**: Más simple, no necesita Actions
- **Desventaja**: Los archivos `dist/` deben estar commitados en el repo
- **Configuración**: Source = "Deploy from a branch"

### Opción B: GitHub Actions (Nuestro Workflow Actual)
- **Qué hace**: Un workflow de GitHub Actions construye los archivos y los despliega
- **Ventaja**: No necesita commitear `dist/`, se genera automáticamente
- **Desventaja**: Requiere habilitar GitHub Actions en Settings
- **Configuración**: Source = "GitHub Actions"

## Nuestro Caso

Hemos configurado un workflow (`.github/workflows/deploy-pages.yml`) que usa **Opción B (GitHub Actions)**.

Por lo tanto, necesitas:
1. Ir a Settings → Pages
2. Seleccionar **"GitHub Actions"** como Source
3. Guardar

## Verificación

Si eliges "GitHub Actions":
- ✅ El workflow se ejecutará automáticamente
- ✅ Los archivos en `dist/` NO se commitean al repo
- ✅ GitHub Pages se construye desde Actions

Si eliges "Deploy from a branch":
- ❌ El workflow NO funcionará
- ⚠️ Tendrías que commitear `dist/` manualmente
- ⚠️ No es lo que configuramos

## Lo que DEBES hacer ahora

**Ir a: https://github.com/OSMLatam/OSM-Notes-Viewer/settings/pages**

**Y seleccionar "GitHub Actions" como Source**

