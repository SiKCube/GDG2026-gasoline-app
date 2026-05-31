// Convierte PCM crudo (L16, mono) a WAV agregando el header estándar
function pcmToWav(pcmBase64: string, sampleRate = 24000): string {
  const pcm = Buffer.from(pcmBase64, "base64")
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcm.length

  const header = Buffer.alloc(44)
  let o = 0
  header.write("RIFF", o); o += 4
  header.writeUInt32LE(36 + dataSize, o); o += 4
  header.write("WAVE", o); o += 4
  header.write("fmt ", o); o += 4
  header.writeUInt32LE(16, o); o += 4
  header.writeUInt16LE(1, o); o += 2           // PCM
  header.writeUInt16LE(numChannels, o); o += 2
  header.writeUInt32LE(sampleRate, o); o += 4
  header.writeUInt32LE(byteRate, o); o += 4
  header.writeUInt16LE(blockAlign, o); o += 2
  header.writeUInt16LE(bitsPerSample, o); o += 2
  header.write("data", o); o += 4
  header.writeUInt32LE(dataSize, o)

  return Buffer.concat([header, pcm]).toString("base64")
}

export async function action({ request }: { request: Request }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 })
  }

  let text: string
  try {
    const body = await request.json()
    text = String(body.text ?? "").trim()
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  if (!text) return Response.json({ error: "Texto vacío" }, { status: 400 })

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          response_modalities: ["AUDIO"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: { voice_name: "Kore" },
            },
          },
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error("[TTS] Error Gemini:", err)
    return Response.json({ error: "Error en Gemini TTS" }, { status: res.status })
  }

  const data = await res.json()
  const pcmBase64: string | undefined =
    data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data

  if (!pcmBase64) {
    console.error("[TTS] Respuesta inesperada:", JSON.stringify(data))
    return Response.json({ error: "Sin audio en la respuesta" }, { status: 500 })
  }

  const wavBase64 = pcmToWav(pcmBase64)
  return Response.json({ audioContent: wavBase64 })
}
