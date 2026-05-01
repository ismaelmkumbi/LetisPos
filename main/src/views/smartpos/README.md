# SmartPOS Frontend Integration

This folder and its siblings (`src/api/smartpos`, `src/context/smartpos`,
`src/routes/smartpos`) contain the **new** SmartPOS-specific wiring added on top
of the Modernize MUI template. The template's own `views/authentication/*`
files are left untouched; they remain available as visual references.

## Install the one new dependency

```bash
cd main
npm install axios
```

## Set the API URL

```bash
cp .env.example .env.local
# VITE_API_BASE_URL=http://localhost:8080
```

## Wrap the app in `SmartPosAuthProvider`

Open `src/App.tsx` (or wherever the router is mounted) and wrap the router
with the provider:

```tsx
import { SmartPosAuthProvider } from 'src/context/smartpos/AuthContext';

function App() {
  return (
    <SmartPosAuthProvider>
      {/* existing app tree / <RouterProvider router={...} /> */}
    </SmartPosAuthProvider>
  );
}
```

## Swap the login page into the router

In `src/routes/Router.tsx`, change the login route to use the new page:

```tsx
// before:
// import Login from 'src/views/authentication/auth1/Login';
import LoginPage from 'src/views/smartpos/auth/LoginPage';

// ...
{ path: '/auth/login', element: <LoginPage /> },
```

## Protect private routes

```tsx
import { RequireAuth } from 'src/routes/smartpos/RequireAuth';

{
  element: <RequireAuth><FullLayout /></RequireAuth>,
  children: [
    { path: '/',          element: <ModernDashboard /> },
    { path: '/dashboard', element: <ModernDashboard /> },
  ],
}
```

## Default credentials (dev)

The Auth Service seeds an admin on first startup (`BOOTSTRAP_ADMIN_EMAIL` /
`BOOTSTRAP_ADMIN_PASSWORD`, default `admin@smartpos.local` / `Admin@12345`).
Look at the Auth Service log on first boot for the user id — you will need it
for the User Service's `smartpos.user.bootstrap.admin-user-id` property so the
matching profile (with the ADMIN role) is created.
