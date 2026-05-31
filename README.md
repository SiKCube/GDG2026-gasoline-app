# Proyecto: FuelHelper

## 📋 Descripción General

FuelHelper es una aplicación web moderna construida con **Remix** y **React** que ayuda a los usuarios a ubicar y comparar gasolineras, estaciones de carga eléctrica (EV), puntos de biocombustible y agencias de venta de combustible en Bolivia. Proporciona mapas interactivos, búsqueda por ubicación y filtrado de estaciones.

**Esta desplegado en Vercel:** https://gdg-2026-gasoline-app.vercel.app/

## 🏗️ Arquitectura

```
FuelHelper/
├── Frontend (Remix + React)
│   ├── Componentes de UI (shadcn/ui)
│   ├── Contexts (EV, BioPetrol, Genex, Location)
│   ├── Mapas interactivos
│   └── Enrutamiento dinámico
├── API Routes
│   ├── getBioPetrol
│   ├── getEvCharging
│   └── getGenex
└── Data
    ├── Estaciones estáticas
    ├── URLs de combustible
    └── Datos de agencias
```

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Remix** - Framework full-stack meta
- **React 18+** - Librería de UI
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **shadcn/ui** - Componentes de UI
- **Leaflet** - Mapas interactivos

### Gestión de Estado
- **React Context API** - Estados globales (EV, BioPetrol, Genex, Location)
- **Hooks personalizados** - useProgressiveGeocode

### Herramientas
- **Vite** - Bundler rápido
- **Git** - Control de versiones

## 📸 Imágenes Referenciales

> ![Ruta mas rapida](/public//screenshots//Screenshot%202026-05-31%20052557.png)
> ![Asistente](/public//screenshots//Screenshot%202026-05-31%20052623.png)
> ![Listado de EV](/public//screenshots/Screenshot%202026-05-31%20052702.png)
> ![Listado de combustible especial](/public//screenshots//Screenshot%202026-05-31%20052710.png)

> Video Demo: https://youtu.be/lz_aga2mGpA

## 🚀 Instrucciones de Ejecución

### Requisitos Previos
- Node.js v18+ instalado
- npm o yarn
- Git

### Instalación y Configuración

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/GDG2026-gasoline-app.git
   cd GDG2026-gasoline-app
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno (si aplica)**
   ```bash
   copy .env.example .env.local
   ```

4. **Iniciar el servidor de desarrollo**
   ```bash
   npm run dev
   ```

5. **Acceder a la aplicación**
   ```
   http://localhost:5173
   ```

6. **Build para producción**
   ```bash
   npm run build
   npm start
   ```

## 📝 Características Principales

- ✅ Localización de gasolineras por ubicación
- ✅ Estaciones de carga eléctrica (EV)
- ✅ Puntos de biocombustible
- ✅ Agencias de venta de combustible
- ✅ Mapas interactivos con Leaflet
- ✅ Búsqueda por distancia
- ✅ Interfaz responsive

## 📞 Soporte y Contribuciones

Para reportar bugs o sugerir mejoras, abre un issue en el repositorio.

---

**Última actualización:** Mayo 30, 2026


