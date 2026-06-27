# Lolita Bebe — Flow Manager

Control de flujo de caja para local de ropa.

---

## Deploy en Railway (guía completa)

### Paso 1 — Preparar GitHub

1. Creá una cuenta en https://github.com si no tenés
2. Creá un repositorio nuevo privado llamado `lolitabb`
3. En tu computadora, abrí Git Bash (o PowerShell) y ejecutá:

```bash
cd C:\Users\SershIA\Desktop\Proyectos Antigravity\LolitaBB\app_actual
git init
git remote add origin https://github.com/TU_USUARIO/lolitabb.git
git add .
git commit -m "primer commit"
git push -u origin main
```

> **Importante:** el .gitignore ya excluye data.json, .env y api-token.txt.
> Tus datos reales NO se suben a GitHub.

---

### Paso 2 — Crear cuenta en Railway

1. Ir a https://railway.app
2. Registrarse con tu cuenta de GitHub (botón "Login with GitHub")
3. Verificar el email si te lo pide

---

### Paso 3 — Crear el proyecto

1. En Railway, clic en **"New Project"**
2. Elegir **"Deploy from GitHub repo"**
3. Seleccionar el repo `lolitabb`
4. Railway detecta automáticamente Node.js y empieza a deployar

---

### Paso 4 — Configurar variables de entorno (MUY IMPORTANTE)

Antes de que la app funcione, hay que configurar el token de seguridad:

1. En Railway, ir a tu proyecto → pestaña **"Variables"**
2. Agregar esta variable:

```
API_TOKEN = (generá uno con el comando de abajo)
```

Para generar el token, abrí PowerShell y ejecutá:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiá el resultado y pegalo como valor de `API_TOKEN` en Railway.

3. Railway reinicia el servidor automáticamente con la nueva variable.

---

### Paso 5 — Subir los datos reales

Una vez que el servidor esté corriendo en Railway, necesitás cargar tu `data.json` actual:

**Opción A (recomendada) — desde la app:**
- Entrá a tu app en Railway
- El primer acceso detectará que no hay datos y te pedirá importarlos

**Opción B — manual vía API:**
```bash
# Desde PowerShell en tu PC
$token = "tu_api_token"
$url = "https://tu-app.railway.app/api/data"
$body = Get-Content "data.json" -Raw
Invoke-RestMethod -Method POST -Uri $url -Headers @{"x-api-token"=$token} -Body $body -ContentType "application/json"
```

---

### Paso 6 — Obtener la URL pública

1. En Railway → tu proyecto → pestaña **"Settings"**
2. En la sección **"Domains"**, clic en **"Generate Domain"**
3. Te da una URL tipo `https://lolitabb-production.up.railway.app`
4. Esa es la URL desde la que accedés desde cualquier dispositivo

---

## Uso diario

- Accedé desde cualquier dispositivo a la URL de Railway
- No hace falta tener la PC prendida
- Los datos se guardan automáticamente en el servidor
- Backup diario automático en la carpeta `backups/`

---

## Desarrollo local

1. Copiá `.env.example` como `.env` y completá `API_TOKEN`
2. Ejecutá `node server.js`
3. Abrí http://localhost:3000

---

## Seguridad

- Nunca compartir el archivo `.env`
- Nunca subir `data.json` real a GitHub
- El token en Railway se puede regenerar cuando quieras desde Variables
- El usuario "operador" tiene contraseña hasheada — para cambiarla:
  ```
  node scripts/hash-password.js nueva_contraseña
  ```
  Y pegá el hash en data.json

---

## Estructura del proyecto

```
lolitabb/
├── server.js          ← Backend Node.js
├── package.json       ← Configuración del proyecto
├── .env.example       ← Template de variables (copiar como .env)
├── .gitignore         ← Archivos excluidos de Git
├── data.json          ← Base de datos (NO se sube a Git)
├── data.json.seed     ← Estructura vacía para Railway
├── public/
│   ├── index.html     ← App frontend (PWA)
│   ├── sw.js          ← Service Worker
│   └── manifest.json  ← Configuración PWA
├── backups/           ← Backups diarios automáticos
└── scripts/
    └── hash-password.js ← Utilidad para hashear contraseñas
```
