// Este módulo solo se carga en el cliente (importado dinámicamente)
import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { GenexStationStatic } from "~/utils/genexStationsStatic"
import type { BioPetrolStationStatic } from "~/utils/bioPetrolStationsStatic"
import type { EVStationBolivia } from "~/utils/evStationsBolivia"
import type { FuelPreference } from "~/context/configCtx"
import { haversineDistance, formatDistance } from "~/utils/distance"

// --- Marcadores tipo pin (gota invertida con letra) ---
function makePinIcon(color: string, letter = "") {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44"
               style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
      <path d="M16 2C8.8 2 3 7.8 3 15c0 10.5 13 27 13 27S29 25.5 29 15C29 7.8 23.2 2 16 2z"
            fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="16" cy="15" r="7" fill="white"/>
      <text x="16" y="19.5" text-anchor="middle" font-size="9" font-weight="800"
            fill="${color}" font-family="system-ui,sans-serif">${letter}</text>
    </svg>`,
    className: "",
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -46],
  })
}

function makeUserPin() {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48"
               style="filter:drop-shadow(0 3px 5px rgba(59,130,246,0.5))">
      <path d="M18 2C9.7 2 3 8.7 3 17c0 11.5 15 29 15 29S33 28.5 33 17C33 8.7 26.3 2 18 2z"
            fill="#3b82f6" stroke="white" stroke-width="2.5"/>
      <circle cx="18" cy="17" r="8" fill="white"/>
      <circle cx="18" cy="17" r="5" fill="#3b82f6"/>
    </svg>`,
    className: "",
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -50],
  })
}

const bioPin = makePinIcon("#16a34a", "B")
const genexPin = makePinIcon("#ea580c", "G")
const evPin = makePinIcon("#7c3aed", "EV")
const userPin = makeUserPin()

// --- OSRM routing (routing libre basado en OpenStreetMap) ---
async function fetchOSRMRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<{ coords: [number, number][]; distanceKm: string; durationMin: number }> {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const data = await res.json()
  if (data.code !== "Ok") throw new Error("Ruta no encontrada")
  const route = data.routes[0]
  return {
    coords: route.geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon] as [number, number]),
    distanceKm: (route.distance / 1000).toFixed(1),
    durationMin: Math.round(route.duration / 60),
  }
}

export interface MapViewProps {
  biopetrolStations: BioPetrolStationStatic[]
  genexStations: GenexStationStatic[]
  evStations: EVStationBolivia[]
  userLat: number | null
  userLon: number | null
  fuelType: FuelPreference
  onStationClick?: (id: string) => void
}

export default function MapView({
  biopetrolStations,
  genexStations,
  evStations,
  userLat,
  userLon,
  fuelType,
  onStationClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const stationLayerRef = useRef<L.LayerGroup | null>(null)
  const userLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)

  // Ref siempre actualizado con la ubicación más reciente (para los click handlers)
  const locationRef = useRef({ userLat, userLon })
  locationRef.current = { userLat, userLon }

  // Inicialización del mapa (una vez por montaje)
  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = L.map(container, { center: [-17.0, -65.0], zoom: 6, zoomControl: true })
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    stationLayerRef.current = L.layerGroup().addTo(map)
    userLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    // Limpiar ruta al hacer click en el mapa (fuera de marcador)
    map.on("click", () => {
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current)
        routeLayerRef.current = null
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
      stationLayerRef.current = null
      userLayerRef.current = null
      routeLayerRef.current = null
    }
  }, [])

  // Marcador de ubicación del usuario
  useEffect(() => {
    const map = mapRef.current
    const layer = userLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (userLat !== null && userLon !== null) {
      L.circle([userLat, userLon], {
        radius: 300,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        weight: 1,
      }).addTo(layer)
      L.marker([userLat, userLon], { icon: userPin })
        .bindPopup("<b style='font-size:13px'>📍 Tu ubicación</b>")
        .addTo(layer)
      map.setView([userLat, userLon], Math.max(map.getZoom(), 13))
    }
  }, [userLat, userLon])

  // Marcadores de estaciones
  useEffect(() => {
    const map = mapRef.current
    const layer = stationLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    // Limpia ruta al cambiar datos
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }

    // Helper: crea popup con info y dibuja ruta OSRM al hacer click
    function addStationMarker(
      stationId: string,
      lat: number,
      lon: number,
      icon: L.DivIcon,
      buildPopupHtml: (routeInfo?: string) => string
    ) {
      const marker = L.marker([lat, lon], { icon })
      marker.bindPopup(buildPopupHtml(), { maxWidth: 240 })
      marker.addTo(layer!)

      marker.on("click", async (e) => {
        L.DomEvent.stopPropagation(e)
        onStationClick?.(stationId)
        const { userLat: uLat, userLon: uLon } = locationRef.current

        if (!uLat || !uLon) {
          marker.getPopup()?.setContent(
            buildPopupHtml(`<a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank"
              style="display:block;margin-top:6px;background:#3b82f6;color:white;text-align:center;padding:5px 8px;border-radius:6px;text-decoration:none;font-size:12px">
              🗺️ Abrir en Google Maps</a>`)
          )
          marker.openPopup()
          return
        }

        // Muestra distancia en línea recta mientras carga la ruta
        const straightDist = formatDistance(haversineDistance(uLat, uLon, lat, lon))
        marker.getPopup()?.setContent(
          buildPopupHtml(`<p style="color:#6b7280;font-size:11px;margin-top:4px">⏳ Calculando ruta desde tu ubicación... (${straightDist})</p>`)
        )
        marker.openPopup()

        try {
          const { coords, distanceKm, durationMin } = await fetchOSRMRoute(uLat, uLon, lat, lon)

          // Dibuja la ruta en el mapa
          if (routeLayerRef.current) map!.removeLayer(routeLayerRef.current)
          const polyline = L.polyline(coords, {
            color: "#3b82f6",
            weight: 6,
            opacity: 0.85,
            lineJoin: "round",
            lineCap: "round",
          }).addTo(map!)
          routeLayerRef.current = polyline
          map!.fitBounds(polyline.getBounds(), { padding: [70, 70] })

          // Actualiza el popup con la info de la ruta
          const routeInfo = `<div style="margin-top:8px;padding:6px 8px;background:#eff6ff;border-radius:6px;border:1px solid #bfdbfe">
            <p style="color:#1d4ed8;font-weight:700;font-size:12px;margin:0">🗺️ Ruta más corta · ${distanceKm} km · ~${durationMin} min</p>
          </div>`
          marker.getPopup()?.setContent(buildPopupHtml(routeInfo))
          marker.openPopup()
        } catch {
          marker.getPopup()?.setContent(
            buildPopupHtml(`<a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank"
              style="display:block;margin-top:6px;background:#3b82f6;color:white;text-align:center;padding:5px 8px;border-radius:6px;text-decoration:none;font-size:12px">
              🗺️ Ver en Google Maps</a>`)
          )
          marker.openPopup()
        }
      })

      return marker
    }

    // --- BioPetrol (datos estáticos con coordenadas garantizadas) ---
    if (fuelType !== "ELECTRICO" && fuelType !== "GAS") {
      biopetrolStations.forEach((s, i) => {
        const dist = userLat && userLon
          ? formatDistance(haversineDistance(userLat, userLon, s.lat, s.lon))
          : null
        const fuelsHtml = s.fuels.map(f =>
          `<span style="font-size:10px;background:#f0fdf4;color:#166534;padding:1px 6px;border-radius:99px;border:1px solid #bbf7d0;display:inline-block;margin:1px">${f}</span>`
        ).join("")
        addStationMarker(`bp-${i}`, s.lat, s.lon, bioPin, (extra = "") => `
          <div style="min-width:210px;font-family:system-ui,sans-serif">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:14px;font-weight:700">${s.name}</span>
              ${dist ? `<span style="font-size:11px;color:#2563eb;font-weight:700">${dist}</span>` : ""}
            </div>
            <p style="font-size:11px;color:#6b7280;margin:2px 0">📍 ${s.address}, ${s.city}</p>
            <div style="margin:4px 0;display:flex;flex-wrap:wrap;gap:2px">${fuelsHtml}</div>
            ${s.openHours ? `<p style="font-size:10px;color:#6b7280;margin:2px 0">🕐 ${s.openHours}</p>` : ""}
            ${extra}
          </div>`)
      })
    }

    // --- Genex (datos estáticos con coordenadas garantizadas) ---
    if (fuelType !== "ELECTRICO") {
      genexStations.forEach((s, i) => {
        const dist = userLat && userLon
          ? formatDistance(haversineDistance(userLat, userLon, s.lat, s.lon))
          : null
        const fuelsHtml = s.fuels.map(f =>
          `<span style="font-size:10px;background:#fff7ed;color:#9a3412;padding:1px 6px;border-radius:99px;border:1px solid #fed7aa;display:inline-block;margin:1px">${f}</span>`
        ).join("")
        addStationMarker(`gx-${i}`, s.lat, s.lon, genexPin, (extra = "") => `
          <div style="min-width:210px;font-family:system-ui,sans-serif">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:14px;font-weight:700">${s.name}</span>
              ${dist ? `<span style="font-size:11px;color:#2563eb;font-weight:700">${dist}</span>` : ""}
            </div>
            <p style="font-size:11px;color:#6b7280;margin:2px 0">📍 ${s.address}, ${s.city}</p>
            <div style="margin:4px 0;display:flex;flex-wrap:wrap;gap:2px">${fuelsHtml}</div>
            ${s.openHours ? `<p style="font-size:10px;color:#6b7280;margin:2px 0">🕐 ${s.openHours}</p>` : ""}
            ${s.notes ? `<p style="font-size:10px;color:#374151;font-style:italic;margin:2px 0">${s.notes}</p>` : ""}
            ${extra}
          </div>`)
      })
    }

    // --- Cargadores EV ---
    if (fuelType === "ELECTRICO") {
      evStations.forEach((s, i) => {
        if (!s.lat || !s.lon) return
        const dist = userLat && userLon
          ? formatDistance(haversineDistance(userLat, userLon, s.lat, s.lon))
          : null
        const statusColor = s.status === "operacional" ? "#16a34a"
          : s.status === "en_construccion" ? "#d97706"
          : s.status === "fuera_servicio" ? "#dc2626" : "#6b7280"
        const statusLabel = s.status === "operacional" ? "Operacional"
          : s.status === "en_construccion" ? "En construcción"
          : s.status === "fuera_servicio" ? "Fuera de servicio" : "Desconocido"
        addStationMarker(`ev-${i}`, s.lat, s.lon, evPin, (extra = "") => `
          <div style="min-width:220px;font-family:system-ui,sans-serif">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:14px;font-weight:700">${s.name}</span>
              ${dist ? `<span style="font-size:11px;color:#2563eb;font-weight:700">${dist}</span>` : ""}
            </div>
            <p style="font-size:11px;color:#6b7280;margin:2px 0">${s.operator}</p>
            <p style="font-size:11px;color:#6b7280;margin:2px 0">📍 ${s.address}, ${s.city}</p>
            <span style="font-size:10px;color:${statusColor};font-weight:600">● ${statusLabel}</span>
            <div style="margin-top:4px">
              ${s.connectors.slice(0, 4).map((c) =>
                `<p style="font-size:11px;margin:1px 0">⚡ ${c.standard} ${c.type} · ${c.powerKW} kW · ×${c.quantity}</p>`
              ).join("")}
            </div>
            ${s.openHours ? `<p style="font-size:10px;color:#6b7280;margin:2px 0">🕐 ${s.openHours}</p>` : ""}
            ${extra}
          </div>`)
      })
    }
  }, [biopetrolStations, genexStations, evStations, fuelType, userLat, userLon])

  return (
    <div className="isolate" style={{ width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
