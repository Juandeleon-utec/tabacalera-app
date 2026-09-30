# Admin Panel Implementation Details

## Overview
An admin panel has been implemented for managing users and transporters in the tabacalera system. The panel is served by the same backend Express server and is accessible via `/admin` URL path.

## Implementation Details

### Backend Implementation
- **Authentication**: Session-based authentication with express-session middleware
- **Security**: HttpOnly, SameSite=strict cookies with 15-minute inactivity timeout
- **Credentials**: Uses existing SUPERADMIN_USUARIO and SUPERADMIN_PASSWORD from config.js
- **Routes**: 
  - `/api/admin/login` - Login endpoint
  - `/api/admin/logout` - Logout endpoint  
  - `/api/admin/users` - User management (GET, POST, PUT, DELETE)
  - `/api/admin/transporters` - Transporter management (GET, POST, PUT, DELETE)
- **Session Management**: 15-minute sliding window expiration with session regeneration

### Frontend Implementation
- **Static Files**: HTML, CSS, and JavaScript files served from `/admin` path
- **UI Components**: 
  - Login page with form validation
  - Dashboard with navigation menu
  - User management table with CRUD operations
  - Transporter management table with CRUD operations
- **Responsive Design**: Works on desktop and mobile browsers
- **Error Handling**: Clear error messages for validation and system errors

### Security Features
- Session-based authentication (separate from mobile JWT authentication)
- Reference validation before deleting users/transporters (prevents orphaned records)
- CSRF protection in forms
- Password validation with bcryptjs (same as mobile app)
- Session expiration on inactivity

### Database Integration
- **Users**: Uses existing `usuarios` table with same schema as mobile app
- **Transporters**: Uses existing `transportistas` table with same schema as mobile app
- **Referencing**: Checks `envios` table for existing references before deletion
- **Data Integrity**: Maintains same validation rules as mobile app

### Compatibility
- Does not modify existing mobile app functionality
- Uses same password hashing mechanism (bcryptjs)
- Compatible with PM2 deployment model
- Does not affect mobile sync or authentication flows

## Files Created
### Backend
- `backend/src/middleware/adminAuth.js` - Admin authentication middleware
- `backend/src/routes/admin/auth.js` - Admin login/logout routes
- `backend/src/routes/admin/users.js` - User management routes  
- `backend/src/routes/admin/transporters.js` - Transporter management routes
- `backend/src/routes/admin.js` - Main admin routes file

### Frontend
- `frontend/src/admin/login.html` - Login page
- `frontend/src/admin/index.html` - Main dashboard
- `frontend/src/admin/css/admin.css` - Styles
- `frontend/src/admin/js/admin.js` - JavaScript logic

## Features Implemented
1. ✅ Admin login with existing credentials
2. ✅ User management (list, add, edit, delete)
3. ✅ Transporter management (list, add, edit, delete)  
4. ✅ Reference validation before deletion
5. ✅ Session management with 15-minute timeout
6. ✅ Responsive web interface
7. ✅ Error handling and validation
8. ✅ Compatible with existing mobile app

## Deployment
1. Install express-session dependency
2. Set SESSION_SECRET environment variable
3. Deploy with standard PM2 workflow (git pull, npm install, pm2 restart)
4. Access via http://[server]:[port]/admin