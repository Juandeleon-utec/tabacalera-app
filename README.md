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
1. Sincronización inicial (descargar usuarios, agricultores, transportistas y colores de etiqueta)
2. Envío de remitos cerrados al servidor

El comprobante de la transacción es un **PDF** generado en el dispositivo y
compartido por WhatsApp. No hay impresión física.

---

## Instalación del Backend

### Requisitos

- Node.js >= 18 (en producción: 22 LTS)
- MySQL >= 8.0 (en producción: 8.4)
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

> **Nota MySQL 8.4:** el plugin `mysql_native_password` fue removido.
> El usuario debe crearse con `caching_sha2_password` (default).

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
| `ALLOWED_IPS` | IPs permitidas para `/api/sync` | `192.168.4.0/24,192.168.5.0/24` |

### Endpoints API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Estado del servidor |
| `GET` | `/api/sync` | Solo red interna | Descarga usuarios + agricultores + transportistas + colores de etiqueta (activos) |
| `POST` | `/api/envios/sync` | JWT | Sube envíos cerrados desde la app |
| `GET` | `/api/envios` | JWT | Lista todos los envíos |
| `GET` | `/api/envios/:id` | JWT | Detalle de un envío |
| `GET` | `/api/admin/colores-etiqueta` | Sesión admin | Lista colores de etiqueta |
| `POST` | `/api/admin/colores-etiqueta` | Sesión admin | Crea un color (`nombre`, `hex`, `activo`) |
| `PUT` | `/api/admin/colores-etiqueta/:id` | Sesión admin | Modifica un color |
| `PATCH` | `/api/admin/colores-etiqueta/:id/desactivar` | Sesión admin | Desactiva un color |
| `DELETE` | `/api/admin/colores-etiqueta/:id` | Sesión admin | Elimina un color (409 si tiene envíos asociados) |

`POST /api/envios/sync` acepta además `color_etiqueta_id`, `color_etiqueta_nombre`
y `color_etiqueta_hex` por envío. Son opcionales: los APK anteriores a 1.3.0
no los envían y el envío se guarda igual con esos campos en `NULL`.

> **Pendiente de verificar:** si existen endpoints separados para
> transportistas (ej. `GET /api/transportistas`), agregarlos a esta tabla.

### Actualización del backend en producción

```bash
ssh administrador@192.168.4.202
cd ~/node_app/tabacalera-app
git pull origin main
cd backend
npm install
pm2 restart tabacalera-backend
pm2 logs tabacalera-backend
```

Salida esperada en los logs:
```
Conexión a MySQL establecida correctamente.
Modelos sincronizados con la base de datos.
Servidor tabacalera corriendo en puerto 3000
```
Salir de los logs con `Ctrl+C`.

**Todo en una línea:**
```bash
cd ~/node_app/tabacalera-app && git pull origin main && cd backend && npm install && pm2 restart tabacalera-backend && pm2 logs tabacalera-backend
```

### Migración: colores de etiqueta (app 1.3.0)

Esta versión agrega la tabla `colores_etiqueta` y tres columnas en `envios`.
Se aplica con un script **idempotente** que no usa `sync({ alter })`.
Hay que correrlo **una vez, antes de reiniciar PM2**: el código nuevo consulta
las columnas nuevas y fallaría si no existen.

```bash
cd ~/node_app/tabacalera-app && git pull origin main
cd backend && npm install

# Backup previo (recomendado)
mysqldump -u tabacalera_user -p tabacalera_db envios > ~/backup_envios_$(date +%F).sql

npm run db:migrate:colores
npm run db:seed        # carga los colores iniciales (findOrCreate, no duplica)
pm2 restart tabacalera-backend
```

Salida esperada de la migración:
```
Tabla colores_etiqueta: OK
Columna envios.color_etiqueta_id: creada
Columna envios.color_etiqueta_nombre: creada
Columna envios.color_etiqueta_hex: creada
FK envios.color_etiqueta_id: creada
Migración colores de etiqueta completada.
```
Si se vuelve a correr, informa `ya existía` en cada paso.

> Los colores iniciales están en `backend/src/db/seed.js` (array `coloresEtiqueta`).
> Confirmar nombres y hex con planta antes de correr el seed en producción;
> después se administran desde el panel.

### Tabla `colores_etiqueta`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | INT PK AI | |
| `nombre` | VARCHAR(50) NOT NULL UNIQUE | ej. "Rojo" |
| `hex` | CHAR(7) NOT NULL | `#RRGGBB` en mayúsculas. Se acepta `RRGGBB` y se normaliza |
| `activo` | BOOLEAN DEFAULT true | Solo los activos se descargan a la app |
| `created_at` / `updated_at` | DATETIME | |

En `envios` se agregan (nullable, para no afectar compras anteriores):

| Campo | Tipo | Notas |
|-------|------|-------|
| `color_etiqueta_id` | INT FK → `colores_etiqueta.id` | `ON DELETE SET NULL` |
| `color_etiqueta_nombre` | VARCHAR(50) | Snapshot al momento de la compra |
| `color_etiqueta_hex` | CHAR(7) | Snapshot al momento de la compra |

Nombre y hex se copian en el envío: si después se edita un color en el panel,
los históricos y PDFs ya emitidos no cambian.

---

## Instalación de la App

### Requisitos

- Node.js >= 18
- npm >= 9
- Android Studio con SDK Platform 34+
- JDK 17
- Variable de entorno `ANDROID_HOME` configurada
- Expo Go instalado en el celular (para desarrollo)

> Ya **no** se usa EAS Build ni se requiere cuenta de Expo.
> La compilación es local, sin cola de espera.

### Pasos (desarrollo)

```bash
cd app

# Instalar dependencias
npm install

# Copiar y editar la configuración
cp .env.example .env
nano .env

# Reemplazar el logo placeholder
# Copiar el logo en: app/assets/logo.png
# Recomendado: PNG cuadrado 512x512px

# Iniciar el servidor de desarrollo
npx expo start
```

Escanear el QR con **Expo Go** desde el celular. Fast Refresh activo:
los cambios se ven en segundos, sin recompilar.

---

## Compilación de la APK

### Generar el APK de producción

```bash
cd app

# Solo la primera vez (genera la carpeta android/)
npx expo prebuild

cd android
./gradlew assembleRelease
```

El APK queda en:
```
app/android/app/build/outputs/apk/release/app-release.apk
```

Tiempo: 5–15 min la primera vez, 2–5 min las siguientes.

### Instalar en los dispositivos

```bash
adb install -r app-release.apk
```

O copiar el archivo al celular y abrirlo manualmente
(requiere habilitar "Instalar apps de origen desconocido").

> El flag `-r` reinstala sobre la versión existente **conservando**
> los datos locales de SQLite.

### Firma (keystore)

El keystore está en `app/android/app/montepaz.keystore`.

Configuración en `app/android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file('montepaz.keystore')
        storePassword System.getenv("MONTEPAZ_STORE_PASS")
        keyAlias 'montepaz'
        keyPassword System.getenv("MONTEPAZ_KEY_PASS")
    }
}
buildTypes {
    release { signingConfig signingConfigs.release }
}
```

> **Crítico:** hacer backup del keystore y sus contraseñas fuera del repo.
> Si se pierde, toda actualización futura obliga a **desinstalar y reinstalar**
> en cada equipo, perdiendo los envíos no sincronizados.

> La carpeta `android/` está versionada en el repositorio.
> **No ejecutar `npx expo prebuild --clean`**: borra la configuración de firma
> y cualquier modificación manual del manifest.

### Antes de cada build

Incrementar en `app/app.json`:
```json
"version": "1.0.x",
"android": { "versionCode": x }
```

### Historial de versiones

| Versión | versionCode | Fecha | Descripción |
|---------|-------------|-------|-------------|
| 1.0.0 | 1 | — | Versión inicial |
| 1.0.1 | 2 | — | Corrección cleartext HTTP |
| 1.0.2 | 3 | — | Transportistas + historial + PDF sin rechazados |
| 1.0.3 | 4 | — | Correcciones historial + actualización transportistas |
| 1.0.4 | 5 | — | Mejoras escáner QR |
| 1.0.5 | 6 | 08/2026 | Build local con Gradle (se descontinúa EAS) |
| 1.3.0 | 7 | 10/2026 | Color de etiqueta en la compra (selector, PDF, ticket) |

> El build local de Gradle quedó con `versionName 1.2.1` / `versionCode 2`, que no
> coincide con esta tabla. En 1.3.0 se usa `versionCode 7` para superar cualquier
> APK instalado (2 o 6). Android rechaza actualizar si el versionCode no es mayor.

---

## Configuración de la App

### Variables de entorno (`app/.env`)

| Variable | Descripción | Valor producción |
|----------|-------------|------------------|
| `API_URL` | URL del servidor backend | `http://192.168.4.202:3000` |
| `SUPERADMIN_USUARIO` | Usuario del superadmin local | `admin` |
| `SUPERADMIN_PASSWORD` | Contraseña del superadmin | *(ver gestor de credenciales)* |
| `DIAS_VENCIMIENTO_SESION` | Días antes de requerir re-sync | `14` |
| `TEMPORADA_ACTUAL` | Año en 2 dígitos para validar QR | `26` |

> **Los valores se embeben en tiempo de compilación.**
> Si cambiás alguno, hay que recompilar el APK.

## Panel de Administración

El panel de administración está disponible en la ruta `/admin` del backend.

### Acceso
- URL: `http://192.168.4.202:3000/admin`
- Credenciales: usuario `admin` y contraseña `Admin2026!`
- Funcionalidades:
  - Gestión de usuarios (listado, alta, modificación, baja)
  - Gestión de transportistas (listado, alta, modificación, baja)
  - Gestión de colores de etiqueta (listado, alta, modificación, desactivación, baja)
  - Autenticación con sesiones server-side (15 minutos de expiración)
  - Validación de referencias antes de eliminación
  - Compatibilidad con la aplicación móvil existente

### Requisitos adicionales
- Instalar dependencia: `npm install express-session`
- Configurar variable de entorno: `SESSION_SECRET` (clave de sesión segura)

> **Verificar:** si el proyecto centraliza la configuración en `app/config.js`
> (solución aplicada cuando las variables no se embebían correctamente),
> ese archivo es la fuente de verdad y este `.env` puede estar obsoleto.

### Tráfico HTTP en claro

El backend interno usa HTTP sin TLS. Android bloquea cleartext en builds
de producción, por lo que `app.json` debe mantener:
```json
"android": { "usesCleartextTraffic": true }
```

---

## Flujo de uso

### Primera vez (sincronización inicial)

1. El dispositivo debe estar en la **red WiFi interna** de la empresa.
2. Ingresar con usuario `admin` y la contraseña configurada.
3. Presionar **"Sincronizar todo"**.
4. La app descarga usuarios, agricultores, transportistas y colores de etiqueta desde el servidor.
5. Cerrar sesión admin. Los compradores de campo ya pueden ingresar.

### Uso diario (compradores de campo)

1. Ingresar con usuario y contraseña de comprador.
2. Seleccionar el agricultor de la lista.
3. Seleccionar empresa transportista y chofer.
4. Completar datos opcionales (documento, observaciones).
5. Seleccionar el **color de etiqueta** (obligatorio: sin color no se habilita
   "Comenzar escaneo"). El color elegido se muestra en la pantalla del escáner.
6. Escanear los fardos con la cámara del celular.
7. Al terminar, presionar **"Cerrar envío"**.
8. El PDF se guarda automáticamente en `/Downloads/Montepaz/`.
9. Compartir el PDF por WhatsApp.
10. Al volver a la red WiFi de planta, sincronizar los envíos pendientes.

> Los colores de etiqueta se descargan junto con los agricultores en la
> **sincronización inicial** del superadmin ("Sincronizar todo"). El botón
> "Actualizar transportistas" no los actualiza. Si el catálogo local está
> vacío, la pantalla de transporte muestra el aviso para sincronizar.

### Migración de la base local (SQLite)

Al iniciar, la app ejecuta `inicializarBaseDeDatos()`: crea las tablas que
falten (`CREATE TABLE IF NOT EXISTS`) y aplica una lista de
`ALTER TABLE ... ADD COLUMN` idempotentes (si la columna ya existe, el error
se ignora). En 1.3.0 se agregan:

- Tabla `colores_etiqueta (id, nombre, hex, activo)`.
- Columnas `color_etiqueta_id`, `color_etiqueta_nombre`, `color_etiqueta_hex`
  en `envios`. Las compras anteriores quedan con esos campos en `NULL`, y sus PDFs
  se generan sin el bloque de color.

Actualizar el APK sobre una instalación existente no borra datos.

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

Si no se realiza una sincronización en **14 días**, la app bloquea el acceso
a los compradores y solicita que el superadmin realice una nueva sync.
El plazo se configura en `DIAS_VENCIMIENTO_SESION`.

---

## Trabajo en múltiples equipos

El proyecto se desarrolla desde más de una PC (equipo de la empresa y equipo
personal). GitHub es el único punto de sincronización.

```
[PC empresa]  ──push──►  [GitHub]  ◄──push──  [PC personal]
                            │
                          pull
                            ▼
                   [Servidor 192.168.4.202]
```

### Setup inicial en una PC nueva

```bash
cd C:\Users\<usuario>\github
git clone https://github.com/Juandeleon-utec/tabacalera-app.git
cd tabacalera-app\app
npm install
cd ..\backend
npm install
```

Guardar el Personal Access Token para no reingresarlo en cada push:
```bash
git config --global credential.helper manager
```

Normalizar finales de línea entre equipos Windows:
```bash
git config --global core.autocrlf true
```

> Sin `core.autocrlf`, aparecen diffs falsos donde archivos enteros
> figuran como modificados sin haberlos tocado.

### Ciclo de trabajo diario

**Al empezar la sesión, siempre:**
```bash
git pull origin main
```

**Al terminar la sesión, siempre:**
```bash
git add .
git commit -m "descripción del cambio"
git push origin main
```

> **Regla:** hacer push antes de dejar el equipo, aunque el trabajo esté
> incompleto. Si el commit queda a medias, marcarlo en el mensaje:
> `WIP: pantalla historial sin terminar`.
> Olvidar el push implica arrancar la próxima sesión desde código viejo
> y resolver conflictos después.

### Archivos que NO viajan por Git

| Archivo | Motivo | Cómo replicarlo |
|---------|--------|-----------------|
| `app/.env` | Ignorado (contiene credenciales) | Copiar a mano; mantener `.env.example` actualizado |
| `backend/.env` | Ignorado (credenciales MySQL y JWT) | Copiar a mano |
| `montepaz.keystore` | No debe versionarse | Backup externo; copiar a mano |
| `node_modules/` | Ignorado por diseño | `npm install` en cada equipo |

> Cada vez que se agrega una variable de entorno nueva, actualizar
> también `.env.example` y commitearlo. Es el único mecanismo que
> avisa al otro equipo que falta configurar algo.

### La carpeta `android/` SÍ debe versionarse

El `.gitignore` por defecto de Expo excluye `android/` e `ios/`. En este
proyecto la carpeta `android/` contiene la configuración de firma escrita
a mano en `build.gradle`, que se perdería en el otro equipo.

Verificar:
```bash
git check-ignore -v android/
```

Si devuelve alguna línea, eliminarla del `.gitignore` y commitear la carpeta.

### Reglas para no romper la sincronización

- **Nunca editar archivos directamente en el servidor por SSH.** El servidor
  es solo consumidor (`git pull`). Cualquier cambio local ahí hace fallar
  el próximo pull.
- **No usar rutas absolutas** en scripts ni configuración. Si aparece algo
  como `C:\Users\jdeleon\...` dentro del repo, convertirlo a ruta relativa.
- **No commitear el APK compilado.** Está en `android/app/build/`, que sí
  debe permanecer ignorado.

### Alta de un equipo adicional (tercera PC en adelante)

Cada equipo nuevo es un clone más. El repositorio no requiere ninguna
configuración especial por equipo, pero hay pasos manuales que Git no cubre.

**Checklist completo:**

```
[ ] 1. Instalar prerequisitos
       Node.js 22, Git, Android Studio + SDK 34, JDK 17
       Configurar ANDROID_HOME

[ ] 2. Clonar el repositorio
       git clone https://github.com/Juandeleon-utec/tabacalera-app.git

[ ] 3. Configurar Git en la máquina
       git config --global credential.helper manager
       git config --global core.autocrlf true
       git config --global user.name "Juan De Leon"
       git config --global user.email "<mismo email que en los otros equipos>"

[ ] 4. Instalar dependencias
       cd app && npm install
       cd ../backend && npm install

[ ] 5. Copiar archivos NO versionados desde un equipo existente
       app/.env
       backend/.env          (solo si se corre el backend localmente)
       montepaz.keystore     (solo si este equipo va a compilar APKs)

[ ] 6. Verificar que android/ llegó con el clone
       ls app/android/app/montepaz.keystore
       Si no está, el keystore hay que copiarlo a mano

[ ] 7. Probar el entorno de desarrollo
       cd app && npx expo start
       Escanear con Expo Go y verificar que la app carga

[ ] 8. Probar la compilación (solo si el equipo va a generar APKs)
       cd app/android && ./gradlew assembleRelease
       Verificar que el APK se firma sin errores
```

> **Sobre el keystore:** no todos los equipos necesitan compilar. Si esta PC
> es solo para desarrollo, omitir el keystore reduce la superficie de riesgo.
> Definir un único equipo como responsable de generar los APKs de producción.

> **Sobre `user.email`:** usar el mismo en todos los equipos mantiene el
> historial de commits atribuido a una sola identidad en GitHub.

### Sincronización con tres o más equipos

Con dos equipos, el riesgo de conflicto es bajo porque las sesiones no se
solapan. Con tres o más, conviene:

- **Verificar el estado antes de empezar**, para detectar trabajo sin pushear
  de una sesión anterior:
  ```bash
  git status
  git log --oneline -5
  ```
  Si `git status` muestra cambios locales sin commitear, resolver eso **antes**
  del `git pull`.

- **Ante un pull rechazado por divergencia**, no forzar. Rebasear:
  ```bash
  git pull --rebase origin main
  ```
  Si aparecen conflictos, resolverlos archivo por archivo y luego:
  ```bash
  git add <archivo>
  git rebase --continue
  ```

- **Nunca usar `git push --force` sobre `main`.** Reescribe el historial y
  deja a los otros equipos (y al servidor de producción) en un estado
  inconsistente que solo se arregla con un clone nuevo.

- **Si un equipo queda muy desactualizado** y el trabajo local no vale la
  pena conservarlo, es más rápido descartarlo que resolver el merge:
  ```bash
  git fetch origin
  git reset --hard origin/main
  ```
  > Esto **borra** todos los cambios locales sin recuperación. Confirmar
  > antes que no haya nada valioso sin pushear.

### Inventario de equipos

Mantener actualizada esta tabla al dar de alta o baja un equipo:

| Equipo | Ubicación | Rol | Compila APK | Tiene keystore |
|--------|-----------|-----|-------------|----------------|
| PC empresa | Tabacalera | Desarrollo + build | Sí | Sí |
| PC personal | Casa | Desarrollo | — | — |
| Servidor | 192.168.4.202 | Producción backend (solo pull) | No | No |

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
│   ├── android/                  # Proyecto nativo (versionado, no regenerar)
│   ├── assets/
│   │   └── logo.png              # Logo de la empresa
│   ├── screens/
│   │   ├── PantallaLogin.js      # Login para todos los usuarios
│   │   ├── PantallaAdmin.js      # Panel superadmin (sync)
│   │   ├── PantallaInicio.js     # Selector de agricultor
│   │   ├── PantallaEscaner.js    # Cámara + validación QR en tiempo real
│   │   ├── PantallaEnvio.js      # Resumen + cerrar + PDF
│   │   └── PantallaHistorial.js  # Historial de envíos por fecha
│   ├── components/
│   │   ├── ItemFardo.js          # Fila de la lista de fardos
│   │   └── MuestraColor.js       # Cuadrado de color de etiqueta
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
        │   ├── migrar-colores-etiqueta.js  # Migración idempotente app 1.3.0
        │   └── seed.js           # Datos de ejemplo
        ├── models/
        │   ├── index.js          # Sequelize + relaciones
        │   ├── Usuario.js
        │   ├── Agricultor.js
        │   ├── Transportista.js
        │   ├── ColorEtiqueta.js
        │   ├── Envio.js
        │   └── Fardo.js
        ├── routes/
        │   ├── sync.js           # GET /api/sync
        │   └── envios.js         # /api/envios/*
        ├── middleware/
        │   ├── auth.js           # JWT verificación y generación
        │   └── ipWhitelist.js    # Filtrado por IP de red interna
        └── admin/                # Panel de administración
            ├── login.html        # Página de login
            ├── index.html        # Panel principal
            ├── css/              # Estilos CSS
            └── js/               # JavaScript
```

> **Verificar:** confirmar que `PantallaHistorial.js` y `Transportista.js`
> coinciden con los nombres reales de archivo en el repo.

---

## Seguridad

- Las contraseñas de usuarios se almacenan con **bcrypt** (salt rounds = 10).
- El superadmin local tiene credenciales en `.env` (nunca commitear `.env`).
- El endpoint `/api/sync` solo responde a IPs de la red interna (`ALLOWED_IPS`).
- Los envíos al servidor requieren token JWT obtenido en la sync inicial.
- Si un usuario es desactivado en el servidor, queda bloqueado en la próxima sync.
- El keystore de firma **no debe versionarse**: agregar `*.keystore` al `.gitignore`.
- El panel de administración utiliza sesiones server-side con cookies seguras (httpOnly, SameSite=strict).
- La sesión de administración expira después de 15 minutos de inactividad.

---

## Identidad visual

Paleta Montepaz:

| Rol | Color |
|-----|-------|
| Primario | `#6B5333` |
| Acento | `#B08D45` |
| Fondo | `#F7F4ED` |

Logo: reemplazar `app/assets/logo.png`
- Formato: PNG
- Tamaño recomendado: **512×512 px** (mínimo 256×256)

## Panel de Administración

El panel de administración se encuentra disponible en `/admin` y permite:
- Gestión completa de usuarios, transportistas y colores de etiqueta
- Validación de referencias antes de eliminar registros
- Sesiones con expiración de 15 minutos de inactividad
- Acceso desde navegadores de escritorio o móvil

---
# Licencia

Software desarrollado por **Juan De León** para uso exclusivo de
Compañía Industrial de Tabacos Monte Paz S.A.

La propiedad intelectual del código, arquitectura y diseño del sistema
pertenece al autor. Montepaz posee licencia de uso exclusivo para sus
operaciones internas. Queda prohibida la redistribución, copia o 
reutilización del software sin autorización expresa del autor.

© 2026 Juan De León — Todos los derechos reservados.

# Panel de Administración

## Funcionalidades principales

- **Autenticación**: Inicio de sesión con credenciales admin
- **Gestión de usuarios**: Listado, alta, modificación y baja
- **Gestión de transportistas**: Listado, alta, modificación y baja
- **Gestión de colores de etiqueta**: Listado con muestra del color, alta, modificación,
  desactivación y baja. El formulario tiene un selector de color sincronizado con un
  campo de texto hex (`#RRGGBB`). Un color usado en envíos no se puede eliminar:
  el panel ofrece desactivarlo, y deja de aparecer en la app en la próxima sincronización.
- **Validación de referencias**: Impedir eliminación de registros con dependencias
- **Sesiones seguras**: Server-side con expiración de 15 minutos
- **Compatibilidad**: No afecta la funcionalidad de la aplicación móvil
- **Seguridad**: Uso del mismo esquema de hasheo de contraseñas que la app móvil

## Acceso al panel

1. Acceder a: `http://192.168.4.202:3000/admin`
2. Iniciar sesión con:
   - Usuario: `admin`
   - Contraseña: `Admin2026!`
3. Utilizar las funcionalidades desde el menú principal

## Requisitos técnicos

### Backend

```bash
# Instalar dependencia adicional
npm install express-session

# Configurar variable de entorno
SESSION_SECRET=una_clave_secreta_larga_y_aleatoria
```

### Despliegue

```bash
cd ~/node_app/tabacalera-app
git pull origin main
cd backend
npm install
pm2 restart tabacalera-backend
```

## Arquitectura del panel

### Backend
- Rutas API: `/api/admin/*` 
- Sesiones server-side con express-session
- Validación de referencias antes de eliminación
- Compatibilidad con la misma base de datos que la app móvil

### Frontend
- Archivos HTML/CSS/JS estáticos en `frontend/src/admin/*`
- Diseño responsive
- Manejo de errores y validaciones
- Autenticación basada en sesiones
