# 1. System Overview

The tabacalera-app is a mobile application for managing tobacco leaf purchases, specifically designed for field operations in a tabacalera (tobacco processing) environment. The system operates completely offline on mobile devices and synchronizes data with a backend server only when connected to an internal WiFi network.

Key features include:
- QR code scanning for fardos (tobacco bundles) 
- Offline-first architecture with local SQLite database
- Two-way synchronization between mobile and backend
- User authentication with role-based access control
- PDF generation for purchase documentation
- GPS location tracking for operations

# 2. Repository Structure

```
tabacalera-app/
├── app/                     # Mobile application (React Native)
│   ├── App.js               # Entry point and navigation
│   ├── app.json             # Expo configuration
│   ├── package.json
│   ├── assets/              # Images and logos
│   ├── screens/             # UI screens
│   │   ├── PantallaLogin.js
│   │   ├── PantallaAdmin.js
│   │   ├── PantallaInicio.js
│   │   ├── PantallaEscaner.js
│   │   ├── PantallaEnvio.js
│   │   └── PantallaHistorial.js
│   ├── components/          # UI components
│   │   └── ItemFardo.js
│   ├── services/            # Business logic services
│   │   ├── baseDeDatos.js   # SQLite operations
│   │   ├── autenticacion.js # Session and login
│   │   ├── api.js           # Backend API calls
│   │   ├── validadorQR.js   # QR code validation
│   │   ├── generadorPDF.js  # PDF generation
│   │   └── sincronizacion.js # Sync management
│   ├── utils/               # Utility functions
│   │   └── uuid.js          # UUID generation
│   └── src/config/          # Configuration
│       └── config.js        # App configuration
└── backend/                 # Backend API (Node.js/Express)
    ├── package.json
    ├── src/
    │   ├── app.js               # Entry point
    │   ├── db/
    │   │   ├── migrate.js       # Database migrations
    │   │   └── seed.js          # Sample data
    │   ├── models/              # Sequelize models
    │   │   ├── index.js
    │   │   ├── Usuario.js
    │   │   ├── Agricultor.js
    │   │   ├── Transportista.js
    │   │   ├── Envio.js
    │   │   └── Fardo.js
    │   ├── routes/              # API routes
    │   │   ├── sync.js
    │   │   └── envios.js
    │   └── middleware/          # Security middleware
    │       ├── auth.js
    │       └── ipWhitelist.js
```

# 3. Architecture

Mobile UI → Services → SQLite → Synchronization → HTTP API → Express → Sequelize → MySQL

The system is structured as a mobile-first application that works completely offline, synchronizing with a backend server only when connected to the internal network.

# 4. Technology Stack

**Mobile (App):**
- React Native with Expo
- Expo SQLite for local database
- React Navigation for routing
- Expo Camera for QR scanning
- Expo Print for PDF generation
- Expo Secure Store for session management
- Axios for HTTP requests

**Backend (Server):**
- Node.js with Express.js
- MySQL with Sequelize ORM
- JWT for authentication
- bcrypt for password hashing
- CORS for API access control

# 5. Mobile Application

The mobile application follows a multi-screen workflow:
1. Login (PantallaLogin)
2. Admin panel (PantallaAdmin) - for initial sync
3. Agricultor selection (PantallaInicio)
4. Transportista details (PantallaTransporte)
5. QR scanning (PantallaEscaner)
6. Envío summary (PantallaEnvio)
7. History (PantallaHistorial)

Navigation is managed through React Navigation with a native stack navigator.

# 6. Navigation and Screens

| Screen | Source file | Purpose | Data used | Services called | Navigates to |
|--------|-------------|---------|-----------|------------------|--------------|
| Login | PantallaLogin.js | User authentication | Usuario credentials | autenticacion.js, api.js | Admin or Inicio |
| Admin | PantallaAdmin.js | Initial synchronization | None | sincronizacion.js | None |
| Inicio | PantallaInicio.js | Select agricultor | Agricultores list | baseDeDatos.js | Transporte |
| Transporte | PantallaTransporte.js | Enter transport details | Transportistas | baseDeDatos.js | Escaner |
| Escaner | PantallaEscaner.js | QR scanning | Fardos collection | validadorQR.js | Envio |
| Envio | PantallaEnvio.js | Review and close envío | Fardos and envío data | baseDeDatos.js, generadorPDF.js | None |
| Historial | PantallaHistorial.js | View envío history | Envío history | baseDeDatos.js | None |

# 7. SQLite Database

Database filename: tabacalera.db

Tables:
1. usuarios
2. agricultores
3. transportistas
4. envios
5. fardos
6. sincronizacion

## Table: usuarios

| Field | SQLite type | PK | FK | UNIQUE | NOT NULL | Default |
|-------|-------------|----|----|--------|----------|---------|
| id | INTEGER | ✓ |  |  | ✓ |  |
| nombre | TEXT |  |  |  | ✓ |  |
| usuario | TEXT |  |  | ✓ | ✓ |  |
| password_hash | TEXT |  |  |  | ✓ |  |
| activo | INTEGER |  |  |  |  | 1 |
| rol | TEXT |  |  |  |  | "comprador" |

## Table: agricultores

| Field | SQLite type | PK | FK | UNIQUE | NOT NULL | Default |
|-------|-------------|----|----|--------|----------|---------|
| id | INTEGER | ✓ |  |  | ✓ |  |
| codigo_6dig | TEXT |  |  | ✓ | ✓ |  |
| nombre | TEXT |  |  |  | ✓ |  |
| direccion | TEXT |  |  |  |  |  |
| telefono | TEXT |  |  |  |  |  |
| departamento | TEXT |  |  |  |  |  |
| activo | INTEGER |  |  |  |  | 1 |

## Table: transportistas

| Field | SQLite type | PK | FK | UNIQUE | NOT NULL | Default |
|-------|-------------|----|----|--------|----------|---------|
| id | INTEGER | ✓ |  |  | ✓ |  |
| empresa | TEXT |  |  |  | ✓ |  |
| nombre_chofer | TEXT |  |  |  | ✓ |  |
| documento | TEXT |  |  |  |  |  |
| matricula | TEXT |  |  |  | ✓ |  |
| activo | INTEGER |  |  |  |  | 1 |

## Table: envios

| Field | SQLite type | PK | FK | UNIQUE | NOT NULL | Default |
|-------|-------------|----|----|--------|----------|---------|
| id | INTEGER | ✓ |  |  | ✓ |  |
| id_local | TEXT |  |  | ✓ | ✓ |  |
| usuario_id | INTEGER |  | ✓ (usuarios.id) |  | ✓ |  |
| agricultor_id | INTEGER |  | ✓ (agricultores.id) |  | ✓ |  |
| agricultor_codigo | TEXT |  |  |  | ✓ |  |
| agricultor_nombre | TEXT |  |  |  | ✓ |  |
| transportista_id | INTEGER |  | ✓ (transportistas.id) |  |  |  |
| documento_chofer_real | TEXT |  |  |  |  |  |
| observaciones | TEXT |  |  |  |  |  |
| fecha | TEXT |  |  |  | ✓ |  |
| hora | TEXT |  |  |  | ✓ |  |
| gps_lat | REAL |  |  |  |  |  |
| gps_lng | REAL |  |  |  |  |  |
| estado | TEXT |  |  |  |  | "abierto" |
| sincronizado | INTEGER |  |  |  |  | 0 |
| sincronizado_at | TEXT |  |  |  |  |  |
| created_at | TEXT |  |  |  | ✓ |  |

## Table: fardos

| Field | SQLite type | PK | FK | UNIQUE | NOT NULL | Default |
|-------|-------------|----|----|--------|----------|---------|
| id | INTEGER | ✓ |  |  | ✓ |  |
| envio_id | INTEGER |  | ✓ (envios.id) |  | ✓ |  |
| codigo_qr | TEXT |  |  |  | ✓ |  |
| valido | INTEGER |  |  |  |  | 1 |
| motivo_invalido | TEXT |  |  |  |  |  |
| timestamp_escaneo | TEXT |  |  |  | ✓ |  |

## Table: sincronizacion

| Field | SQLite type | PK | FK | UNIQUE | NOT NULL | Default |
|-------|-------------|----|----|--------|----------|---------|
| id | INTEGER | ✓ |  |  | ✓ | 1 |
| ultima_sync | TEXT |  |  |  |  |  |
| token_sync | TEXT |  |  |  |  |  |
| usuario_sync_id | INTEGER |  |  |  |  |  |

# 8. SQLite Data Access Functions

### READ functions:
- buscarUsuarioPorNombre
- listarTransportistas
- obtenerTransportistaPorId
- guardarTransportistas
- guardarAgricultores
- listarAgricultores
- buscarAgricultores
- obtenerEnvioPorId
- listarEnviosNosincronizados
- listarFardosPorEnvio
- codigoQrYaUsado
- obtenerInfoSync
- listarEnviosResumenPorUsuarioYFecha
- listarTodosEnviosResumenPorUsuario

### CREATE functions:
- crearEnvio
- insertarFardo
- guardarUsuarios

### UPDATE functions:
- cerrarEnvio
- marcarEnvioSincronizado

### DELETE functions:
- None explicitly defined

### UPSERT functions:
- guardarUsuarios
- guardarAgricultores
- guardarTransportistas
- reemplazarTransportistas

# 9. Sequelize / MySQL Model

## Model: Usuario

| Field | Sequelize type | PK | FK | allowNull | unique | defaultValue |
|-------|----------------|----|----|-----------|--------|--------------|
| id | INTEGER | ✓ |  | false |  |  |
| nombre | STRING(100) |  |  | false |  |  |
| usuario | STRING(50) |  |  | false | true |  |
| password_hash | STRING(255) |  |  | false |  |  |
| activo | BOOLEAN |  |  | true |  | true |
| rol | ENUM('comprador', 'admin') |  |  | true |  | "comprador" |

## Model: Agricultor

| Field | Sequelize type | PK | FK | allowNull | unique | defaultValue |
|-------|----------------|----|----|-----------|--------|--------------|
| id | INTEGER | ✓ |  | false |  |  |
| codigo_6dig | STRING(6) |  |  | false | true |  |
| nombre | STRING(150) |  |  | false |  |  |
| direccion | STRING(255) |  |  | true |  |  |
| telefono | STRING(30) |  |  | true |  |  |
| departamento | STRING(100) |  |  | true |  |  |
| activo | BOOLEAN |  |  | true |  | true |

## Model: Transportista

| Field | Sequelize type | PK | FK | allowNull | unique | defaultValue |
|-------|----------------|----|----|-----------|--------|--------------|
| id | INTEGER | ✓ |  | false |  |  |
| empresa | STRING(100) |  |  | false |  |  |
| nombre_chofer | STRING(100) |  |  | false |  |  |
| documento | STRING(20) |  |  | true |  |  |
| matricula | STRING(20) |  |  | false |  |  |
| activo | BOOLEAN |  |  | true |  | true |

## Model: Envio

| Field | Sequelize type | PK | FK | allowNull | unique | defaultValue |
|-------|----------------|----|----|-----------|--------|--------------|
| id | INTEGER | ✓ |  | false |  |  |
| id_local | STRING(36) |  |  | true | true |  |
| usuario_id | INTEGER |  |  | false |  |  |
| agricultor_id | INTEGER |  |  | false |  |  |
| fecha | DATEONLY |  |  | false |  |  |
| hora | TIME |  |  | false |  |  |
| gps_lat | DECIMAL(10,8) |  |  | true |  |  |
| gps_lng | DECIMAL(11,8) |  |  | true |  |  |
| total_fardos | INTEGER |  |  | true |  | 0 |
| transportista_id | INTEGER |  |  | true |  |  |
| documento_chofer_real | STRING(20) |  |  | true |  |  |
| observaciones | STRING(50) |  |  | true |  |  |
| sincronizado_at | DATE |  |  | true |  |  |

## Model: Fardo

| Field | Sequelize type | PK | FK | allowNull | unique | defaultValue |
|-------|----------------|----|----|-----------|--------|--------------|
| id | INTEGER | ✓ |  | false |  |  |
| envio_id | INTEGER |  |  | false |  |  |
| codigo_qr | STRING(13) |  |  | false |  |  |
| valido | BOOLEAN |  |  | true |  | true |
| motivo_invalido | STRING(255) |  |  | true |  |  |
| timestamp_escaneo | DATE |  |  | false |  |  |

## Associations

- Usuario.hasMany(Envio) - foreignKey: usuario_id
- Envio.belongsTo(Usuario) - foreignKey: usuario_id
- Agricultor.hasMany(Envio) - foreignKey: agricultor_id  
- Envio.belongsTo(Agricultor) - foreignKey: agricultor_id
- Transportista.hasMany(Envio) - foreignKey: transportista_id
- Envio.belongsTo(Transportista) - foreignKey: transportista_id
- Envio.hasMany(Fardo) - foreignKey: envio_id
- Fardo.belongsTo(Envio) - foreignKey: envio_id

# 10. Backend API

| Method | Full path | Source file | Handler | Middleware | JWT | IP restriction | Role check | Purpose |
|--------|-----------|-------------|---------|------------|-----|----------------|------------|---------|
| GET | /api/health | app.js | health check | - | No | No | No | Server status |
| GET | /api/sync | sync.js | download data | ipWhitelist | No | Yes | No | Initial sync |
| POST | /api/envios/sync | envios.js | upload envios | auth | Yes | No | Yes | Envio sync |
| GET | /api/envios | envios.js | list envios | auth | Yes | No | Yes | Envio listing |
| GET | /api/envios/:id | envios.js | envio detail | auth | Yes | No | Yes | Envio detail |

# 11. Authentication and Authorization

**Authentication**:
- Login with username/password
- Superadmin login with hardcoded credentials
- Session management stored in SecureStore
- Password hashing with bcrypt
- JWT token generation/verification for sync operations

**Authorization**:
- User roles: comprador (default), admin, superadmin
- Superadmin has access to admin features and sync
- Session validation with automatic expiration after 14 days
- JWT required for envio sync
- IP restriction on /api/sync endpoint (only internal network)
- Session expiration based on last sync date

# 12. Backend → Mobile Synchronization

Trigger: App start, user navigation to Inicio screen, manual sync

- Mobile checks connectivity to server
- Mobile calls /api/sync endpoint (GET)
- Backend returns usuarios, agricultores, transportistas 
- Mobile saves data to local SQLite
- Mobile stores sync token for envio sync

## Entities synchronized:
- Usuarios
- Agricultores  
- Transportistas

# 13. Mobile → Backend Synchronization

Trigger: Envío closure, automatic sync when connected to WiFi

- Mobile gets all unsynchronized envios from SQLite
- Mobile collects fardos for each envio
- Mobile calls /api/envios/sync (POST) with envio data and fardos
- Backend validates:
  - No duplicate id_local
  - Creates new envio in backend
  - Creates fardos in backend
  - Updates local sync status

# 14. id_local and Duplicate Prevention

- Generated with uuid.js function
- Stored in envios table
- Used to prevent duplicate sync
- Validated in backend during sync
- Prevents double counting in backend

# 15. Envio Lifecycle

1. Created with id_local
2. Open - Fardos can be added
3. Closed - No more fardos can be added
4. Pending synchronization
5. Synchronized with backend
6. Sync status updated in local database

# 16. Fardo / QR Workflow

1. QR scanned via camera
2. QR code validation (format, code, season)
3. Duplicate check against existing fardos in same envío
4. Duplicate check against fardos in other envíos for same agricultor
5. Valid fardos stored in SQLite
6. Invalid fardos stored with reason

# 17. End-to-End Business Flow

Login → Admin sync (if needed) → Select Agricultor → Transportista details → QR scanning → Envío closure → PDF generation → Sync to backend

# 18. Configuration

| Variable | Source file | Component | Purpose | Sensitive |
|----------|-------------|-----------|---------|-----------|
| API_URL | config.js | Mobile | Backend server URL | No |
| SUPERADMIN_USUARIO | config.js | Mobile | Superadmin username | No |
| SUPERADMIN_PASSWORD | config.js | Mobile | Superadmin password | Yes |
| DIAS_VENCIMIENTO_SESION | config.js | Mobile | Session expiration | No |
| TEMPORADA_ACTUAL | config.js | Mobile | QR validation year | No |

# 19. Error Handling

- SQLite errors handled through try/catch
- API errors handled with try/catch and console logging
- Missing network handled with connectivity checks
- HTTP 4xx/5xx handled with error messages
- JWT failures handled with auth errors
- Transaction rollbacks on sync failures
- Duplicate id_local handling in backend
- Synchronization failure handling

# 20. Tests

NO AUTOMATED TESTS FOUND

# 21. Execution and Deployment

**Mobile (App):**
- npm install
- npx expo start (dev)
- npx expo build:android (production)

**Backend:**
- npm install
- npm run db:migrate (create tables)
- npm run db:seed (sample data)
- npm start (production)
- npm run dev (development)

# 22. Dependency Map

**Authentication flow:**
PantallaLogin → autenticacion.js → baseDeDatos.js → api.js → auth.js

**Initial sync:**
PantallaAdmin → sincronizacion.js → baseDeDatos.js → api.js → sync.js

**Envio sync:**
Envio screen → sincronizacion.js → baseDeDatos.js → api.js → envios.js

**QR workflow:**
Escaner screen → validadorQR.js → baseDeDatos.js

**PDF generation:**
Envio screen → generadorPDF.js → baseDeDatos.js

# 23. High-Risk Components

| File / Function | Risk | Why sensitive | Depends on it |
|-----------------|------|---------------|----------------|
| baseDeDatos.js | HIGH | Critical for all app operations | SQLite |
| api.js | HIGH | Critical for all backend interaction | axios |
| autenticacion.js | HIGH | Critical for security | SecureStore |
| validadorQR.js | HIGH | Critical for data integrity | baseDeDatos.js |
| sincronizacion.js | HIGH | Critical for data consistency | api.js |
| envios.js (sync) | HIGH | Critical for data integrity | Sequelize |
| PantallaEnvio.js | HIGH | Critical for PDF generation | generadorPDF.js |

# 24. Read-Only Extension Points

Functions that only read data and do not affect synchronization:
- listarAgricultores
- buscarAgricultores  
- listarTransportistas
- listarEnviosResumenPorUsuarioYFecha
- listarTodosEnviosResumenPorUsuario
- listarFardosPorEnvio
- obtenerEnvioPorId

# 25. Not Determined

- No information about role-based access control beyond user roles
- No information about testing framework or test coverage
- No information about performance monitoring or error logging
- No information about backup or recovery procedures
- No information about data validation rules beyond basic field constraints
- No information about admin panel implementation (this has been added)

# 26. Evidence Files

1. README.md
2. app/App.js
3. app/services/baseDeDatos.js
4. app/services/autenticacion.js
5. app/services/api.js
6. app/services/validadorQR.js
7. app/services/sincronizacion.js
8. backend/src/app.js
9. backend/src/models/*.js
10. backend/src/routes/*.js
11. backend/src/middleware/auth.js
12. backend/src/middleware/ipWhitelist.js
13. app/screens/*.js
14. app/src/config/config.js
15. backend/src/routes/admin/*.js
16. frontend/src/admin/*

# 27. Summary for Future Development

This system is designed for offline field operations with a clear separation between mobile UI and backend services. The architecture ensures data integrity through local SQLite storage and synchronization protocols that prevent duplicate entries. Future development should focus on:

1. Adding automated testing
2. Improving error handling and recovery
3. Adding backup/recovery procedures
4. Implementing performance monitoring
5. Extending reporting capabilities
6. Adding additional user roles or permissions if needed
7. Enhancing admin panel with additional features (user activity tracking, reports, etc.)