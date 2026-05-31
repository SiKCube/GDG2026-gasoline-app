interface Props {
  width: number
  height: number
  scriptCode: string
}

export default function FakeAd({ width, height }: { width?: string, height?: string }) {
  return (
    <div className="flex justify-center items-center bg-amber-300" style={{ width, height }}>
      <span>AD</span>
    </div>
  )
}