import type React from "react"
import Header from "./header/header"
import Footer from "./footer/footer"
import BottomNav from "./bottom-nav"
import StationsProvider from "~/context/stations-provider"
import ConfigCtxProvider from "~/context/configCtx"
import { ChatbotMapProvider } from "~/context/chatbotMapCtx"
import ChatBot from "~/components/chatbot/chatbot"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfigCtxProvider>
      <ChatbotMapProvider>
      <StationsProvider>
        <Header />
        {/* pb-16 en móvil para no tapar contenido con el BottomNav */}
        <main className="flex flex-col pb-16 md:pb-0">
          {children}
        </main>
        <Footer />
        <BottomNav />
        <ChatBot />
      </StationsProvider>
      </ChatbotMapProvider>
    </ConfigCtxProvider>
  )
}
