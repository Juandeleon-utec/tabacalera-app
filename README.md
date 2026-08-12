# Tabacalera App — Sistema de compra de fardos de tabaco

Sistema completo para registrar la compra de fardos de tabaco en campo, compuesto por:
- **`app/`** — Aplicación móvil Android (React Native + Expo)
- **`backend/`** — API REST interna (Node.js + Express + MySQL)

---

## Arquitectura general

```
[App Android]  ←→  [Red WiFi interna]  ←→  [Servidor backend]
      ↕                                            ↕
  SQLite local                               MySQL / Sequelize
```

La app funciona **100% offline**. Solo necesita WiFi interno para:
1. Sincronización inicial (descargar usuarios, agricultores y transportistas)
2. Actualización de transportistas (puede hacerla cualquier usuario logueado)
3. Envío automático de remitos cerrados al servidor

---

## Instalación del Backend

### Requisitos
- Node.js >= 22 (versión LTS activa — v18 llegó a fin de vida)
- MySQL >= 8.4
- npm >= 10
- Ubuntu Server 24.04 LTS (recomendado)
- PM2: `npm install -g pm2`

### Pasos

```bash
cd backend
# Instalar dependencias
npm install

# Copiar y editar la configuración
cp .env.example .env
nano .env
```

### Variables de entorno del backend (.env)

| Variable | Descripción | Valor actual |
|----------|-------------|--------------|
| `DB_HOST` | IP del servidor MySQL | `192.168.4.202` |
| `DB_PORT` | Puerto MySQL | `3306` |
| `DB_USER` | Usuario MySQL | `root` |
| `DB_PASS` | Contraseña MySQL | *(configurada en servidor)* |
| `DB_NAME` | Nombre de la BD | `tabacalera` |
| `JWT_SECRET` | Secreto JWT | *(configurado en servidor)* |
| `JWT_EXPIRES_IN` | Duración del token | `14d` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno | `production` |
| `ALLOWED_IPS` | Redes permitidas para `/api/sync` | `127.0.0.1,192.168.4.0/24,192.168.5.0/24,192.168.0.0/24` |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt del superadmin | *(generado con bcrypt)* |

> **Nota:** La base de datos `tabacalera` debe existir antes de iniciar.
> Las tablas se crean automáticamente al arrancar (Sequelize sync).

### Tablas creadas automáticamente por Sequelize
- `usuarios` — usuarios de campo + superadmin
- `agricultores` — productores registrados
- `transportistas` — empresas transportistas y choferes
- `envios` — registros de compra de fardos
- `fardos` — códigos QR escaneados por envío

### Iniciar en producción con PM2

```bash
pm2 start src/app.js --name tabacalera-backend
pm2 save
pm2 startup   # Ejecutar el comando que genera para arranque automático
```

### Endpoints API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/sync` | Solo red interna | Descarga usuarios + agricultores + transportistas |
| `POST` | `/api/envios/sync` | JWT | Sube envíos cerrados desde la app |
| `GET` | `/api/envios` | JWT | Lista todos los envíos |
| `GET` | `/api/envios/:id` | JWT | Detalle de un envío con fardos |

---

## Instalación de la App

### Requisitos
- Node.js >= 22
- npm >= 10
- EAS CLI: `npm install -g eas-cli`
- Cuenta Expo: [expo.dev](https://expo.dev)

### Pasos (desarrollo)

```bash
cd app
npm install
npx expo login
npx expo start
```

Escanear el QR con **Expo Go** en el dispositivo Android para probar.

> **Importante:** Expo Go tiene limitaciones con librerías nativas
> (impresora térmica). Para prueba completa usar la APK de producción.

### Variables de entorno de la app (.env)

| Variable | Descripción | Valor actual |
|----------|-------------|--------------|
| `API_URL` | URL del servidor backend | `http://192.168.4.202:3000` |
| `SUPERADMIN_USUARIO` | Usuario del superadmin local | `admin` |
| `SUPERADMIN_PASSWORD` | Contraseña del superadmin | `Admin2026!` |
| `DIAS_VENCIMIENTO_SESION` | Días antes de requerir re-sync | `14` |
| `TEMPORADA_ACTUAL` | Año en 2 dígitos para validar QR | `26` |

> **Nota:** Estas variables se embeben en el momento de compilación.
> Si cambiás alguna, hay que recompilar la APK.

---

## Compilación y distribución de la APK

### Build APK de producción

```bash
cd app

# 1. Iniciar sesión en Expo (si no estás logueado)
npx expo login

# 2. Compilar la APK en la nube (EAS Build)
eas build --platform android --profile production

# 3. Descargar la APK del link que genera EAS al finalizar
# 4. Instalar en cada dispositivo manualmente o por ADB:
adb install tabacalera-montepaz.apk
```

> El perfil `production` genera una APK (no AAB) lista para
> instalación directa sin Play Store.
> El build se realiza en la nube de EAS; no requiere Android Studio.

### Plan gratuito de EAS
- **15 builds Android por mes** (se resetea el 1 de cada mes)
- **Timeout:** 45 minutos por build
- Suficiente para este proyecto de uso interno

### Actualizar el número de versión antes de cada build

En `app/app.json`, incrementar ambos valores:
```json
"version": "1.0.x",
"versionCode": x
```

### Historial de versiones

| Versión | versionCode | Fecha | Descripción |
|---------|-------------|-------|-------------|
| 1.0.0 | 1 | 06/2026 | Versión inicial |
| 1.0.1 | 2 | 06/2026 | Corrección cleartext HTTP |
| 1.0.2 | 3 | 06/2026 | Transportistas + historial + PDF sin rechazados |
| 1.0.3 | 4 | 06/2026 | Correcciones historial + saludo + actualización transportistas |
| 1.0.4 | 5 | 06/2026 | Mejoras escáner QR compatibilidad Android moderno |

---

## Flujo de uso

### Primera vez (sincronización inicial)
1. El dispositivo debe estar en la **red WiFi interna** de la empresa.
2. Ingresar con usuario `admin` y la contraseña configurada.
3. Presionar **"Sincronizar todo"**.
4. La app descarga usuarios, agricultores y transportistas desde el servidor.
5. Cerrar sesión admin. Los compradores de campo ya pueden ingresar.

### Uso diario (compradores de campo)
1. Ingresar con usuario y contraseña de comprador.
2. Seleccionar el agricultor de la lista.
3. Seleccionar empresa transportista y chofer.
4. Completar datos opcionales (documento, observaciones).
5. Escanear los fardos con la cámara del dispositivo.
6. Al terminar, presionar **"Cerrar envío"**.
7. El PDF se guarda automáticamente en `/Downloads/Montepaz/`.
8. Compartir el PDF por WhatsApp si corresponde.
9. Opcionalmente imprimir el ticket en el PDA Q2I.
10. Cuando haya WiFi interno, los envíos se sincronizan automáticamente.

### Actualizar transportistas (usuario de campo)
- Estando en la red interna, presionar **"Actualizar transportistas"**
  desde la pantalla principal.
- No requiere ser superadmin.
- Los agricultores **no** se actualizan por esta vía (solo sync completa del admin).

### Formato del código QR
```
AAAAAABBBBBBB
│     │
│     └── 7 dígitos: BB = año temporada (ej: 26), BBBBB = secuencial
└──────── 6 dígitos: código del agricultor
```
Ejemplo: `1235552600001`
- `123555` = código agricultor
- `26` = temporada 2026
- `00001` = número secuencial del fardo

### Vencimiento de sesión
Si no se realiza una sincronización en **14 días**, la app bloquea
el acceso a los compradores y solicita que el superadmin realice
una nueva sync.

---

## Actualización del backend en el servidor

```bash
# Conectarse al servidor
ssh administrador@192.168.4.202

# Actualizar código y reiniciar
cd ~/node_app/tabacalera-app && git pull origin main && cd backend && npm install && pm2 restart tabacalera-backend && pm2 logs tabacalera-backend
```

Verificar que los logs muestren:
```
Conexión a MySQL establecida correctamente.
Modelos sincronizados con la base de datos.
Servidor tabacalera corriendo en puerto 3000
```

Salir de los logs con `Ctrl+C`.

---

## Generación del hash de contraseña (bcrypt)

Para generar el hash de una contraseña nueva (usuarios o superadmin):

```bash
cd ~/node_app/tabacalera-app/backend
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('la_contraseña', 10).then(h => console.log(h));"
```

---

## Trabajo con múltiples PCs de desarrollo

Este proyecto usa **Git + GitHub** como fuente única de verdad.
Seguir siempre este flujo para evitar conflictos:

### Al comenzar a trabajar en cualquier PC

```bash
cd ruta/al/proyecto/tabacalera-app
git pull origin main
```

> **Siempre hacer pull antes de empezar a editar.**

### Al terminar de trabajar

```bash
cd ruta/al/proyecto/tabacalera-app
git add .
git commit -m "descripción clara del cambio"
git push origin main
```

### Si hay conflictos al hacer pull

Ocurre cuando dos PCs modificaron el mismo archivo. Git lo indica así:
```
CONFLICT (content): Merge conflict in app/screens/PantallaLogin.js
```

Opciones para resolver:

**Opción A — Quedarse con la versión del servidor (GitHub):**
```bash
git fetch origin
git reset --hard origin/main
```
> ⚠️ Esto descarta todos los cambios locales no commiteados.

**Opción B — Resolver manualmente:**
```bash
# Abrir el archivo en conflicto en VS Code
code app/screens/PantallaLogin.js
# Buscar las marcas <<<<<<< HEAD y elegir qué versión conservar
git add .
git commit -m "resolver conflicto en PantallaLogin"
git push origin main
```

### Flujo recomendado con dos PCs

```
PC Principal (Windows - desarrollo)
  → Hacer cambios
  → git add . && git commit -m "..." && git push origin main
  → eas build (si hay cambios nativos)

PC Secundaria (cualquier OS)
  → git pull origin main  ← SIEMPRE primero
  → Hacer cambios
  → git add . && git commit -m "..." && git push origin main

Servidor Ubuntu (192.168.4.202)
  → git pull origin main
  → npm install && pm2 restart tabacalera-backend
```

### Autenticación GitHub en el servidor Ubuntu

El servidor usa token de acceso personal (PAT) para autenticarse.
Si expira el token, generá uno nuevo en:
**GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
- Scope: solo `repo`
- Luego actualizar en el servidor:
```bash
git remote set-url origin https://Juandeleon-utec:TOKEN_NUEVO@github.com/Juandeleon-utec/tabacalera-app.git
```

---

## Credenciales y configuración del sistema

| Parámetro | Valor |
|-----------|-------|
| Servidor backend | `192.168.4.202:3000` |
| Base de datos | `tabacalera` |
| Repositorio GitHub | `github.com/Juandeleon-utec/tabacalera-app` |
| Proyecto Expo | `juanpdeleon/tabacalera-app` |
| Superadmin app | `admin` / `Admin2026!` |
| Temporada actual | `26` |
| Redes internas habilitadas | `192.168.4.x`, `192.168.5.x`, `192.168.0.x` |

---

## Estructura de archivos

```
tabacalera-app/
├── .gitignore
├── README.md
├── app/
│   ├── App.js                    # Entry point y navegación
│   ├── app.json                  # Configuración Expo + EAS
│   ├── eas.json                  # Perfiles de compilación EAS
│   ├── package.json
│   ├── babel.config.js
│   ├── .env.example
│   ├── assets/
│   │   ├── logo.png              # Logo app (blanco, para splash/login)
│   │   ├── logo-pdf.png          # Logo en color para PDF
│   │   ├── icon.png              # Ícono app Android (1024x1024)
│   │   └── adaptive-icon.png     # Ícono adaptativo Android
│   ├── constants/
│   │   └── colores.js            # Paleta de colores única de la app
│   ├── config/
│   │   └── config.js             # Configuración central (API_URL, etc.)
│   ├── screens/
│   │   ├── PantallaLogin.js      # Login para todos los usuarios
│   │   ├── PantallaAdmin.js      # Panel superadmin (sync inicial)
│   │   ├── PantallaInicio.js     # Selector de agricultor + transportista
│   │   ├── PantallaEscaner.js    # Cámara + validación QR en tiempo real
│   │   ├── PantallaEnvio.js      # Resumen + cerrar + PDF + imprimir
│   │   └── PantallaHistorial.js  # Historial de envíos con filtro por fecha
│   ├── components/
│   │   └── ItemFardo.js          # Fila de la lista de fardos
│   ├── plugins/
│   │   └── withImpresionTermica.js # Plugin nativo impresora Q2I
│   ├── services/
│   │   ├── baseDeDatos.js        # SQLite: todas las operaciones
│   │   ├── autenticacion.js      # Login, sesión, vencimiento
│   │   ├── api.js                # Llamadas axios al backend
│   │   ├── validadorQR.js        # Lógica de validación del código QR
│   │   ├── generadorPDF.js       # Generación PDF (expo-print)
│   │   └── sincronizacion.js     # Sync inicial + sync automática
│   └── utils/
│       └── uuid.js               # Generador de IDs locales
└── backend/
    ├── package.json
    ├── .env.example
    └── src/
        ├── app.js                # Entry point Express
        ├── db/
        │   ├── migrate.js        # Crear/actualizar tablas
        │   └── seed.js           # Datos de ejemplo
        ├── models/
        │   ├── index.js          # Sequelize + relaciones
        │   ├── Usuario.js
        │   ├── Agricultor.js
        │   ├── Transportista.js  # ← Agregado
        │   ├── Envio.js
        │   └── Fardo.js
        ├── routes/
        │   ├── sync.js           # GET /api/sync
        │   └── envios.js         # /api/envios/*
        └── middleware/
            ├── auth.js           # JWT verificación y generación
            └── ipWhitelist.js    # Filtrado por IP de red interna
```

---

## Seguridad

- Las contraseñas de usuarios se almacenan con **bcrypt** (salt rounds = 10).
- El superadmin local tiene credenciales en `config.js` (no commitear con datos reales).
- El endpoint `/api/sync` solo responde a IPs de las redes internas configuradas en `ALLOWED_IPS`.
- Los envíos al servidor requieren token JWT obtenido en la sync inicial.
- Si un usuario es desactivado en el servidor, queda bloqueado en la próxima sync.
- Si el dispositivo no sincroniza en 14 días, la sesión vence automáticamente.
- La app solo se comunica con el servidor por WiFi interno, nunca por 4G/5G.

---

## Hardware soportado

| Dispositivo | Escáner QR | GPS | Impresora térmica | PDF |
|-------------|-----------|-----|-------------------|-----|
| PDA Q2I (S3220) | ✅ | ✅ | ✅ ESC/POS 58mm | ✅ |
| Celular Android moderno | ✅ | ✅ | ❌ | ✅ |
| Tablet Android | ✅ | ✅ | ❌ | ✅ |

---
## Licencia

Software desarrollado por **Juan De León** para uso exclusivo de
Compañía Industrial de Tabacos Monte Paz S.A.

La propiedad intelectual del código, arquitectura y diseño del sistema
pertenece al autor. Montepaz posee licencia de uso exclusivo para sus
operaciones internas. Queda prohibida la redistribución, copia o 
reutilización del software sin autorización expresa del autor.

© 2026 Juan De León — Todos los derechos reservados.
