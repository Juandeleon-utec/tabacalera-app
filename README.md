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
1. Sincronización inicial (descargar usuarios y agricultores)
2. Envío automático de remitos cerrados al servidor

---

## Instalación del Backend

### Requisitos

- Node.js >= 18
- MySQL >= 8.0
- npm >= 9

### Pasos

```bash
cd backend

# Instalar dependencias
npm install

# Copiar y editar la configuración
cp .env.example .env
nano .env   # Editar DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET, ALLOWED_IPS

# Crear la base de datos en MySQL
mysql -u root -p -e "CREATE DATABASE tabacalera_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE USER 'tabacalera_user'@'localhost' IDENTIFIED BY 'tu_password';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON tabacalera_db.* TO 'tabacalera_user'@'localhost';"
mysql -u root -p -e "FLUSH PRIVILEGES;"

# Crear las tablas
npm run db:migrate

# Cargar datos de prueba (opcional)
npm run db:seed

# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start
```

### Variables de entorno (.env)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_HOST` | Host MySQL | `localhost` |
| `DB_PORT` | Puerto MySQL | `3306` |
| `DB_USER` | Usuario MySQL | `tabacalera_user` |
| `DB_PASS` | Contraseña MySQL | `password_seguro` |
| `DB_NAME` | Nombre de la BD | `tabacalera_db` |
| `JWT_SECRET` | Secreto JWT (largo y aleatorio) | `abc123...xyz` |
| `JWT_EXPIRES_IN` | Duración del token | `7d` |
| `PORT` | Puerto del servidor | `3000` |
| `ALLOWED_IPS` | IPs permitidas para `/api/sync` | `127.0.0.1,192.168.1.0/24` |

### Endpoints API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Estado del servidor |
| `GET` | `/api/sync` | Solo red interna | Descarga usuarios + agricultores |
| `POST` | `/api/envios/sync` | JWT | Sube envíos cerrados desde la app |
| `GET` | `/api/envios` | JWT | Lista todos los envíos |
| `GET` | `/api/envios/:id` | JWT | Detalle de un envío |

---

## Instalación de la App

### Requisitos

- Node.js >= 18
- npm >= 9
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (para build APK): `npm install -g eas-cli`
- Android Studio (para emulador) o dispositivo físico Android

### Pasos (desarrollo)

```bash
cd app

# Instalar dependencias
npm install

# Copiar y editar la configuración
cp .env.example .env
nano .env   # Editar API_URL, SUPERADMIN_PASSWORD, etc.

# Reemplazar el logo placeholder
# Copiar su logo en: app/assets/logo.png
# Recomendado: PNG cuadrado 512x512px con fondo transparente o sólido

# Iniciar el servidor de desarrollo
npm start
# o directamente para Android:
npm run android
```

### Build APK para distribución

```bash
# Primero configure su cuenta EAS
eas login
eas build:configure

# Build APK (para distribución directa, sin Play Store)
eas build --platform android --profile preview

# Build AAB (para Play Store)
eas build --platform android --profile production
```

### Variables de entorno de la app (.env)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `API_URL` | URL del servidor backend | `http://192.168.1.100:3000` |
| `SUPERADMIN_USUARIO` | Usuario del superadmin local | `admin` |
| `SUPERADMIN_PASSWORD` | Contraseña del superadmin | `AdminTabacalera2024!` |
| `DIAS_VENCIMIENTO_SESION` | Días antes de requerir re-sync | `7` |
| `TEMPORADA_ACTUAL` | Año en 2 dígitos para validar QR | `26` |

---

## Flujo de uso

### Primera vez (sincronización inicial)

1. El dispositivo debe estar en la **red WiFi interna** de la empresa.
2. Ingresar con usuario `admin` y la contraseña configurada en `.env`.
3. Presionar **"Sincronizar ahora"**.
4. La app descarga usuarios y agricultores desde el servidor.
5. Cerrar sesión admin. Los compradores de campo ya pueden ingresar.

### Uso diario (compradores de campo)

1. Ingresar con usuario y contraseña de comprador.
2. Seleccionar el agricultor de la lista.
3. Escanear los fardos con la cámara del dispositivo.
4. Al terminar, presionar **"Cerrar envío"**.
5. Generar y compartir el PDF por WhatsApp u otras apps.
6. Cuando haya WiFi interno, los envíos se sincronizan automáticamente.

### Formato del código QR

```
AAAAAABBBBBBB
│     │
│     └── 7 dígitos: BB = año temporada (ej: 26), BBBBB = secuencial
└──────── 6 dígitos: código del agricultor
```

Ejemplo: `1000012601234`
- `100001` = código agricultor
- `26` = temporada 2026
- `01234` = número secuencial del fardo

### Vencimiento de sesión

Si no se realiza una sincronización en 7 días, la app bloquea el acceso a los compradores y solicita que el superadmin realice una nueva sync.

---

## Estructura de archivos

```
tabacalera-app/
├── .gitignore
├── README.md
├── app/
│   ├── App.js                    # Entry point y navegación
│   ├── app.json                  # Configuración Expo
│   ├── package.json
│   ├── babel.config.js
│   ├── .env.example
│   ├── assets/
│   │   └── logo.png              # Logo de la empresa (reemplazar)
│   ├── screens/
│   │   ├── PantallaLogin.js      # Login para todos los usuarios
│   │   ├── PantallaAdmin.js      # Panel superadmin (solo sync)
│   │   ├── PantallaInicio.js     # Selector de agricultor
│   │   ├── PantallaEscaner.js    # Cámara + validación QR en tiempo real
│   │   └── PantallaEnvio.js      # Resumen + cerrar + PDF
│   ├── components/
│   │   └── ItemFardo.js          # Fila de la lista de fardos
│   ├── services/
│   │   ├── baseDeDatos.js        # SQLite: todas las operaciones
│   │   ├── autenticacion.js      # Login, sesión, vencimiento
│   │   ├── api.js                # Llamadas axios al backend
│   │   ├── validadorQR.js        # Lógica de validación del código QR
│   │   ├── generadorPDF.js       # Generación y compartir PDF
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
- El superadmin local tiene credenciales hardcodeadas en `.env` (nunca commitear `.env`).
- El endpoint `/api/sync` solo responde a IPs de la red interna (configurable en `ALLOWED_IPS`).
- Los envíos al servidor requieren token JWT obtenido en la sync inicial.
- Si un usuario es desactivado en el servidor, queda bloqueado en la próxima sync.

---

## Logo

Reemplazar `app/assets/logo.png` con el logo oficial de la empresa.

- Formato: PNG
- Tamaño recomendado: **512×512 px** (mínimo 256×256)
- Fondo: transparente o sólido oscuro (el splash usa fondo `#1B4332`)

---

## Licencia

Uso interno — Montepaz S.A.
