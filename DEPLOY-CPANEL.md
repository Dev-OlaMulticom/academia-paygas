# Guía de Despliegue en cPanel - Academia PayGas

## Requisitos Previos

- cPanel con **Node.js** habilitado (Phusion Passenger)
- Node.js 20+ instalado en cPanel
- Acceso SSH (opcional, para debug)
- Git instalado en cPanel (para auto-deploy)

---

## Método 1: Despliegue Manual (File Manager)

### Paso 1: Preparar el build local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/academia-paygas.git
cd academia-paygas

# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Compilar servidor TypeScript
npx tsc --project tsconfig.server.json

# Construir frontend
npx vite build

# Verificar build
ls -la dist/
# Deberías ver: index.html, assets/, server/
```

### Paso 2: Subir archivos a cPanel

1. Comprimir el proyecto (excluir `node_modules/`):
```bash
tar -czf academia-paygas.tar.gz --exclude='node_modules' --exclude='.git' .
```

2. En cPanel → **File Manager** → Ir a tu directorio home
3. Crear carpeta `academia-paygas`
4. Subir `academia-paygas.tar.gz`
5. Extraer el archivo

### Paso 3: Configurar Node.js en cPanel

1. En cPanel → **Setup Node.js App**
2. Click **Create Application**
3. Configurar:
   - **Node.js Version**: 20 (o la disponible)
   - **Application Mode**: Production
   - **Application Root**: `/home/tu-usuario/academia-paygas`
   - **Application Startup File**: `app.js`
4. Click **Create**

### Paso 4: Instalar dependencias

En la consola de Node.js de cPanel:
```bash
npm install --production
```

O vía SSH:
```bash
cd ~/academia-paygas
npm install --production
npx prisma generate
```

### Paso 5: Variables de entorno

En cPanel → **Setup Node.js App** → Tu aplicación → **Environment variables**

Agregar cada variable:
- `DATABASE_URL` = `postgres://user:pass@host:5432/db`
- `JWT_SECRET` = `tu-secret-aqui`
- `ENCRYPTION_KEY` = `tu-encryption-key-aqui`
- `SMTP_HOST` = `academia.paygas.com.br`
- `SMTP_PORT` = `465`
- `SMTP_USER` = `email@academia.paygas.com.br`
- `SMTP_PASS` = `tu-password-smtp`
- `APP_URL` = `https://academia.paygas.com.br`
- `PORT` = `3001`

### Paso 6: Ejecutar migraciones

Vía SSH:
```bash
cd ~/academia-paygas
npx prisma migrate deploy
```

### Paso 7: Iniciar la aplicación

En cPanel → **Setup Node.js App** → Tu aplicación → **Run**

---

## Método 2: Despliegue Automático (Git)

### Paso 1: Configurar repositorio Git

1. En cPanel → **Git Version Control**
2. Click **Create**
3. Configurar:
   - **Repository Path**: `/home/tu-usuario/academia-paygas`
   - **Repository URL**: `https://github.com/tu-usuario/academia-paygas.git`
   - **Branch**: `main`
   - **Deployment Token**: (generar uno)
4. Click **Create & Deploy**

### Paso 2: Configurar .cpanel.yml

El archivo `.cpanel.yml` ya está configurado en el repositorio. Verifica que la ruta sea correcta:

```yaml
---
deployment:
  tasks:
    - export DEPLOYPATH=/home/$USER/academia-paygas
    # ... resto de la configuración
```

### Paso 3: Push para activar deploy

```bash
git add .
git commit -m "deploy: configure cPanel deployment"
git push origin main
```

cPanel automáticamente ejecutará el build y desplegará la aplicación.

---

## Método 3: Script de Despliegue

```bash
# Ejecutar el script de preparación
bash scripts/deploy-cpanel.sh

# Subir el paquete generado a cPanel
# Seguir los pasos del Método 1
```

---

## Estructura de Directorios en cPanel

```
/home/tu-usuario/academia-paygas/
├── app.js                    # Entry point para Passenger
├── package.json              # Dependencias
├── .env                      # Variables de entorno (NO commitear)
├── prisma/
│   ├── schema.prisma         # Esquema de base de datos
│   └── migrations/           # Migraciones
├── server/
│   └── certs/                # Certificados SSL (opcional)
├── dist/
│   ├── index.html            # SPA entry point
│   ├── assets/               # CSS, JS, fonts
│   └── server/
│       └── index.js          # Servidor compilado
├── node_modules/             # Dependencias
└── tmp/
    └── restart.txt           # Para reiniciar Passenger
```

---

## Solución de Problemas

### Error: "Cannot find module"
```bash
cd ~/academia-paygas
npm install
npx prisma generate
```

### Error: "EACCES permission denied"
```bash
chmod -R 755 ~/academia-paygas
chmod -R 755 ~/academia-paygas/dist
```

### Error: "Port already in use"
Cambiar el puerto en cPanel → Environment variables → `PORT=3002`

### Error: "Prisma client not generated"
```bash
cd ~/academia-paygas
npx prisma generate
npx prisma migrate deploy
```

### La aplicación no inicia
1. Verificar que `app.js` existe y tiene permisos correctos
2. Verificar variables de entorno en cPanel
3. Revisar logs en cPanel → **Error Log**

### Frontend no carga (404)
1. Verificar que `dist/index.html` existe
2. Verificar que `dist/assets/` tiene archivos
3. Revisar configuración de `.htaccess`

---

## SSL/HTTPS

cPanel maneja SSL a nivel de Apache/Nginx. No necesitas configurar SSL en la aplicación Node.js.

Para habilitar SSL:
1. En cPanel → **SSL/TLS**
2. Instalar certificado (Let's Encrypt gratis)
3. Asignar al dominio/subdominio

La aplicación Node.js correrá en HTTP interno ( puerto 3001), y Apache/Nginx hará proxy reverso con SSL.

---

## Proxy Reverso (OBLIGATORIO)

Para que las llamadas a la API funcionen a traves del dominio (ej: `https://academia.paygas.com.br/api/health`), Apache debe hacer proxy reverso de `/api/*` al puerto 3001.

### Configuracion en .htaccess

El archivo `.htaccess` raiz debe contener:

```apache
# ─── Reverse Proxy: /api/* → Node.js backend (port 3001) ───
<IfModule mod_proxy.c>
    <IfModule mod_proxy_http.c>
        RewriteEngine On
        RewriteCond %{REQUEST_URI} ^/api/
        RewriteRule ^api/(.*) http://127.0.0.1:3001/api/$1 [P,L]
    </IfModule>
</IfModule>
```

### Requisitos del servidor

- `mod_proxy` habilitado en Apache
- `mod_proxy_http` habilitado en Apache
- En cPanel → "Select Apache Version" → seleccionar "Proxy" o contactar al hosting

### Sin proxy reverso (problema comun)

Si no hay proxy configurado:
1. Browser pide `https://academia.paygas.com.br/api/health`
2. Apache no encuentra archivo fisico `/api/health`
3. `dist/.htaccess`SPA fallback lo redirige a `index.html`
4. Se devuelve HTML del frontend en vez de JSON de la API

### Verificacion

```bash
# Directo al servidor Node (siempre funciona)
curl http://127.0.0.1:3001/api/health

# Via el dominio (requiere proxy configurado)
curl https://academia.paygas.com.br/api/health
# Debe retornar: {"status":"ok",...}
```

---

## Variables de Entorno Críticas

| Variable | Descripción | Seguridad |
|----------|-------------|-----------|
| `DATABASE_URL` | URL de conexión PostgreSQL | Nunca exponer |
| `JWT_SECRET` | Secreto para tokens JWT | Generar con `crypto.randomBytes(32)` |
| `ENCRYPTION_KEY` | Clave AES-256-GCM (opcional, se genera dinámica) | Generar con `crypto.randomBytes(32)` |
| `SMTP_PASS` | Contraseña del email | Nunca exponer |

---

## Comandos Útiles

```bash
# Ver logs
tail -f ~/academia-paygas/logs/*.log

# Reiniciar aplicación
touch ~/academia-paygas/tmp/restart.txt

# Verificar estado
cd ~/academia-paygas && npx prisma status

# Migrar base de datos
cd ~/academia-paygas && npx prisma migrate deploy

# Generar Prisma client
cd ~/academia-paygas && npx prisma generate
```
