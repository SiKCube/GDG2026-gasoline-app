import { AdkitProvider } from "adkit-react"
import "adkit-react/styles.css"
import type React from "react"

export default function AdProvider({ children }: {children: React.ReactNode}) {
  return (
    <AdkitProvider siteId="cmptf9sxi0002jv046e4zau18">
      {children}
    </AdkitProvider>
  )
}