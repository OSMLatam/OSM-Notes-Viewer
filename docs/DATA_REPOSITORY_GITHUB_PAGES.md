# Opción A: Repositorio de Datos Separado para GitHub Pages

## 🎯 Visión General

Crear un repositorio separado (`OSM-Notes-Data`) que se despliegue en GitHub Pages y sirva solo los archivos JSON.

```
┌─────────────────────────────────┐
│  OSM-Notes-Analytics           │
│  (exportDatamartsToJSON.sh)    │
└──────────────┬──────────────────┘
               │ Exporta JSON
               ▼
┌─────────────────────────────────┐
│  OSM-Notes-Data Repository      │
│  (GitHub Pages - Solo JSON)    │
│  https://osmlatam.github.io/    │
│       OSM-Notes-Data/          │
└──────────────┬──────────────────┘
               │ Load JSON via HTTP
               ▼
┌─────────────────────────────────┐
│  OSM-Notes-Viewer               │
│  (GitHub Pages - Web App)       │
│  https://osmlatam.github.io/    │
│       OSM-Notes-Viewer/         │
└─────────────────────────────────┘
```

## 📋 Paso 1: Crear el Repositorio de Datos

### 1.1 Crear el nuevo repositorio

```bash
# En GitHub, crear nuevo repositorio público:
# Nombre: OSM-Notes-Data
# Descripción: JSON data files for OSM Notes Viewer
# Public: ✅
# README: ✅
# .gitignore: None (los JSON se commitean)
# License: MIT
```

### 1.2 Clonar y configurar

```bash
cd /home/angoca/github
git clone https://github.com/OSMLatam/OSM-Notes-Data.git
cd OSM-Notes-Data
```

### 1.3 Crear estructura básica

```bash
mkdir -p data/{users,countries,indexes}
touch data/.gitkeep
```

### 1.4 Configurar GitHub Pages en el repositorio

1. Ve a Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main`
4. Folder: `/ (root)`
5. Guardar

La URL será: `https://osmlatam.github.io/OSM-Notes-Data/`

---

## 📋 Paso 2: Modificar el Script de Exportación

### 2.1 Crear nuevo script de exportación con Git push

Crea este script en `OSM-Notes-Analytics`:

```bash
# File: bin/dwh/exportAndPushToGitHub.sh

#!/bin/bash

# Exports JSON and pushes to GitHub Pages data repository
# Usage: ./bin/dwh/exportAndPushToGitHub.sh

set -e

# Project directories
declare ANALYTICS_DIR="/home/angoca/github/OSM-Notes-Analytics"
declare DATA_REPO_DIR="/home/angoca/github/OSM-Notes-Data"

# Step 1: Export JSON files
echo "📦 Exporting JSON files..."
cd "${ANALYTICS_DIR}"
./bin/dwh/exportDatamartsToJSON.sh

# Step 2: Copy to data repository
echo "📋 Copying to data repository..."
mkdir -p "${DATA_REPO_DIR}/data"
cp -r "${ANALYTICS_DIR}/output/json/"* "${DATA_REPO_DIR}/data/"

# Step 3: Git commit and push
echo "🚀 Pushing to GitHub..."
cd "${DATA_REPO_DIR}"
git add data/
git commit -m "Auto-update: Export from Analytics $(date +%Y-%m-%d\ %H:%M:%S)"
git push origin main

echo "✅ Done! Data updated in GitHub Pages"
```

### 2.2 Dar permisos de ejecución

```bash
chmod +x bin/dwh/exportAndPushToGitHub.sh
```

---

## 📋 Paso 3: Configurar el Viewer para Usar Datos Remotos

### 3.1 Actualizar API Config

```javascript
// File: src/config/api-config.js

export const API_CONFIG = {
    // Base URL for JSON files
    // Production: GitHub Pages data repository
    BASE_URL: import.meta.env.PROD 
        ? 'https://osmlatam.github.io/OSM-Notes-Data'
        : '/data',  // Local development

    // Cache settings
    CACHE_DURATION: 15 * 60 * 1000, // 15 minutes

    // Endpoints
    ENDPOINTS: {
        metadata: '/metadata.json',
        userIndex: '/indexes/users.json',
        countryIndex: '/indexes/countries.json',
        user: (userId) => `/users/${userId}.json`,
        country: (countryId) => `/countries/${countryId}.json`
    },

    // Feature flags
    FEATURES: {
        enableCache: true,
        enableOfflineMode: false,
        showDebugInfo: false
    }
};
```

### 3.2 Build y commit

```bash
cd /home/angoca/github/OSM-Notes-Viewer
npm run build
git add .
git commit -m "Configure viewer to use remote data repository"
git push
```

---

## 📋 Paso 4: Flujo de Actualización Automática

### Opción A: Actualización Manual

Ejecutas cuando quieras actualizar:

```bash
cd /home/angoca/github/OSM-Notes-Analytics
./bin/dwh/exportAndPushToGitHub.sh
```

**Tiempo estimado:** 1-2 minutos

### Opción B: Cron Job (Automático)

```bash
# Editar crontab
crontab -e

# Agregar esta línea para actualizar cada hora
0 * * * * /home/angoca/github/OSM-Notes-Analytics/bin/dwh/exportAndPushToGitHub.sh >> /var/log/osm-data-update.log 2>&1
```

### Opción C: GitHub Actions (En el Repo de Datos)

Crea `.github/workflows/update-from-analytics.yml`:

```yaml
name: Update Data from Analytics

on:
  schedule:
    # Run every hour
    - cron: '0 * * * *'
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout data repo
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.PAT_TOKEN }}
          
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan github.com >> ~/.ssh/known_hosts
          
      - name: Clone analytics repo
        run: |
          git clone git@github.com:OSMLatam/OSM-Notes-Analytics.git /tmp/analytics
          
      - name: Export and copy data
        run: |
          cd /tmp/analytics
          ./bin/dwh/exportDatamartsToJSON.sh
          cp -r output/json/* ${{ github.workspace }}/data/
          
      - name: Commit and push
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add data/
          git commit -m "Auto-update: $(date '+%Y-%m-%d %H:%M:%S')" || exit 0
          git push
```

**Requisitos:**
- Token `PAT_TOKEN` con permisos de escritura
- Clave SSH privada en `SSH_PRIVATE_KEY`

---

## 🔄 Flujo Completo de Actualización

```
1. Analytics ejecuta exportDatamartsToJSON.sh
   ↓
2. Genera JSON en output/json/
   ↓
3. Copia a OSM-Notes-Data/data/
   ↓
4. Git commit y push a GitHub
   ↓
5. GitHub Pages se actualiza automáticamente
   ↓
6. Viewer carga los nuevos datos (con cache de 15 min)
```

---

## ✅ Ventajas de Este Enfoque

1. **Separación de responsabilidades**
   - Analytics genera datos
   - Repo de datos los sirve
   - Viewer los consume

2. **Actualizaciones independientes**
   - Puedes actualizar datos sin cambiar el viewer
   - Sin necesidad de hacer build del viewer

3. **Mejor rendimiento**
   - Cada repositorio tiene su propio cache de GitHub Pages
   - Los JSON se cachean por separado

4. **Escalabilidad**
   - Fácil migrar a CDN después (solo cambiar BASE_URL)
   - No limita el tamaño del repositorio del viewer

5. **Historial de datos**
   - Puedes ver el historial de cambios en los datos
   - Rollback fácil si hay problemas

---

## 🛠️ Comandos Rápidos

### Ver datos actuales
```bash
ls -lh /home/angoca/github/OSM-Notes-Data/data/
```

### Actualizar manualmente
```bash
cd /home/angoca/github/OSM-Notes-Analytics
./bin/dwh/exportAndPushToGitHub.sh
```

### Ver logs de actualización
```bash
tail -f /var/log/osm-data-update.log
```

### Verificar que funciona
```bash
curl https://osmlatam.github.io/OSM-Notes-Data/metadata.json
```

---

## 📊 Estructura Final

```
OSM-Notes-Data (GitHub Pages)
├── data/
│   ├── metadata.json
│   ├── indexes/
│   │   ├── users.json
│   │   └── countries.json
│   ├── users/
│   │   ├── 123.json
│   │   └── ...
│   └── countries/
│       ├── 1.json
│       └── ...
└── .github/
    └── workflows/
        └── update-from-analytics.yml (opcional)
```

---

## 🚀 Siguiente Paso

¿Quieres que cree el script `exportAndPushToGitHub.sh` ahora?

