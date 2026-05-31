import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router"

import type { Route } from "./+types/root"
import "./app.css"
import AppLayout from "./components/layout/app-layout"
import AdProvider from "./context/adProvider"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Fuel Bolivia</title>
        <Meta />
        <Links />
        <script src="https://cdn.adkit.dev/v1.js" defer></script>
      </head>
      <body>
        <AdProvider>
          {children}
        </AdProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground">Cargando Fuel Bolivia...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "¡Error!"
  let details = "Ocurrió un error inesperado."
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details =
      error.status === 404
        ? "La página no existe."
        : error.statusText || details
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1 className="text-2xl font-bold mb-2">{message}</h1>
      <p className="text-muted-foreground">{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto mt-4 bg-muted rounded text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
