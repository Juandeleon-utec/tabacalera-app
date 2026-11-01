# Tabacalera App — Sistema de compra de fardos de tabaco

Sistema para registrar la compra de fardos de tabaco en campo, compuesto por:

- **`app/`** — Aplicación móvil Android (React Native + Expo SDK 51)
- **`backend/`** — API REST interna (Node.js + Express + Sequelize + MySQL)
- **`frontend/src/admin/`** — Panel web de administración (HTML/CSS/JS estático, servido por el backend en `/admin`)

> **Etapa de prueba (zafra 2027).** Este repositorio es privado y por ahora
> contiene credenciales en claro (config de la app, firma, `.env.example`,
> panel). Se quitarán al terminar la zafra 2027; ver *Seguridad*.

---

## Arquitectura general

```
[App Android]  ←→  [Red WiFi interna]  ←→  [Servidor backend 192.168.4.202:3000]
      ↕                                            ↕
  SQLite local                               MySQL / Sequelize
                                                   ↕
                                       [Panel admin /admin (navegador)]
```

La app funciona **100% offline**. Solo necesita WiFi interno para:
1. Sincronización inicial (usuarios, agricultores, transportistas, colores de etiqueta
   y registro de la terminal con su código).
2. Envío de los envíos cerrados al servidor (automático desde la pantalla de inicio; ver *Flujo de uso*).

El comprobante de cada compra es el **remito**, con dos salidas:
- **PDF** generado en el dispositivo (se guarda y se puede compartir por WhatsApp).
- **Ticket térmico** de 58 mm en terminales con impresora integrada (p. ej. Q2i),
  vía el módulo nativo `ImpresionTermica`. En equipos sin impresora el botón no aparece.

### Remito: numeración única

Cada envío cerrado recibe un número con el formato:

```
TER001RMT2700001
│  │  │  │ │
│  │  │  │ └── 5 dígitos: correlativo de la terminal en la zafra (00001–99999)
│  │  │  └──── 2 dígitos: zafra (TEMPORADA_ACTUAL de config.js)
│  │  └─────── literal RMT
│  └────────── 3 dígitos: código de la terminal (asignado por el servidor)
└───────────── literal TER
```

- El código de terminal lo asigna el servidor en la sincronización, a partir
  del `id_instalacion` que la app genera en su primera ejecución. **No depende
  del usuario**: varios usuarios pueden usar la misma terminal.
- El número se asigna **al cerrar el envío**, offline. Terminal + zafra +
  correlativo lo hacen único entre todas las terminales.
- Al cambiar `TEMPORADA_ACTUAL` (p. ej. a `28`) el correlativo vuelve a `00001`.
- Reinstalar la app o borrar sus datos genera una instalación nueva y por lo
  tanto **un código de terminal nuevo**. No hay riesgo de repetir números.
- Garantías de unicidad: índice único local (SQLite) e índice único en MySQL
  (`envios.nro_remito`). Si el servidor recibe un remito ya existente con otro
  `id_local`, no lo guarda, responde `remito_duplicado` y lo registra en el log.

### Tiempos de carga

- **Inicio de carga**: hora del primer fardo escaneado del envío.
- **Fin de carga**: momento en que se cierra el envío.

Se guardan en ISO 8601 (UTC) y se muestran en hora local, con la duración,
en el PDF, el ticket, la pantalla de cierre y el historial.

---

## Instalación del Backend

### Requisitos

- Node.js >= 18 (en producción: 22 LTS)
- MySQL >= 8.0 (en producción: 8.4)
- npm >= 9

### Pasos

```bash
cd backend

npm install

cp .env.example .env
nano .env   # Revisar todas las variables de la tabla de abajo

# Crear la base de datos en MySQL (el nombre debe coincidir con DB_NAME)
mysql -u root -p -e "CREATE DATABASE tabacalera CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Crear las tablas
npm run db:migrate

# Cargar datos de prueba (opcional; usuarios de ejemplo con contraseña campo123
# y los colores de etiqueta iniciales)
npm run db:seed

# Desarrollo
npm run dev

# Producción
npm start
```

> **Nota MySQL 8.4:** el plugin `mysql_native_password` fue removido.
> Si se crea un usuario dedicado, debe usar `caching_sha2_password` (default).

> Al iniciar, el servidor ejecuta `sequelize.sync({ alter: false })`: crea las
> tablas que falten pero **no** agrega columnas a tablas existentes. Para eso
> están los scripts de migración puntuales (ver más abajo).

### Variables de entorno (`backend/.env`)

| Variable | Descripción | Valor actual |
|----------|-------------|--------------|
| `DB_HOST` | Host MySQL | `192.168.4.202` |
| `DB_PORT` | Puerto MySQL | `3306` |
| `DB_USER` | Usuario MySQL | `root` |
| `DB_PASS` | Contraseña MySQL | `MontepazRivera` |
| `DB_NAME` | Nombre de la BD | `tabacalera` |
| `JWT_SECRET` | Secreto JWT | `MontepazJWT2027Tabacalera` |
| `JWT_EXPIRES_IN` | Duración del token de sync | `14d` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | `production` / `development` (en development loguea SQL) | `production` |
| `ALLOWED_IPS` | IPs o rangos /24 permitidos para `/api/sync` | `127.0.0.1,192.168.4.0/24,192.168.5.0/24,192.168.0.0/24` |
| `ADMIN_USER` | Usuario del panel web (default `admin`) | `admin` |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt de la contraseña del panel. **Obligatorio**: sin él el login responde 500 | hash de `Admin2026!` |
| `SESSION_SECRET` | Secreto de las sesiones del panel. Si falta se usa un default del código | — |

Generar el hash de la contraseña del panel:
```bash
node -e "console.log(require('bcryptjs').hashSync('Admin2026!', 10))"
```

### Endpoints API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Estado del servidor (la app lo usa para detectar la red interna) |
| `GET` | `/api/sync?id_instalacion=…` | Solo red interna | Descarga usuarios, agricultores, transportistas y colores de etiqueta activos; registra la terminal y devuelve `terminal: { codigo, activo }` y el token de sync |
| `POST` | `/api/envios/sync` | JWT de sync | Sube envíos cerrados con sus fardos |
| `GET` | `/api/envios` | JWT | Lista envíos (paginado) |
| `GET` | `/api/envios/:id` | JWT | Detalle de un envío con fardos |
| `POST` | `/api/admin/login` · `/api/admin/logout` | — / Sesión | Login y logout del panel |
| `GET` `POST` | `/api/admin/users` | Sesión admin | Lista / crea usuarios |
| `GET` `PUT` `DELETE` | `/api/admin/users/:id` | Sesión admin | Detalle / modifica / elimina usuario |
| `GET` `POST` | `/api/admin/transporters` | Sesión admin | Lista / crea transportistas |
| `GET` `PUT` `DELETE` | `/api/admin/transporters/:id` | Sesión admin | Detalle / modifica / elimina transportista |
| `GET` `POST` | `/api/admin/colores-etiqueta` | Sesión admin | Lista / crea colores (`nombre`, `hex`, `activo`) |
| `PUT` `DELETE` | `/api/admin/colores-etiqueta/:id` | Sesión admin | Modifica / elimina (409 si tiene envíos) |
| `PATCH` | `/api/admin/colores-etiqueta/:id/desactivar` | Sesión admin | Desactiva un color |
| `GET` | `/api/admin/terminales` | Sesión admin | Lista terminales con alta, última sync y resumen de remitos |
| `PUT` | `/api/admin/terminales/:id` | Sesión admin | Modifica `alias` y `activo` |

No hay endpoints públicos de transportistas: la app los recibe en `/api/sync`.

Campos opcionales por envío en `POST /api/envios/sync` (los APK anteriores no
los envían y el envío se guarda con `NULL`):
- 1.3.0: `color_etiqueta_id`, `color_etiqueta_nombre`, `color_etiqueta_hex`.
- 1.4.0: `nro_remito`, `terminal_codigo`, `hora_inicio_carga`, `hora_fin_carga`.

Estados por envío en la respuesta: `creado`, `duplicado` (mismo `id_local`,
la app lo marca como sincronizado) y `remito_duplicado` (no se guarda; la app
lo reintenta en la próxima sync).

### Actualización del backend en producción

```bash
ssh administrador@192.168.4.202
cd ~/node_app/tabacalera-app
git pull origin main
cd backend
npm install
# Si la versión trae migración, correrla ACÁ, antes del restart (ver abajo)
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

### Migraciones puntuales

Scripts **idempotentes** (se pueden correr más de una vez) que no usan
`sync({ alter })`. Se corren **una vez, antes de reiniciar PM2**: el código
nuevo usa las columnas nuevas y los INSERT fallarían si no existen.

Backup previo recomendado:
```bash
mysqldump -u root -p tabacalera envios > ~/backup_envios_$(date +%F).sql
```

#### 1.3.0 — Colores de etiqueta

```bash
npm run db:migrate:colores
npm run db:seed        # carga los colores iniciales (findOrCreate, no duplica)
```

Crea la tabla `colores_etiqueta`, agrega `color_etiqueta_id/_nombre/_hex` en
`envios` y la FK `envios.color_etiqueta_id → colores_etiqueta.id`
(`ON DELETE SET NULL`).

> Los colores iniciales están en `backend/src/db/seed.js` (array `coloresEtiqueta`).
> Confirmar nombres y hex con planta antes de correr el seed en producción;
> después se administran desde el panel.

#### 1.4.0 — Remito por terminal y tiempos de carga

```bash
npm run db:migrate:remito
```

Salida esperada:
```
Tabla terminales: OK
Columna envios.nro_remito: creada
Columna envios.terminal_codigo: creada
Columna envios.hora_inicio_carga: creada
Columna envios.hora_fin_carga: creada
Índice envios_nro_remito_unique: creado
Migración remito/terminal completada.
```

> **Orden obligatorio para 1.4.0:** migración → restart del backend → instalar
> el APK 1.4.0 → sincronizar cada terminal. Una app 1.4.0 que sincroniza contra
> un backend viejo no recibe código de terminal y **no puede cerrar envíos**.

### Esquema: tablas agregadas

**`colores_etiqueta`** (1.3.0)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | INT PK AI | |
| `nombre` | VARCHAR(50) NOT NULL UNIQUE | ej. "Rojo" |
| `hex` | CHAR(7) NOT NULL | `#RRGGBB` en mayúsculas. Se acepta `RRGGBB` y se normaliza |
| `activo` | BOOLEAN DEFAULT true | Solo los activos se descargan a la app |
| `created_at` / `updated_at` | DATETIME | |

**`terminales`** (1.4.0)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | INT PK AI | El código se deriva de este id |
| `id_instalacion` | VARCHAR(64) NOT NULL UNIQUE | Generado por la app en su primera ejecución |
| `codigo` | CHAR(3) UNIQUE | `001`–`999` |
| `alias` | VARCHAR(50) | Editable desde el panel |
| `activo` | BOOLEAN DEFAULT true | Inactiva: pierde el código en su próxima sync y no puede cerrar envíos |
| `ultima_sync_at` | DATETIME | |
| `created_at` / `updated_at` | DATETIME | `created_at` = fecha de alta |

**Columnas agregadas en `envios`** (todas nullable, para no afectar compras anteriores)

| Campo | Tipo | Versión | Notas |
|-------|------|---------|-------|
| `color_etiqueta_id` | INT FK | 1.3.0 | |
| `color_etiqueta_nombre` | VARCHAR(50) | 1.3.0 | Snapshot al momento de la compra |
| `color_etiqueta_hex` | CHAR(7) | 1.3.0 | Snapshot al momento de la compra |
| `nro_remito` | VARCHAR(20) UNIQUE | 1.4.0 | `TER001RMT2700001` |
| `terminal_codigo` | CHAR(3) | 1.4.0 | |
| `hora_inicio_carga` | DATETIME | 1.4.0 | Primer fardo escaneado |
| `hora_fin_carga` | DATETIME | 1.4.0 | Cierre del envío |

Nombre y hex del color se copian en el envío: si después se edita un color en
el panel, los históricos y PDFs ya emitidos no cambian.

---

## Panel de Administración

- URL: `http://192.168.4.202:3000/admin`
- Credenciales: usuario `admin`, contraseña `Admin2026!`
  (definidas por `ADMIN_USER` y `ADMIN_PASSWORD_HASH` en `backend/.env`).
- Sesión server-side (`express-session`, ya incluida en `package.json`),
  cookie httpOnly, expira tras **15 minutos de inactividad**.

Secciones:
- **Usuarios**: listado, alta, modificación y baja.
- **Transportistas**: listado, alta, modificación y baja.
- **Colores de etiqueta**: listado con muestra del color, alta, modificación,
  desactivación y baja. Selector de color sincronizado con un campo hex.
  Un color usado en envíos no se puede eliminar: el panel ofrece desactivarlo,
  y deja de aparecer en la app en la próxima sincronización.
- **Terminales**: código, alias, fecha de alta, última sincronización, cantidad
  de remitos y último remito. Se editan alias y estado.
  - **No hay alta manual**: las terminales se registran solas en su primera sync.
  - **No hay borrado**, a propósito: el código forma parte del N° de remito y no
    debe reutilizarse. En MySQL, borrar la última fila puede hacer que el
    autoincrement reasigne ese id tras un reinicio.

Los archivos del panel están en `frontend/src/admin/` y el backend los sirve
como estáticos.

---

## Instalación de la App (desarrollo)

### Requisitos

- Node.js >= 18
- npm >= 9
- Android Studio con SDK Platform 34+
- JDK 17 (verificar que `JAVA_HOME` y el `java` del `PATH` apunten al mismo JDK)
- `ANDROID_HOME` configurada
- `app/android/local.properties` con la ruta del SDK (Gradle no siempre toma `ANDROID_HOME`):
  ```
  sdk.dir=C\:\\Users\\<usuario>\\AppData\\Local\\Android\\Sdk
  ```

> No se usa EAS Build ni se requiere cuenta de Expo. La compilación es local.

### Pasos

```bash
cd app
npm install

# Equipo Android conectado por adb (depuración USB)
npx expo run:android
```

> **Expo Go no sirve para probar todo:** la app usa un módulo nativo propio
> (`ImpresionTermica`). En Expo Go la app arranca pero sin impresión térmica.
> Para probar el ticket hay que usar un build nativo (`expo run:android` o el APK).

---

## Configuración de la App

Toda la configuración está centralizada en **`app/src/config/config.js`** y
se embebe al compilar: cualquier cambio requiere recompilar el APK.
No se usan archivos `.env` en la app.

| Clave | Descripción | Valor actual |
|-------|-------------|--------------|
| `API_URL` | URL del backend | `http://192.168.4.202:3000` |
| `SUPERADMIN_USUARIO` | Usuario del superadmin local (no está en la BD) | `admin` |
| `SUPERADMIN_PASSWORD` | Contraseña del superadmin local | `Admin2026!` |
| `DIAS_VENCIMIENTO_SESION` | Días máximos sin login / sin sync para compradores | `90` |
| `TEMPORADA_ACTUAL` | Zafra en 2 dígitos: valida los QR y numera los remitos | `27` |
| `IMPRESORA.PUERTOS` | Puertos serie que prueba el módulo de impresión, en orden | `/dev/ttyS1` … `/dev/ttyS5` |
| `IMPRESORA.ANCHO_LINEA` | Caracteres por línea del ticket | `32` |

### Tráfico HTTP en claro

El backend interno usa HTTP sin TLS. `app.json` mantiene
`"usesCleartextTraffic": true` y el plugin `withNetworkSecurityConfig`.

---

## Compilación de la APK

```bash
cd app/android
./gradlew :app:assembleRelease      # PowerShell: .\gradlew :app:assembleRelease  (cmd: gradlew ...)
```

> Usar la tarea con alcance `:app:assembleRelease`, no `assembleRelease` a secas.

El APK queda en:
```
app/android/app/build/outputs/apk/release/app-release.apk
```

Tiempo: 5–15 min la primera vez, 2–5 min las siguientes.

> La carpeta `android/` está versionada. **No ejecutar `npx expo prebuild --clean`**:
> borra la configuración de firma y las modificaciones del manifest.
> El módulo de impresión vive en `app/modules/android/` y el plugin
> `withImpresionTermica` lo copia a `android/` en un prebuild; si se edita,
> mantener **las dos copias iguales**.

### Antes de cada build

Incrementar la versión en **los dos** archivos (no se regeneran entre sí porque
`android/` está versionada):

- `app/app.json` → `"version"` y `"android.versionCode"`
- `app/android/app/build.gradle` → `versionName` y `versionCode`

Android rechaza actualizar si el `versionCode` nuevo no es mayor que el instalado.
El pie del PDF toma la versión de `app.json`.

### Firma (keystore)

Keystore `app/android/app/montepaz.keystore`, alias `montepaz`. La firma está
configurada directamente en `app/android/app/build.gradle` (`signingConfigs.release`),
con las contraseñas escritas en el archivo durante la etapa de prueba.

> **Crítico:** mantener un backup del keystore fuera del repo. Si se pierde,
> toda actualización obliga a **desinstalar y reinstalar** en cada equipo,
> perdiendo los envíos no sincronizados. Un APK firmado con otra clave
> (p. ej. uno viejo de EAS) da `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.

### Instalar en los dispositivos

```bash
adb install -r app/android/app/build/outputs/apk/release/app-release.apk
```

El flag `-r` reinstala **conservando** los datos locales (SQLite, envíos
pendientes y el código de terminal). Desinstalar borra todo eso y la
terminal recibirá un código nuevo en su próxima sync.

También se puede copiar el APK al equipo o descargarlo desde un servidor
interno y abrirlo (requiere habilitar "Instalar apps desconocidas").

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
| 1.4.0 | 8 | 11/2026 | N° de remito único por terminal, inicio/fin de carga, ABM de terminales, sync automática en Inicio cada minuto + aviso de pendientes |

> Hubo builds locales intermedios con `versionName 1.2.1` / `versionCode 2`.
> Desde 1.3.0, `app.json` y `build.gradle` están alineados.

---

## Flujo de uso

### Primera vez (sincronización inicial)

1. El dispositivo debe estar en la **red WiFi interna** de la empresa.
2. Ingresar con el superadmin local (`admin` / contraseña de `config.js`).
3. Presionar **"Sincronizar ahora"**.
4. La app descarga usuarios, agricultores, transportistas y colores de etiqueta,
   y la terminal queda registrada con su código (visible en el panel → *Terminales*).
5. Cerrar sesión admin. Los compradores de campo ya pueden ingresar.

### Uso diario (compradores de campo)

1. Ingresar con usuario y contraseña de comprador.
2. Seleccionar el agricultor de la lista (pantalla de inicio).
3. Seleccionar empresa transportista y chofer.
4. Completar datos opcionales (documento, observaciones).
5. Seleccionar el **color de etiqueta** (obligatorio: sin color no se habilita
   "Comenzar escaneo"). El color elegido se muestra en la pantalla del escáner.
6. Escanear los fardos con la cámara. El primer fardo marca el **inicio de carga**.
7. Presionar **"Cerrar envío"** y confirmar. Se asigna el **N° de remito** y se
   registra el **fin de carga**.
8. **"Guardar PDF"**: lo guarda en `Downloads/Montepaz/` (o en el almacenamiento
   interno de la app si Android no permite la carpeta pública) y ofrece enviarlo por WhatsApp.
9. **"Imprimir comprobante"** (solo en terminales con impresora térmica).
10. Presionar **"Nuevo envío"** para volver a la pantalla de inicio.

> ### ⚠️ Al terminar las cargas: dejar la app en la pantalla de inicio
> Los envíos **solo se sincronizan desde la pantalla de inicio** (la lista de
> agricultores). Al llegar a planta, con el WiFi interno, dejar la app abierta
> en esa pantalla: sincroniza al entrar y reintenta **cada minuto** mientras
> esté visible. Si la app queda en el escáner, en el cierre de un envío o en
> el historial, **no sincroniza**.
>
> La pantalla de inicio muestra un aviso con la cantidad de envíos pendientes;
> cuando desaparece, todo quedó en el servidor. También se puede verificar en
> **Historial** (✓ Sincronizado / ⏳ Pendiente).

> Si al cerrar aparece **"Terminal sin código"**, la terminal nunca sincronizó con
> un backend 1.4.0 o fue dada de baja en el panel. Conectarla a la red interna y
> sincronizar.

> Los colores de etiqueta se descargan en la **sincronización inicial** del
> superadmin. El botón "Actualizar transportistas" (disponible para cualquier
> usuario) actualiza transportistas y el código/estado de la terminal, pero no
> los colores ni los usuarios.

### Historial

Desde la pantalla de inicio se accede al historial de envíos (por fecha o todos),
con N° de remito, tiempos de carga, estado de sincronización y opción de reenviar el PDF.

### Migración de la base local (SQLite)

Al iniciar, la app ejecuta `inicializarBaseDeDatos()`: crea las tablas que
falten (`CREATE TABLE IF NOT EXISTS`) y aplica `ALTER TABLE ... ADD COLUMN`
idempotentes (si la columna ya existe, el error se ignora).

- 1.3.0: tabla `colores_etiqueta`; columnas de color en `envios`.
- 1.4.0: tabla `terminal` (`id_instalacion`, `codigo`); columnas `nro_remito`,
  `terminal_codigo`, `hora_inicio_carga`, `hora_fin_carga` en `envios`;
  índice único sobre `nro_remito`.

Las compras anteriores quedan con esos campos en `NULL` y sus PDFs/tickets
se generan sin los bloques nuevos. Actualizar el APK con `-r` no borra datos.

### Formato del código QR del fardo

```
AAAAAABBBBBBB
│     │
│     └── 7 dígitos: BB = zafra (ej: 27), BBBBB = secuencial
└──────── 6 dígitos: código del agricultor
```

Ejemplo: `1000012701234`
- `100001` = código agricultor
- `27` = zafra 2027
- `01234` = número secuencial del fardo

### Vencimiento de sesión

Si un comprador pasa más de **90 días** sin iniciar sesión o sin que la terminal
sincronice, la app le bloquea el acceso y pide sincronizar. El superadmin no vence.
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
| `backend/.env` | Ignorado (credenciales MySQL, JWT, sesión y panel) | Copiar a mano; mantener `backend/.env.example` actualizado |
| `node_modules/` | Ignorado por diseño | `npm install` en cada equipo |
| `app/android/local.properties` | Ruta local del SDK | Crear a mano en cada equipo (ver *Compilación*) |

> La configuración de la app (`app/src/config/config.js`) y el keystore
> `montepaz.keystore` **sí** están versionados durante la etapa de prueba
> (ver *Seguridad*).

> Cada vez que se agrega una variable de entorno nueva al backend, actualizar
> también `backend/.env.example` y commitearlo. Es el único mecanismo que
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
       backend/.env          (solo si se corre el backend localmente)
       app/android/local.properties  (sdk.dir de este equipo)

[ ] 6. Verificar que android/ y el keystore llegaron con el clone
       ls app/android/app/montepaz.keystore

[ ] 7. Probar el entorno de desarrollo
       cd app && npx expo run:android   (con un equipo conectado por adb)

[ ] 8. Probar la compilación (solo si el equipo va a generar APKs)
       cd app/android && ./gradlew :app:assembleRelease
       Verificar que el APK se firma sin errores
```

> **Sobre el keystore:** mientras esté versionado, cualquier clone puede firmar
> APKs de producción. Igualmente conviene definir un único equipo como
> responsable de generarlos, para no mezclar versionCodes.

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
├── README.md
├── AGENTS.md                         # Política para asistentes de código
├── app/
│   ├── App.js                        # Entry point y navegación
│   ├── app.json                      # Configuración Expo (versión, plugins)
│   ├── package.json
│   ├── android/                      # Proyecto nativo (versionado, no regenerar)
│   ├── assets/                       # logo.png, logo-app.png, logo-pdf.png, logo.svg
│   ├── constants/colores.js          # Paleta de la app
│   ├── modules/android/              # Módulo nativo ImpresionTermica (fuente)
│   ├── plugins/
│   │   ├── withImpresionTermica.js   # Copia y registra el módulo de impresión
│   │   └── withNetworkSecurityConfig.js
│   ├── src/config/config.js          # Configuración central (fuente de verdad)
│   ├── screens/
│   │   ├── PantallaLogin.js          # Login + diagnóstico de red
│   │   ├── PantallaAdmin.js          # Superadmin: sincronización inicial
│   │   ├── PantallaInicio.js         # Selector de agricultor + sync automática
│   │   ├── PantallaTransporte.js     # Transportista, chofer, color de etiqueta
│   │   ├── PantallaEscaner.js        # Cámara + validación QR en tiempo real
│   │   ├── PantallaEnvio.js          # Resumen, cierre (remito), PDF, ticket
│   │   └── PantallaHistorial.js      # Historial de envíos
│   ├── components/
│   │   ├── ItemFardo.js
│   │   └── MuestraColor.js
│   ├── services/
│   │   ├── baseDeDatos.js            # SQLite: tablas, migraciones, remito
│   │   ├── autenticacion.js          # Login, sesión, vencimiento
│   │   ├── api.js                    # Llamadas axios al backend
│   │   ├── sincronizacion.js         # Sync inicial + sync automática
│   │   ├── validadorQR.js            # Validación del código QR
│   │   ├── generadorPDF.js           # PDF del remito
│   │   └── impresora.js              # Ticket térmico (puente al módulo nativo)
│   └── utils/
│       ├── uuid.js                   # IDs locales
│       └── tiemposCarga.js           # Hora local y duración de carga
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── app.js                    # Entry point Express (+ sesiones, /admin)
│       ├── db/
│       │   ├── migrate.js            # sync({ alter: true }) — solo instalación nueva
│       │   ├── migrar-colores-etiqueta.js   # 1.3.0
│       │   ├── migrar-remito-terminal.js    # 1.4.0
│       │   └── seed.js
│       ├── models/
│       │   ├── index.js              # Sequelize + relaciones
│       │   ├── Usuario.js · Agricultor.js · Transportista.js
│       │   ├── ColorEtiqueta.js · Envio.js · Fardo.js · Terminal.js
│       ├── routes/
│       │   ├── sync.js               # GET /api/sync (+ registro de terminal)
│       │   ├── envios.js             # /api/envios/*
│       │   ├── admin.js              # Monta /api/admin/*
│       │   └── admin/                # auth, users, transporters, colores-etiqueta, terminales
│       └── middleware/
│           ├── auth.js               # JWT
│           ├── adminAuth.js          # Sesión del panel
│           └── ipWhitelist.js        # Filtrado por IP de red interna
└── frontend/
    └── src/admin/                    # Panel web: index.html, login.html, css/, js/
```

---

## Seguridad

Estado actual (etapa de prueba, repositorio privado):

- Contraseñas de usuarios con **bcrypt** (10 rounds), igual en app, backend y panel.
- `/api/sync` solo responde a IPs de `ALLOWED_IPS`.
- Los envíos al servidor requieren el token JWT obtenido en la sync inicial.
- Un usuario desactivado en el servidor queda bloqueado en la próxima sync.
- Una terminal desactivada en el panel no puede emitir remitos desde su próxima sync.
- Panel con sesiones server-side, cookie httpOnly, expiración de 15 minutos.

**Credenciales en el repositorio (a quitar al terminar la zafra 2027):**

| Dónde | Qué |
|-------|-----|
| `app/src/config/config.js` | Contraseña del superadmin local |
| `app/android/app/build.gradle` | Contraseñas del keystore |
| `app/android/app/montepaz.keystore` | Clave de firma de producción |
| `backend/.env.example` | Credenciales MySQL y `JWT_SECRET` reales |
| Este README | Todo lo anterior y la contraseña del panel |

Al cerrar la zafra: rotar todas (MySQL, JWT, panel, superadmin; el keystore
**no** se puede rotar sin reinstalar), mover las de la app a variables de
entorno de build, dejar valores de ejemplo en `.env.example`, agregar
`*.keystore` al `.gitignore` y limpiar el historial de Git o crear un repo nuevo
(el historial conserva todo lo commiteado).

---

## Identidad visual

Paleta Montepaz (`app/constants/colores.js`):

| Rol | Color |
|-----|-------|
| Primario | `#6B5333` |
| Secundario | `#8A7B65` |
| Acento | `#B08D45` |
| Fondo | `#F7F4ED` |

Logos en `app/assets/` (`logo.png`, `logo-app.png`, `logo-pdf.png`, `logo.svg`).
Recomendado PNG cuadrado de 512×512 px (mínimo 256×256).

---

# Licencia

Software desarrollado por **Juan De León** para uso exclusivo de
Compañía Industrial de Tabacos Monte Paz S.A.

La propiedad intelectual del código, arquitectura y diseño del sistema
pertenece al autor. Montepaz posee licencia de uso exclusivo para sus
operaciones internas. Queda prohibida la redistribución, copia o 
reutilización del software sin autorización expresa del autor.

© 2026 Juan De León — Todos los derechos reservados.
