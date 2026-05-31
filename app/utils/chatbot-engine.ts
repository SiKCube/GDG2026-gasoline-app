import type { GenexStation } from "./genex"
import type { BioPetrolStation } from "./bioPetrol"
import { haversineDistance, formatDistance } from "./distance"
import type { FuelPreference } from "~/context/configCtx"

export interface StationResult {
  name: string
  address: string
  distance?: number
  fuelInfo: string
  waitTime?: string
  available: boolean
  lat?: number
  lon?: number
}

export interface ChatResponse {
  text: string
  stations?: StationResult[]
  quickReplies?: string[]
}

interface Location {
  lat: number | null
  lon: number | null
}

type Intent = "best" | "nearest" | "wait" | "fuel" | "greet" | "unknown"
type FuelQuery = "diesel" | "premium" | "especial" | "gas" | "any"

function detectFuel(text: string): FuelQuery {
  const t = text.toLowerCase()
  if (t.includes("diesel") || t.includes("diésel")) return "diesel"
  if (t.includes("premium")) return "premium"
  if (t.includes("especial")) return "especial"
  if (t.includes("gas") || t.includes("glp")) return "gas"
  return "any"
}

function detectIntent(text: string): Intent {
  const t = text.toLowerCase()
  if (t.includes("hola") || t.includes("ayuda") || t.includes("puedes") || t.includes("qué haces")) return "greet"
  if (t.includes("cerca") || t.includes("próxima") || t.includes("proxima") || t.includes("distancia")) return "nearest"
  if (t.includes("espera") || t.includes("fila") || t.includes("cola") || t.includes("tiempo") || t.includes("rápido") || t.includes("rapido")) return "wait"
  if (t.includes("hay") || t.includes("disponible") || t.includes("tiene") || t.includes("donde") || t.includes("dónde")) return "fuel"
  if (t.includes("mejor") || t.includes("recomienda") || t.includes("conviene") || t.includes("cuál") || t.includes("cual")) return "best"
  return "unknown"
}

function preferenceToQuery(pref: FuelPreference): FuelQuery {
  switch (pref) {
    case "DIESEL": return "diesel"
    case "PREMIUM": return "premium"
    case "ESPECIAL": return "especial"
    case "GAS": return "gas"
    default: return "any"
  }
}

function genexToResults(stations: GenexStation[], fuelQuery: FuelQuery, location: Location): StationResult[] {
  const results: StationResult[] = []

  for (const station of stations) {
    const matching = station.products.filter(p => {
      if (!p.available) return false
      if (fuelQuery === "any") return true
      const nameUpper = p.name.toUpperCase()
      if (fuelQuery === "diesel") return nameUpper.includes("DIESEL")
      if (fuelQuery === "premium") return nameUpper.includes("PREMIUM")
      if (fuelQuery === "especial") return nameUpper.includes("ESPECIAL")
      if (fuelQuery === "gas") return nameUpper.includes("GAS") || nameUpper.includes("GLP")
      return false
    })

    if (!matching.length) continue

    const best = matching[0]
    const distance =
      location.lat != null && location.lon != null && station.lat != null && station.lon != null
        ? haversineDistance(location.lat, location.lon, station.lat, station.lon)
        : undefined

    results.push({
      name: station.name,
      address: station.address,
      distance,
      fuelInfo: `${best.name}: ${best.volume}`,
      waitTime: best.waitTime || undefined,
      available: true,
      lat: station.lat,
      lon: station.lon,
    })
  }

  return results
}

function bioPetrolToResults(stations: BioPetrolStation[], location: Location): StationResult[] {
  return stations
    .filter(s => s.fuelVol && s.fuelVol !== "" && !s.fuelVol.toUpperCase().includes("AGOTADO"))
    .map(s => {
      const distance =
        location.lat != null && location.lon != null && s.lat != null && s.lon != null
          ? haversineDistance(location.lat, location.lon, s.lat!, s.lon!)
          : undefined
      return {
        name: s.name,
        address: s.address,
        distance,
        fuelInfo: `Vol: ${s.fuelVol}`,
        waitTime: s.aproxWaitTime || undefined,
        available: true,
        lat: s.lat,
        lon: s.lon,
      }
    })
}

function sortByDistance(results: StationResult[]): StationResult[] {
  const withDist = results.filter(r => r.distance !== undefined).sort((a, b) => a.distance! - b.distance!)
  const withoutDist = results.filter(r => r.distance === undefined)
  return [...withDist, ...withoutDist]
}

function parseMinutes(waitTime?: string): number {
  if (!waitTime) return 9999
  const match = waitTime.match(/(\d+)/)
  return match ? parseInt(match[1]) : 9999
}

const DEFAULT_QUICK_REPLIES = ["¿Cuál me conviene?", "¿Cuál está más cerca?", "¿Menor espera?"]

export function processMessage(
  text: string,
  genexStations: GenexStation[],
  bioPetrolStations: BioPetrolStation[],
  location: Location,
  fuelPreference: FuelPreference
): ChatResponse {
  const intent = detectIntent(text)
  const explicitFuel = detectFuel(text)
  const fuelQuery = explicitFuel !== "any" ? explicitFuel : preferenceToQuery(fuelPreference)
  const fuelLabel = fuelQuery !== "any" ? fuelQuery : "combustible"

  if (intent === "greet") {
    return {
      text: "¡Hola! Soy tu asistente de combustible. Puedo ayudarte a encontrar la mejor estación disponible.",
      quickReplies: ["¿Cuál me conviene?", "¿Cuál está más cerca?", "¿Dónde hay Diesel?", "¿Menor espera?"],
    }
  }

  const noData = !genexStations.length && !bioPetrolStations.length
  if (noData) {
    return {
      text: "Aún no hay datos cargados. Presiona Actualizar en la barra superior para obtener información de las estaciones.",
      quickReplies: DEFAULT_QUICK_REPLIES,
    }
  }

  const includeGenex = true
  const includeBioPetrol = fuelQuery === "diesel" || fuelQuery === "premium" || fuelQuery === "especial" || fuelQuery === "any"

  const allResults = [
    ...(includeGenex ? genexToResults(genexStations, fuelQuery, location) : []),
    ...(includeBioPetrol ? bioPetrolToResults(bioPetrolStations, location) : []),
  ]

  if (!allResults.length) {
    return {
      text: `No encontré estaciones con ${fuelLabel} disponible en este momento. Puede que los datos estén desactualizados.`,
      quickReplies: ["¿Cuál me conviene?", "¿Dónde hay Diesel?", "¿Dónde hay Especial?"],
    }
  }

  if (intent === "nearest") {
    const withDist = allResults.filter(r => r.distance !== undefined)
    if (!withDist.length) {
      return {
        text: "Activa el GPS en tu navegador para que pueda calcular la estación más cercana.",
        quickReplies: DEFAULT_QUICK_REPLIES,
      }
    }
    const top = sortByDistance(withDist).slice(0, 3)
    return {
      text: `Las ${top.length} estaciones con ${fuelLabel} más cercanas:`,
      stations: top,
      quickReplies: ["¿Cuál me conviene?", "¿Menor espera?"],
    }
  }

  if (intent === "wait") {
    const sorted = [...allResults].sort((a, b) => parseMinutes(a.waitTime) - parseMinutes(b.waitTime))
    const top = sorted.slice(0, 3)
    return {
      text: `Estaciones con menor espera para ${fuelLabel}:`,
      stations: top,
      quickReplies: ["¿Cuál está más cerca?", "¿Cuál me conviene?"],
    }
  }

  // "best", "fuel", "unknown" → recomendación general
  const sorted = sortByDistance(allResults)
  const top = sorted.slice(0, 3)

  const hasLocation = location.lat != null
  const criterion = hasLocation ? "distancia y disponibilidad" : "disponibilidad"

  return {
    text: `Mis recomendaciones de ${fuelLabel} (por ${criterion}):`,
    stations: top,
    quickReplies: ["¿Cuál está más cerca?", "¿Menor espera?"],
  }
}
