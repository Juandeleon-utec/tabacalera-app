# AI System Analysis

## Project Structure

This project consists of two main parts:

1. `app/` - React Native mobile application
2. `backend/` - Node.js API

## Mobile App (app/)

### Technologies Used
- React Native with Expo
- React Navigation for routing
- Expo Secure Store for session management
- Expo SQLite for local data persistence
- bcryptjs for password hashing
- axios for API communication

### Key Components

#### Screens
- `PantallaTransporte.js` - Transport screen with fardo management
- `PantallaLogin.js` - Login screen with authentication
- `PantallaInicio.js` - Home screen with initial data loading
- `PantallaHistorial.js` - History screen with data presentation
- `PantallaEscaner.js` - QR scanner screen
- `PantallaEnvio.js` - Delivery screen with PDF generation
- `PantallaAdmin.js` - Admin screen with synchronization features

#### Services
- `autenticacion.js` - Authentication service handling login verification and session management
- `baseDeDatos.js` - Database service handling local SQLite operations

#### Constants
- `colores.js` - Color constants for UI theming

#### Utilities
- `uuid.js` - UUID generation utility

### Authentication Flow

1. User logs in through `PantallaLogin.js`
2. Authentication data is stored using `expo-secure-store`
3. Session expiration is managed through `vencimiento` property in `autenticacion.js`
4. Authentication is validated before accessing protected screens

### Database Workflow

1. Local SQLite database is initialized through `baseDeDatos.js`
2. Schema is defined using `expo-sqlite` with tables for fardos, usuarios, and historial
3. Data operations are performed through local database queries
4. Synchronization with backend occurs in admin screen

## Backend (backend/)

### Technologies Used
- Node.js + Express + MySQL with Sequelize ORM
- PM2 for process management
- Environment variables for configuration

### Key Components

#### API Endpoints
- RESTful API endpoints for user management and fardo operations
- JWT authentication for secure API access
- MySQL database integration with Sequelize ORM
- Synchronization endpoints:
  - GET `/api/sync` - Initial sync data (users, farmers, transporters)
  - POST `/api/envios/sync` - Receive and process fardo data from mobile app
  - GET `/api/envios` - List all shipments
  - GET `/api/envios/:id` - Get shipment details with fardos
  - POST `/api/envios` - Create new shipment
  - PUT `/api/envios/:id` - Update existing shipment
  - DELETE `/api/envios/:id` - Delete shipment

#### Configuration
- Environment variables for database connection and JWT settings
- Backend configuration files in `src/config/`
- Process management with PM2

#### Database Schema
- Models defined for: Usuario (User), Agricultor (Farmer), Transportista (Transporter), Envio (Shipment), and Fardo (Bale)
- Models have defined relationships:
  - Usuario has many Envios
  - Agricultor has many Envios
  - Transportista has many Envios
  - Envios has many Fardos (one-to-many relationship)
- Each model has an `id_local` field for synchronization to prevent duplicate entries
- Synchronization logic ensures atomicity via transactions when creating Envios and associated Fardos

#### Database Integration
- The backend uses MySQL with Sequelize ORM for persistent data storage
- Database connection configured via `src/config/database.js`
- Models are synchronized with the database on startup
- Synchronization endpoints (`/api/sync`, `/api/envios/sync`) for data transfer between local and remote systems
- IP whitelisting security for sensitive database operations

#### Scripts
- Development and production scripts for Node.js application
- PM2 configuration for process management
- Database migration script that safely updates existing tables
- Seed script that creates initial users and farmers for testing

### Communication
- Mobile app communicates with backend via HTTP using axios
- Authentication handled via JWT tokens
- Data synchronization between local database and backend

## Navigation

The app uses React Navigation for screen transitions and management. Navigation logic is implemented directly in `app/App.js` using a native stack navigator with the following screens:

- Login (PantallaLogin)
- Admin (PantallaAdmin) - accessible only to superadmin users
- Inicio (PantallaInicio) - main screen for selecting farmers
- Transporte (PantallaTransporte) - for entering transport details
- Escaner (PantallaEscaner) - QR code scanning for fardos
- Envio (PantallaEnvio) - delivery details and PDF generation
- Historial (PantallaHistorial) - delivery history

The initial route is determined based on the user's role:
- Superadmin users are directed to the Admin screen
- Regular users are directed to the Inicio screen

## Key Features

1. **Authentication**: Secure user login with session management
2. **Data Management**: Local database with synchronization to backend
3. **QR Scanning**: Fardo management through QR code scanning
4. **Reporting**: History tracking and delivery reports
5. **Administration**: Synchronization and data management features
6. **Synchronization**: Complete data synchronization mechanism between mobile app and backend server, with duplicate prevention using id_local field
