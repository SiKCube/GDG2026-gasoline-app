import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"

export interface HighlightedStation {
  lat: number
  lon: number
  name: string
  fuelInfo: string
  waitTime?: string
}

interface ChatbotMapCtxType {
  highlightedStations: HighlightedStation[]
  setHighlightedStations: (stations: HighlightedStation[]) => void
}

const ChatbotMapCtx = createContext<ChatbotMapCtxType>({
  highlightedStations: [],
  setHighlightedStations: () => {},
})

export function ChatbotMapProvider({ children }: { children: ReactNode }) {
  const [highlightedStations, setHighlightedStations] = useState<HighlightedStation[]>([])
  return (
    <ChatbotMapCtx.Provider value={{ highlightedStations, setHighlightedStations }}>
      {children}
    </ChatbotMapCtx.Provider>
  )
}

export function useChatbotMap() {
  return useContext(ChatbotMapCtx)
}
