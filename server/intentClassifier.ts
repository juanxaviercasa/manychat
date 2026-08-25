import { invokeLLM } from "./_core/llm";

export const intentCategories = ["informacion", "precio", "reserva", "soporte", "queja", "venta", "baja", "otro"] as const;
export type IntentCategory = (typeof intentCategories)[number];
export type IntentClassification = {
  intent: IntentCategory;
  confidence: number;
  summary: string;
  shouldEscalate: boolean;
};

const fallback: IntentClassification = { intent: "otro", confidence: 0, summary: "No fue posible clasificar el mensaje automáticamente.", shouldEscalate: true };

export async function classifyInboundMessage(input: { channel: string; content: string }): Promise<IntentClassification> {
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 300,
      messages: [
        {
          role: "system",
          content: "Clasifica mensajes entrantes de negocio en español. No ejecutes acciones, no inventes datos y no incluyas información sensible. Responde exclusivamente según el esquema JSON solicitado.",
        },
        { role: "user", content: `Canal: ${input.channel}\nMensaje: ${input.content}` },
      ],
      outputSchema: {
        name: "intent_classification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            intent: { type: "string", enum: [...intentCategories] },
            confidence: { type: "integer", minimum: 0, maximum: 100 },
            summary: { type: "string", minLength: 1, maxLength: 240 },
            shouldEscalate: { type: "boolean" },
          },
          required: ["intent", "confidence", "summary", "shouldEscalate"],
          additionalProperties: false,
        },
      },
    });
    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") return fallback;
    const parsed = JSON.parse(content) as IntentClassification;
    if (!intentCategories.includes(parsed.intent) || !Number.isInteger(parsed.confidence)) return fallback;
    return { ...parsed, confidence: Math.max(0, Math.min(100, parsed.confidence)), summary: parsed.summary.slice(0, 240) };
  } catch (error) {
    console.error("[Intent classifier]", error);
    return fallback;
  }
}
