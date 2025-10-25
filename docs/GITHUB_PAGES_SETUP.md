# GitHub Pages Setup

Este documento explica cómo habilitar GitHub Pages para este proyecto.

## Error común

Si ves este error en GitHub Actions:
```
Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions
```

Significa que GitHub Pages no está habilitado en la configuración del repositorio.

## Solución: Habilitar GitHub Pages

### Paso 1: Ir a la configuración del repositorio

1. Ve a tu repositorio en GitHub: `https://github.com/OSMLatam/OSM-Notes-Viewer`
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral, haz clic en **Pages**

### Paso 2: Configurar la fuente

1. En la sección **Source** (Fuente), selecciona:
   - **Source**: `GitHub Actions`
   
2. Haz clic en **Save** (Guardar)

### Paso 3: Verificar

1. Una vez habilitado, el workflow `.github/workflows/deploy-pages.yml` se ejecutará automáticamente en cada push a `main`
2. Después de unos minutos, tu sitio estará disponible en:
   ```
   https://osmlatam.github.io/OSM-Notes-Viewer/
   ```

## Alternativa: Usar branch estático

Si prefieres NO usar GitHub Actions para el despliegue:

1. En Settings > Pages, selecciona **Deploy from a branch**
2. Selecciona `main` como branch
3. Selecciona `/` (root) como carpeta
4. El contenido de `dist/` se desplegará automáticamente

⚠️ **Nota**: Con esta opción, necesitarás hacer commit del directorio `dist/` después de cada build.

## Troubleshooting

### El sitio no se actualiza
- Espera 1-2 minutos después del despliegue
- Revisa los logs de GitHub Actions para ver si hubo errores
- Limpia el caché del navegador

### Error 404
- Verifica que el archivo `dist/index.html` existe
- Verifica que el workflow de despliegue se ejecutó correctamente
- Revisa la configuración de _redirects para SPA

### Permisos insuficientes
- Asegúrate de tener permisos de administrador en el repositorio
- Verifica que el workflow tiene los permisos correctos en `.github/workflows/deploy-pages.yml`

## Referencias

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

