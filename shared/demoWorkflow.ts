export type DemoNodeKind = "trigger" | "condition" | "wait" | "message" | "tag";
export type DemoWorkflowNode = { id: string; kind: DemoNodeKind; title: string; config: Record<string, string | number | boolean> };
export const demoWorkflow = { id: "flow_instagram_welcome", name: "Bienvenida desde Instagram", active: true, nodes: [{ id: "trigger_1", kind: "trigger", title: "Comentario en Instagram", config: { keywords: "INFO,PRECIO", channel: "instagram" } }, { id: "condition_1", kind: "condition", title: "¿Tiene teléfono?", config: { field: "phone", operator: "exists" } }, { id: "wait_1", kind: "wait", title: "Espera inteligente", config: { minSeconds: 3, maxSeconds: 8 } }, { id: "message_1", kind: "message", title: "Enviar WhatsApp", config: { template: "bienvenida_lead", channel: "whatsapp" } }, { id: "tag_1", kind: "tag", title: "Añadir etiqueta", config: { tag: "prospecto-caliente" } }] satisfies DemoWorkflowNode[], edges: [["trigger_1", "condition_1"], ["condition_1", "wait_1", "Sí"], ["condition_1", "message_1", "No"], ["wait_1", "message_1"], ["message_1", "tag_1"]] as const } as const;
export const antiSpamLimits = { instagramDaily: 200, whatsappMinSeconds: 3, whatsappMaxSeconds: 8 } as const;
export function isDemoSafe(mode: string | undefined) { return mode !== "production"; }
export function duplicateWorkflow<T extends { id: string; name: string }>(workflow: T): T {
  return { ...workflow, id: `${workflow.id}_copy`, name: `${workflow.name} · copia` };
}
