# Semillero Digital — Classroom Companion (Local)

Aplicación web complementaria (solo entorno local) que se integra con Google Classroom para:

- Seguimiento del progreso del estudiante.
- Notificaciones claras (anuncios recientes y entregas próximas/pendientes).
- Visualización de cursos activos.

No reemplaza Classroom; agrega una capa de visualización y gestión.

## Stack

- Next.js 15 (App Router) + TypeScript
- NextAuth (Google OAuth)
- Tailwind CSS 4

## Requisitos previos

- Node.js 18+ y npm
- Proyecto en Google Cloud con la API de Google Classroom habilitada
- Credenciales OAuth 2.0 (tipo Web) con estos ajustes para entorno local:
  - Authorized JavaScript origins: `http://localhost:3000`
  - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

### Scopes utilizados (mínimos para el demo local)

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/classroom.courses.readonly`
- `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
- `https://www.googleapis.com/auth/classroom.rosters.readonly`
- `https://www.googleapis.com/auth/classroom.announcements.readonly`

> Nota: Estos scopes permiten leer cursos, tareas y anuncios, además del roster, para el usuario autenticado. Para vistas por alumno (docente/coordinador) con progreso de terceros, se requiere scope adicional (no incluido en este demo local).

## Configuración local

1. Crear archivo `.env.local` en la raíz del proyecto:

```env
GOOGLE_CLIENT_ID=TU_CLIENT_ID
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=UN_SECRETO_LARGO_ALEATORIO
```

2. Instalar dependencias:

```bash
npm install
```

3. Ejecutar en local:

```bash
npm run dev
```

Abrir `http://localhost:3000` y pulsar “Ingresar con Google”.

## Funcionalidades implementadas (local)

- Autenticación con Google OAuth (NextAuth) por email (mismo usado en Classroom).
- Conexión directa a Google Classroom API (sin exports manuales ni Apps Script).
- UI limpia y sencilla:
  - Header con título del proyecto y botón claro de “Ingresar/Cerrar sesión”.
  - Listado de cursos activos del usuario (`CoursesList`).
  - Dashboard de progreso del estudiante por curso (`ProgressDashboard`).
  - Panel de notificaciones con anuncios recientes y entregas próximas/pendientes (`NotificationsPanel`).

## Endpoints API (rutas Next.js App Router)

- `GET /api/classroom/courses`
  - Lista cursos activos (`courseStates=ACTIVE`).
- `GET /api/classroom/coursework?courseId=`
  - Lista tareas/actividades de un curso.
- `GET /api/classroom/submissions?courseId=&courseWorkId=`
  - Lista envíos del alumno autenticado para una tarea.
- `GET /api/classroom/announcements?courseId=`
  - Lista anuncios recientes del curso.

## Archivos clave

- `src/lib/auth.ts`: configuración de NextAuth con Google y scopes de Classroom.
- `src/app/api/auth/[...nextauth]/route.ts`: handler de autenticación.
- `src/app/api/classroom/*/route.ts`: endpoints de integración con Classroom.
- `src/components/AuthButton.tsx`: login/logout con estilos visibles.
- `src/components/CoursesList.tsx`: cursos activos.
- `src/components/ProgressDashboard.tsx`: métricas básicas por curso.
- `src/components/NotificationsPanel.tsx`: anuncios y recordatorios.
- `src/app/page.tsx`: composición de la UI del demo local.

## Flujo de uso (local)

1. Configura `.env.local` con tus credenciales.
2. Inicia el servidor con `npm run dev` y abre `http://localhost:3000`.
3. Ingresa con Google y acepta permisos.
4. Visualiza tus cursos, progreso y notificaciones.

## Solución de problemas

- **404 al volver de Google**:
  - Asegúrate de que `NEXTAUTH_URL` y las URIs autorizadas en Google coincidan con el puerto real (`http://localhost:3000`).
- **access_denied (403) por Testing**:
  - Añade tu email como "Test user" en la pantalla de consentimiento de Google.
- **Tokens/consentimiento previos**:
  - Prueba en ventana privada o revoca acceso en `https://myaccount.google.com/permissions` y vuelve a intentar.

## Notas

- Este proyecto está preparado solo para ejecución local según los lineamientos del desafío.
- Para vistas de profesor/coordinador con progreso por alumno (no incluidas), se requeriría añadir scopes de lectura de coursework de estudiantes y actualizar el consentimiento.
