import { useMemo, useState, useEffect } from "react"
import { ClientOnly } from "~/components/ClientOnly"
import { LazyMapLoader } from "~/components/map/LazyMapLoader"
import BioPetrolCard from "~/components/bio-petrol/biopetrol-card"
import GenexCard from "~/components/genex/genex-card"
import EVCard from "~/components/ev/ev-card"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Badge } from "~/components/ui/badge"
import { useBioPetrolData } from "~/context/biopetrolCtx"
import { useConfig, type FuelPreference } from "~/context/configCtx"
import { useGenexData } from "~/context/genexCtx"
import { useUserLocation } from "~/context/locationCtx"
import { useProgressiveGeocode } from "~/hooks/useProgressiveGeocode"
import { haversineDistance } from "~/utils/distance"
import { evStationsBolivia } from "~/utils/evStationsBolivia"
import { genexStationsStatic } from "~/utils/genexStationsStatic"
import { bioPetrolStationsStatic } from "~/utils/bioPetrolStationsStatic"
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "~/components/ui/dialog"
import { Button } from "~/components/ui/button"
import { MenuIcon } from "lucide-react"
import FakeAd from "~/components/fake-ads"

const FUEL_TABS: { value: FuelPreference; label: string }[] = [
  { value: "ESPECIAL", label: "Especial" },
  { value: "PREMIUM", label: "Premium" },
  { value: "DIESEL", label: "Diesel" },
  { value: "GAS", label: "🔵 Gas" },
  { value: "ELECTRICO", label: "⚡ EV" },
]

// Tipos de combustible que BioPetrol soporta
const BIOPETROL_FUELS: FuelPreference[] = ["ESPECIAL", "PREMIUM", "DIESEL"]

type StationEntry =
  | { source: "biopetrol"; id: string; distance?: number; lat?: number; lon?: number; data: any }
  | { source: "genex"; id: string; distance?: number; lat?: number; lon?: number; data: any }
  | { source: "ev"; id: string; distance?: number; lat?: number; lon?: number; data: any }

export default function Home() {
  const { bioPetrolStationsData } = useBioPetrolData()
  const { genexStationsData } = useGenexData()
  const userLocation = useUserLocation()
  const { config, setConfig } = useConfig()
  const [open, setOpen] = useState<boolean>(false)

  const geoInputs = useMemo(
    () => [
      ...bioPetrolStationsData.map((s, i) => ({ id: `bp-${i}`, address: s.address })),
      ...genexStationsData.map((s, i) => ({ id: `gx-${i}`, address: s.address })),
    ],
    [bioPetrolStationsData, genexStationsData]
  )

  const geocodedCoords = useProgressiveGeocode(geoInputs)

  const bpWithCoords = useMemo(
    () => bioPetrolStationsData.map((s, i) => ({ ...s, ...geocodedCoords[`bp-${i}`] })),
    [bioPetrolStationsData, geocodedCoords]
  )

  // Filtrar Genex: solo mostrar estaciones que tienen el combustible seleccionado disponible
  const gxWithCoords = useMemo(() => {
    return genexStationsData
      .map((s, i) => ({ ...s, ...geocodedCoords[`gx-${i}`] }))
      .filter((s) => {
        if (config.fuelPreference === "ELECTRICO") return false
        return s.products.some((p) => {
          const nameUp = p.name.toUpperCase()
          if (config.fuelPreference === "GAS") return nameUp === "GAS"
          if (config.fuelPreference === "ESPECIAL") return nameUp.includes("ESPECIAL")
          if (config.fuelPreference === "PREMIUM") return nameUp.includes("PREMIUM")
          if (config.fuelPreference === "DIESEL") return nameUp.includes("DIESEL")
          return false
        })
      })
  }, [genexStationsData, geocodedCoords, config.fuelPreference])

  // BioPetrol solo para tipos que soporta
  const bpVisible = BIOPETROL_FUELS.includes(config.fuelPreference)
    ? bpWithCoords
    : []

  const getDistance = (lat?: number, lon?: number) =>
    userLocation.lat && userLocation.lon && lat && lon
      ? haversineDistance(userLocation.lat, userLocation.lon, lat, lon)
      : undefined

  const unifiedStations: StationEntry[] = useMemo(() => {
    const list: StationEntry[] = []

    if (config.fuelPreference === "ELECTRICO") {
      evStationsBolivia.forEach((s, i) =>
        list.push({ source: "ev", id: `ev-${i}`, data: s, lat: s.lat, lon: s.lon, distance: getDistance(s.lat, s.lon) })
      )
    } else {
      bpVisible.forEach((s, i) =>
        list.push({ source: "biopetrol", id: `bp-${i}`, data: s, lat: s.lat, lon: s.lon, distance: getDistance(s.lat, s.lon) })
      )
      gxWithCoords.forEach((s, i) =>
        list.push({ source: "genex", id: `gx-${i}`, data: s, lat: s.lat, lon: s.lon, distance: getDistance(s.lat, s.lon) })
      )
    }

    // Cercanos primero, sin coordenadas al final
    return list.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance
      if (a.distance !== undefined) return -1
      if (b.distance !== undefined) return 1
      return 0
    })
  }, [bpVisible, gxWithCoords, config.fuelPreference, userLocation.lat, userLocation.lon])

  // Estaciones ESTÁTICAS filtradas por combustible — para el MAPA (coords garantizadas)
  const genexForMap = useMemo(() => {
    if (config.fuelPreference === "ELECTRICO") return []
    return genexStationsStatic.filter((s) =>
      s.fuels.some((f) => {
        const fu = f.toUpperCase()
        if (config.fuelPreference === "GAS") return fu.includes("GLP")
        if (config.fuelPreference === "ESPECIAL") return fu.includes("ESPECIAL")
        if (config.fuelPreference === "PREMIUM") return fu.includes("PREMIUM")
        if (config.fuelPreference === "DIESEL") return fu.includes("DIESEL")
        return false
      })
    )
  }, [config.fuelPreference])

  const bpForMap = useMemo(() => {
    if (!BIOPETROL_FUELS.includes(config.fuelPreference)) return []
    return bioPetrolStationsStatic.filter((s) =>
      s.fuels.some((f) => {
        const fu = f.toUpperCase()
        if (config.fuelPreference === "ESPECIAL") return fu.includes("ESPECIAL")
        if (config.fuelPreference === "PREMIUM") return fu.includes("PREMIUM")
        if (config.fuelPreference === "DIESEL") return fu.includes("DIESEL")
        return false
      })
    )
  }, [config.fuelPreference])

  const totalStations = bpVisible.length + gxWithCoords.length
  const geocodedCount = useMemo(
    () => [...bpVisible, ...gxWithCoords].filter((s) => s.lat && s.lon).length,
    [bpVisible, gxWithCoords]
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Scroll al card seleccionado cuando se toca un pin del mapa
  useEffect(() => {
    if (selectedId) {
      document.getElementById(`station-${selectedId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [selectedId])

  const fuelLabel = config.fuelPreference === "ESPECIAL" ? "G. Especial"
    : config.fuelPreference === "PREMIUM" ? "G. Premium"
      : config.fuelPreference === "DIESEL" ? "Diesel"
        : config.fuelPreference === "GAS" ? "Gas Natural"
          : "Eléctrico"

  return (
    <div className="map-layout flex flex-col md:flex-row">
      {/* Panel izquierdo laptop */}
      <aside className="w-full md:w-80 flex-col border-r shrink-0 overflow-y-auto overflow-x-hidden bg-background hidden sm:flex">

        {/* Selector de combustible */}
        <div className="p-3 border-b">
          <Tabs
            value={config.fuelPreference}
            onValueChange={(v) => setConfig((prev) => ({ ...prev, fuelPreference: v as FuelPreference }))}
          >
            <TabsList className="grid grid-cols-5 w-full h-8">
              {FUEL_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-0.5">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Estado */}
        <div className="px-3 py-2 border-b bg-muted/30 space-y-1">
          {userLocation.loading && <p className="text-xs text-muted-foreground">📍 Obteniendo ubicación GPS...</p>}
          {userLocation.lat && <p className="text-xs text-green-600 font-medium">📍 Ubicación obtenida · mostrando por cercanía</p>}
          {userLocation.error && <p className="text-xs text-amber-600">⚠️ {userLocation.error}</p>}
          {config.fuelPreference !== "ELECTRICO" && totalStations > 0 && (
            <p className="text-xs text-muted-foreground">
              {totalStations} estaciones de {fuelLabel}
              {geocodedCount > 0 && geocodedCount < totalStations && ` · ${geocodedCount}/${totalStations} en mapa`}
              {geocodedCount === totalStations && totalStations > 0 && " · todas en mapa ✓"}
            </p>
          )}
        </div>

        {/* Leyenda */}
        <div className="px-3 py-2 border-b flex items-center gap-3 bg-muted/10 text-xs flex-wrap">
          {config.fuelPreference !== "ELECTRICO" && config.fuelPreference !== "GAS" && (
            <span className="flex items-center gap-1">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='22' viewBox='0 0 32 44'%3E%3Cpath d='M16 2C8.8 2 3 7.8 3 15c0 10.5 13 27 13 27S29 25.5 29 15C29 7.8 23.2 2 16 2z' fill='%2316a34a' stroke='white' stroke-width='2.5'/%3E%3C/svg%3E"
                className="h-5" alt="" /> BioPetrol
            </span>
          )}
          {config.fuelPreference !== "ELECTRICO" && (
            <span className="flex items-center gap-1">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='22' viewBox='0 0 32 44'%3E%3Cpath d='M16 2C8.8 2 3 7.8 3 15c0 10.5 13 27 13 27S29 25.5 29 15C29 7.8 23.2 2 16 2z' fill='%23ea580c' stroke='white' stroke-width='2.5'/%3E%3C/svg%3E"
                className="h-5" alt="" /> Genex
            </span>
          )}
          {config.fuelPreference === "ELECTRICO" && (
            <span className="flex items-center gap-1">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='22' viewBox='0 0 32 44'%3E%3Cpath d='M16 2C8.8 2 3 7.8 3 15c0 10.5 13 27 13 27S29 25.5 29 15C29 7.8 23.2 2 16 2z' fill='%237c3aed' stroke='white' stroke-width='2.5'/%3E%3C/svg%3E"
                className="h-5" alt="" /> Cargador EV
            </span>
          )}
          <span className="text-muted-foreground text-xs">· Toca un pin → ver ruta</span>
        </div>

        <FakeAd />

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {unifiedStations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
              <span className="text-4xl">{config.fuelPreference === "ELECTRICO" ? "⚡" : "⛽"}</span>
              <p className="text-sm text-muted-foreground">
                {`Sin estaciones de ${fuelLabel}. Presiona ↺ Actualizar.`}
              </p>
            </div>
          ) : (
            unifiedStations.map((entry) => {
              const isSelected = selectedId === entry.id
              if (entry.source === "biopetrol") {
                return (
                  <div
                    key={entry.id}
                    id={`station-${entry.id}`}
                    className={`transition-all rounded-lg ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <Badge variant="outline" className="text-xs mb-1 text-green-700 border-green-300 bg-green-50">
                      🟢 BioPetrol
                    </Badge>
                    <BioPetrolCard {...entry.data} fuelLabel={fuelLabel} distance={entry.distance} />
                  </div>
                )
              }
              if (entry.source === "genex") {
                return (
                  <div
                    key={entry.id}
                    id={`station-${entry.id}`}
                    className={`transition-all rounded-lg ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <Badge variant="outline" className="text-xs mb-1 text-orange-700 border-orange-300 bg-orange-50">
                      🟠 Genex
                    </Badge>
                    <GenexCard
                      {...entry.data}
                      fuelType={config.fuelPreference !== "ELECTRICO" ? (config.fuelPreference as Exclude<FuelPreference, "ELECTRICO">) : undefined}
                      distance={entry.distance}
                    />
                  </div>
                )
              }
              return (
                <div
                  key={entry.id}
                  id={`station-${entry.id}`}
                  className={`transition-all rounded-lg ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <EVCard station={{ ...entry.data, distance: entry.distance }} />
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* Mapa */}
      <div className={`flex-1 min-h-[400px] relative ${open ? "hidden" : ""}`}>
        <ClientOnly
          fallback={
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              Cargando mapa...
            </div>
          }
        >
          {() => (
            <LazyMapLoader
              biopetrolStations={bpForMap}
              genexStations={genexForMap}
              evStations={evStationsBolivia}
              userLat={userLocation.lat}
              userLon={userLocation.lon}
              fuelType={config.fuelPreference}
              onStationClick={setSelectedId}
            />
          )}
        </ClientOnly>

        {config.fuelPreference !== "ELECTRICO" && totalStations > 0 && geocodedCount < totalStations && (
          <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur text-xs px-3 py-1.5 rounded-full border shadow-sm text-muted-foreground">
            <span className="animate-pulse mr-1">📡</span>
            Geocodificando {geocodedCount}/{totalStations} estaciones...
          </div>
        )}
      </div>

      {/* Panel mobile*/}
      <div className="sm:hidden flex justify-center items-center">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="w-full" onClick={() => setOpen(!open)}>
            <Button variant={"secondary"} className="w-full">
              <MenuIcon />
            </Button>
          </DialogTrigger>
          <DialogContent showCloseButton={true}>
            <DialogHeader>
              <div className="p-3 border-b">
                <Tabs
                  value={config.fuelPreference}
                  onValueChange={(v) => setConfig((prev) => ({ ...prev, fuelPreference: v as FuelPreference }))}
                >
                  <TabsList className="grid grid-cols-5 w-full h-8">
                    {FUEL_TABS.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-0.5">
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              <div className="px-3 py-2 border-b bg-muted/30 space-y-1">
                {userLocation.loading && <p className="text-xs text-muted-foreground">📍 Obteniendo ubicación GPS...</p>}
                {userLocation.lat && <p className="text-xs text-green-600 font-medium">📍 Ubicación obtenida · mostrando por cercanía</p>}
                {userLocation.error && <p className="text-xs text-amber-600">⚠️ {userLocation.error}</p>}
                {config.fuelPreference !== "ELECTRICO" && totalStations > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {totalStations} estaciones de {fuelLabel}
                    {geocodedCount > 0 && geocodedCount < totalStations && ` · ${geocodedCount}/${totalStations} en mapa`}
                    {geocodedCount === totalStations && totalStations > 0 && " · todas en mapa ✓"}
                  </p>
                )}
              </div>

              <FakeAd width={"350"} height={"30"} />

            </DialogHeader>
            <aside className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">

              {/* Leyenda */}
              <div className="px-3 py-2 border-b flex items-center gap-3 bg-muted/10 text-xs flex-wrap">
                {config.fuelPreference !== "ELECTRICO" && config.fuelPreference !== "GAS" && (
                  <span className="flex items-center gap-1">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='22' viewBox='0 0 32 44'%3E%3Cpath d='M16 2C8.8 2 3 7.8 3 15c0 10.5 13 27 13 27S29 25.5 29 15C29 7.8 23.2 2 16 2z' fill='%2316a34a' stroke='white' stroke-width='2.5'/%3E%3C/svg%3E"
                      className="h-5" alt="" /> BioPetrol
                  </span>
                )}
                {config.fuelPreference !== "ELECTRICO" && (
                  <span className="flex items-center gap-1">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='22' viewBox='0 0 32 44'%3E%3Cpath d='M16 2C8.8 2 3 7.8 3 15c0 10.5 13 27 13 27S29 25.5 29 15C29 7.8 23.2 2 16 2z' fill='%23ea580c' stroke='white' stroke-width='2.5'/%3E%3C/svg%3E"
                      className="h-5" alt="" /> Genex
                  </span>
                )}
                {config.fuelPreference === "ELECTRICO" && (
                  <span className="flex items-center gap-1">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='22' viewBox='0 0 32 44'%3E%3Cpath d='M16 2C8.8 2 3 7.8 3 15c0 10.5 13 27 13 27S29 25.5 29 15C29 7.8 23.2 2 16 2z' fill='%237c3aed' stroke='white' stroke-width='2.5'/%3E%3C/svg%3E"
                      className="h-5" alt="" /> Cargador EV
                  </span>
                )}
                <span className="text-muted-foreground text-xs">· Toca un pin → ver ruta</span>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {unifiedStations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                    <span className="text-4xl">{config.fuelPreference === "ELECTRICO" ? "⚡" : "⛽"}</span>
                    <p className="text-sm text-muted-foreground">
                      {`Sin estaciones de ${fuelLabel}. Presiona ↺ Actualizar.`}
                    </p>
                  </div>
                ) : (
                  unifiedStations.map((entry) => {
                    const isSelected = selectedId === entry.id
                    if (entry.source === "biopetrol") {
                      return (
                        <div
                          key={entry.id}
                          id={`station-${entry.id}`}
                          className={`transition-all rounded-lg ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                          onClick={() => setSelectedId(entry.id)}
                        >
                          <Badge variant="outline" className="text-xs mb-1 text-green-700 border-green-300 bg-green-50">
                            🟢 BioPetrol
                          </Badge>
                          <BioPetrolCard {...entry.data} fuelLabel={fuelLabel} distance={entry.distance} />
                        </div>
                      )
                    }
                    if (entry.source === "genex") {
                      return (
                        <div
                          key={entry.id}
                          id={`station-${entry.id}`}
                          className={`transition-all rounded-lg ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                          onClick={() => setSelectedId(entry.id)}
                        >
                          <Badge variant="outline" className="text-xs mb-1 text-orange-700 border-orange-300 bg-orange-50">
                            🟠 Genex
                          </Badge>
                          <GenexCard
                            {...entry.data}
                            fuelType={config.fuelPreference !== "ELECTRICO" ? (config.fuelPreference as Exclude<FuelPreference, "ELECTRICO">) : undefined}
                            distance={entry.distance}
                          />
                        </div>
                      )
                    }
                    return (
                      <div
                        key={entry.id}
                        id={`station-${entry.id}`}
                        className={`transition-all rounded-lg ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                        onClick={() => setSelectedId(entry.id)}
                      >
                        <EVCard station={{ ...entry.data, distance: entry.distance }} />
                      </div>
                    )
                  })
                )}
              </div>
            </aside>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
