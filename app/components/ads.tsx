interface Props {
  width: number
  height: number
  scriptCode: string
}

export default function Ads({ width, height, scriptCode }: Props) {
  const isolatedScriptBody = `
      <!DOCTYPE html>
    <html>
    <head>
      <style>body { margin: 0; padding: 0; }</style>
   </head>
    <body>
    ${scriptCode}
    </body>
  </html>

  `

  return (
    <iframe srcDoc={isolatedScriptBody}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        border: "none"
      }}
    />
  )
}