import FakeAd from "~/components/fake-ads"
import GenexList from "~/components/genex/genex-list"
import { useConfig } from "~/context/configCtx"

export default function GenexPage() {
  const { config } = useConfig()
  return (
    <div className="container mx-auto py-4">
      <div className="mb-4 px-4">
        <h1 className="text-xl font-bold">🟠 Genex</h1>
        <p className="text-sm text-muted-foreground">
          Resaltando: {config.fuelPreference} · toca una estación para ver todos sus combustibles
        </p>
      </div>
      <FakeAd />
      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <GenexList />
      </div>
    </div>
  )
}
