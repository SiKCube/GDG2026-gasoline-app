import { useState, useRef, useEffect } from "react"
import { Bot, Loader2, MapPin, MessageCircle, Send, User, Volume2, VolumeX, X } from "lucide-react"
import { Drawer, DrawerContent } from "~/components/ui/drawer"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { useGenexData } from "~/context/genexCtx"
import { useBioPetrolData } from "~/context/biopetrolCtx"
import { useUserLocation } from "~/context/locationCtx"
import { useConfig } from "~/context/configCtx"
import { useChatbotMap, type HighlightedStation } from "~/context/chatbotMapCtx"
import { processMessage, type StationResult } from "~/utils/chatbot-engine"
import { genexStationsStatic } from "~/utils/genexStationsStatic"
import { bioPetrolStationsStatic } from "~/utils/bioPetrolStationsStatic"

interface Message {
  id: number
  role: "bot" | "user"
  text: string
  mappedCount?: number   // cuántas estaciones se marcaron en el mapa
  quickReplies?: string[]
}

const WELCOME: Message = {
  id: 0,
  role: "bot",
  text: "¡Hola! Soy tu asistente de combustible. ¿Qué necesitas?",
  quickReplies: [
    "¿Cuál me conviene?",
    "¿Cuál está más cerca?",
    "¿Dónde hay Diesel?",
    "¿Menor espera?",
  ],
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function resolveCoords(station: StationResult): { lat: number; lon: number } | null {
  if (station.lat != null && station.lon != null) {
    return { lat: station.lat, lon: station.lon }
  }
  const nn = normalize(station.name)
  const all = [
    ...genexStationsStatic.map(s => ({ lat: s.lat, lon: s.lon, name: s.name })),
    ...bioPetrolStationsStatic.map(s => ({ lat: s.lat, lon: s.lon, name: s.name })),
  ]
  const match = all.find(s => {
    const sn = normalize(s.name)
    const words = nn.split(" ").filter(w => w.length > 3)
    return sn === nn || sn.includes(nn) || nn.includes(sn) || words.some(w => sn.includes(w))
  })
  return match ? { lat: match.lat, lon: match.lon } : null
}

function stationsToHighlighted(stations: StationResult[]): HighlightedStation[] {
  return stations.flatMap(s => {
    const coords = resolveCoords(s)
    if (!coords) return []
    return [{ ...coords, name: s.name, fuelInfo: s.fuelInfo, waitTime: s.waitTime }]
  })
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState("")
  const [muted, setMuted] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const { genexStationsData } = useGenexData()
  const { bioPetrolStationsData } = useBioPetrolData()
  const location = useUserLocation()
  const { config } = useConfig()
  const { setHighlightedStations } = useChatbotMap()

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
  }

  const speak = async (text: string) => {
    if (muted) return
    stopAudio()
    setSpeaking(true)
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) { setSpeaking(false); return }
      const { audioContent } = await res.json()
      const audio = new Audio(`data:audio/wav;base64,${audioContent}`)
      audioRef.current = audio
      audio.onended = () => setSpeaking(false)
      audio.onerror = () => setSpeaking(false)
      audio.play()
    } catch {
      setSpeaking(false)
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (open) speak(WELCOME.text)
    else stopAudio()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const send = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { id: Date.now(), role: "user", text }
    const result = processMessage(
      text,
      genexStationsData,
      bioPetrolStationsData,
      { lat: location.lat, lon: location.lon },
      config.fuelPreference
    )

    let mappedCount = 0
    if (result.stations?.length) {
      const highlighted = stationsToHighlighted(result.stations)
      setHighlightedStations(highlighted)
      mappedCount = highlighted.length
      // Cierra el drawer para que el usuario vea el mapa
      if (mappedCount > 0) setTimeout(() => setOpen(false), 900)
    }

    const botMsg: Message = {
      id: Date.now() + 1,
      role: "bot",
      text: result.text,
      mappedCount: mappedCount || undefined,
      quickReplies: result.quickReplies,
    }
    setMessages(prev => [...prev, userMsg, botMsg])
    speak(result.text)
    setInput("")
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir asistente"
        className="fixed bottom-20 right-4 z-40 md:bottom-6 w-13 h-13 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">Asistente de Combustible</span>
            </div>
            <div className="flex items-center gap-1">
              {speaking && !muted && (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              )}
              <button
                onClick={() => { setMuted(m => !m); stopAudio(); setSpeaking(false) }}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label={muted ? "Activar voz" : "Silenciar voz"}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}

                <div className={`max-w-[80%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} gap-1`}>
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-snug ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.mappedCount != null && msg.mappedCount > 0 && (
                    <button
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 hover:bg-amber-100 transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      {msg.mappedCount} estación{msg.mappedCount > 1 ? "es" : ""} marcada{msg.mappedCount > 1 ? "s" : ""} en el mapa →
                    </button>
                  )}

                  {msg.quickReplies && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {msg.quickReplies.map(r => (
                        <button
                          key={r}
                          onClick={() => send(r)}
                          className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 hover:bg-primary/20 transition-colors"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={e => { e.preventDefault(); send(input) }}
            className="border-t px-4 py-3 flex gap-2 shrink-0"
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ej: ¿Dónde hay diesel cerca?"
              className="flex-1 text-sm"
            />
            <Button type="submit" size="sm" disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  )
}
