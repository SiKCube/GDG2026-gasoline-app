import { useState, useRef, useEffect } from "react"
import { Bot, MessageCircle, Send, User, X } from "lucide-react"
import { Drawer, DrawerContent } from "~/components/ui/drawer"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { useGenexData } from "~/context/genexCtx"
import { useBioPetrolData } from "~/context/biopetrolCtx"
import { useUserLocation } from "~/context/locationCtx"
import { useConfig } from "~/context/configCtx"
import { processMessage, type StationResult } from "~/utils/chatbot-engine"
import { formatDistance } from "~/utils/distance"
import { AdSlot } from "adkit-react"

interface Message {
  id: number
  role: "bot" | "user"
  text: string
  stations?: StationResult[]
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

function StationCard({ s }: { s: StationResult }) {
  const openMaps = () => {
    if (!s.lat || !s.lon) return
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`, "_blank")
  }

  return (
    <div className="bg-background border rounded-lg p-2.5 text-xs space-y-1 mt-1.5 shadow-sm">
      <p className="font-semibold text-sm leading-tight">{s.name}</p>
      <p className="text-muted-foreground truncate">{s.address}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {s.distance !== undefined && (
          <span className="font-medium text-blue-600">{formatDistance(s.distance)}</span>
        )}
        <span className="text-green-700">{s.fuelInfo}</span>
        {s.waitTime && <span className="text-muted-foreground">⏱ {s.waitTime}</span>}
      </div>
      {s.lat && s.lon && (
        <Button size="sm" variant="outline" className="h-6 text-xs px-2 mt-0.5" onClick={openMaps}>
          Ir aquí
        </Button>
      )}
    </div>
  )
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState("")
  const endRef = useRef<HTMLDivElement>(null)

  const { genexStationsData } = useGenexData()
  const { bioPetrolStationsData } = useBioPetrolData()
  const location = useUserLocation()
  const { config } = useConfig()

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
    const botMsg: Message = {
      id: Date.now() + 1,
      role: "bot",
      text: result.text,
      stations: result.stations,
      quickReplies: result.quickReplies,
    }
    setMessages(prev => [...prev, userMsg, botMsg])
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
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <AdSlot theme="light" slot="fuel-bol-banner" aspectRatio="banner" price={300} />

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

                  {msg.stations?.map((s, i) => <StationCard key={i} s={s} />)}

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
