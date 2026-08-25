import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Database, Download, Loader2, ShieldCheck, UsersRound, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { serializeRowsToCsv } from "../../../shared/csv";

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) { toast("No hay registros para exportar"); return; }
  const content = serializeRowsToCsv(rows);
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function OperationsDataPanel() {
  const { user, loading, isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [leadStatus, setLeadStatus] = useState("Todos");
  const utils = trpc.useUtils();
  const metrics = trpc.automation.dashboard.metrics.useQuery(undefined, { enabled: isAuthenticated });
  const contacts = trpc.automation.contacts.list.useQuery({ query, leadStatus }, { enabled: isAuthenticated });
  const reviewQueue = trpc.automation.inbox.reviewQueue.useQuery(undefined, { enabled: isAuthenticated });
  const resolveReview = trpc.automation.inbox.resolveReview.useMutation({
    onSuccess: async () => { await utils.automation.inbox.reviewQueue.invalidate(); toast.success("Revisión marcada como resuelta"); },
    onError: (error) => toast.error(error.message),
  });
  const createWorkflow = trpc.automation.workflows.create.useMutation({
    onSuccess: async () => { await utils.automation.dashboard.metrics.invalidate(); toast.success("Workflow guardado en la base de datos"); },
    onError: (error) => toast.error(error.message),
  });
  const createContact = trpc.automation.contacts.create.useMutation({
    onSuccess: async () => { await utils.automation.contacts.list.invalidate(); await utils.automation.dashboard.metrics.invalidate(); toast.success("Contacto guardado en CRM"); },
    onError: (error) => toast.error(error.message),
  });

  const exportedContacts = useMemo(() => (contacts.data ?? []).map((contact) => ({
    nombre: contact.name,
    identificador: contact.handle,
    canal: contact.channel,
    estado: contact.leadStatus,
    etiquetas: JSON.parse(contact.tagsJson || "[]").join(" | "),
    intencion_ia: contact.intent ?? "",
    confianza_ia: contact.intentConfidence ?? "",
    ultima_actividad: contact.lastActivityAt.toISOString(),
  })), [contacts.data]);

  if (loading) return <div className="data-operations loading"><Loader2 size={16} className="animate-spin" /> Preparando espacio persistente…</div>;
  if (!isAuthenticated) return <section className="data-operations"><div className="data-operation-copy"><span className="data-operation-icon"><Database size={18} /></span><div><strong>Activa tu espacio persistente</strong><p>Inicia sesión para guardar workflows, contactos y ejecuciones por usuario.</p></div></div><button className="button-primary" onClick={() => startLogin()}>Iniciar sesión</button></section>;

  const snapshot = metrics.data ?? { workflows: 0, activeWorkflows: 0, contacts: 0, executions: 0, conversations: 0 };
  return <section className="data-operations" aria-label="Operación persistente"><div className="data-operation-copy"><span className="data-operation-icon"><ShieldCheck size={18} /></span><div><strong>Espacio persistente activo</strong><p>{user?.role === "admin" ? "Administrador" : "Miembro"} · Datos aislados por usuario · Redis conectado para límites de envío.</p></div></div><div className="data-actions"><button className="button-secondary" disabled={createWorkflow.isPending} onClick={() => createWorkflow.mutate({ name: "Nuevo workflow persistente", trigger: "Evento manual", graphJson: JSON.stringify({ nodes: [], edges: [] }) })}><Workflow size={14} /> Guardar workflow</button><button className="button-secondary" disabled={createContact.isPending} onClick={() => createContact.mutate({ name: "Nuevo contacto", handle: "pendiente", channel: "Instagram", tags: ["nuevo"] })}><UsersRound size={14} /> Añadir contacto</button></div><div className="data-counters"><span>{snapshot.workflows} workflows</span><span>{snapshot.contacts} contactos</span><span>{snapshot.executions} ejecuciones</span><span>{snapshot.conversations} conversaciones</span></div><div className="review-queue" role="status"><strong>Revisión IA</strong>{reviewQueue.data?.length ? reviewQueue.data.map(({ conversation, contact }) => <span key={conversation.id}>{contact.name} · {conversation.lastIntent ?? "otro"}<button onClick={() => resolveReview.mutate({ conversationId: conversation.id })}>Resolver</button></span>) : <span>Sin conversaciones pendientes de revisión manual.</span>}</div><div className="data-export-row"><label className="search-box small"><span className="sr-only">Filtrar contactos persistentes</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar contactos persistentes…" /></label><select className="filter-button" value={leadStatus} onChange={(event) => setLeadStatus(event.target.value)}><option>Todos</option><option>Nuevo</option><option>Caliente</option><option>En seguimiento</option><option>Convertido</option></select><button className="filter-button" onClick={() => downloadCsv("contactos-filtrados.csv", exportedContacts)}><Download size={14} /> Contactos CSV</button><button className="filter-button" onClick={() => downloadCsv("metricas-dashboard.csv", [{ fecha: new Date().toISOString(), ...snapshot }])}><Download size={14} /> Métricas CSV</button></div></section>;
}
