# Setup Script para Repositorio de Datos

## Pasos para configurar

### 1. Crear el repositorio en GitHub

```bash
# Ve a: https://github.com/new
# Nombre: OSM-Notes-Data
# Descripción: JSON data files for OSM Notes Viewer
# Public: ✅
# Crea el repositorio
```

### 2. Ejecutar este script

```bash
cd ~/github
git clone https://github.com/OSMLatam/OSM-Notes-Data.git
cd OSM-Notes-Data

# Crear estructura básica
mkdir -p data/{users,countries,indexes}
touch data/.gitkeep

# Commit inicial
git add .
git commit -m "Initial commit"
git push origin main
```

### 3. Configurar GitHub Pages

1. Ve a Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main`
4. Folder: `/ (root)`
5. Save

### 4. Primera exportación

```bash
cd ~/github/OSM-Notes-Analytics
./bin/dwh/exportAndPushToGitHub.sh
```

### 5. Verificar

Espera 1-2 minutos y luego:

```bash
curl https://osmlatam.github.io/OSM-Notes-Data/metadata.json
```

Si ves contenido JSON, ¡funciona!

### 6. Configurar el Viewer

Edita `src/config/api-config.js`:

```javascript
BASE_URL: 'https://osmlatam.github.io/OSM-Notes-Data'
```

Luego rebuild y push:

```bash
cd ~/github/OSM-Notes-Viewer
npm run build
git add .
git commit -m "Configure to use remote data repository"
git push
```

¡Listo! 🎉

