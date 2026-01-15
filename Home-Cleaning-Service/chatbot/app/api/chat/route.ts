export const maxDuration = 30

const SYSTEM_PROMPT = `You are Sparkle Assistant, a friendly and professional customer service representative for a residential and commercial cleaning business.

Your responsibilities:
- Answer questions about cleaning services (residential, commercial, deep cleaning, move-in/move-out, etc.)
- Provide general pricing information and explain that exact quotes require an assessment
- Help customers understand what's included in different cleaning packages
- Assist with scheduling inquiries
- Address common concerns about cleaning products, pet safety, and eco-friendly options
- Collect customer information for booking requests

Service offerings:
- Standard Cleaning: Regular maintenance cleaning for homes and offices
- Deep Cleaning: Thorough top-to-bottom cleaning including baseboards, inside appliances, etc.
- Move-In/Move-Out Cleaning: Comprehensive cleaning for property transitions
- Commercial Cleaning: Office buildings, retail spaces, and commercial properties
- Specialty Services: Carpet cleaning, window washing, post-construction cleanup

Be helpful, warm, and professional. If you don't know specific pricing, explain that a representative will provide a custom quote. Always encourage customers to book a free consultation.`

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    console.log("[v0] Received messages:", JSON.stringify(messages))

    const coreMessages = messages.map(
      (msg: { role: string; content?: string; parts?: Array<{ type: string; text?: string }> }) => ({
        role: msg.role as "user" | "assistant" | "system",
        content:
          msg.content ||
          msg.parts
            ?.filter((p: { type: string }) => p.type === "text")
            .map((p: { text?: string }) => p.text)
            .join("") ||
          "",
      }),
    )

    // Add system message at the beginning
    const messagesWithSystem = [{ role: "system", content: SYSTEM_PROMPT }, ...coreMessages]

    // Direct OpenAI API call
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messagesWithSystem,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] OpenAI API error:", error)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    console.log("[v0] OpenAI response received, streaming...")

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const messageId = `msg-${Date.now()}`
    let fullContent = ""

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true })
        const lines = text.split("\n").filter((line) => line.trim() !== "")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") {
              // Send finish message
              const finishMessage = {
                type: "finish",
                finishReason: "stop",
              }
              controller.enqueue(encoder.encode(`d:${JSON.stringify(finishMessage)}\n`))
              continue
            }
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                fullContent += content
                // AI SDK data stream format: text delta
                controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`))
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      },
    })

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    })
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
