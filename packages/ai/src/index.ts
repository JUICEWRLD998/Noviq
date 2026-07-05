// @noviq/ai — OpenRouter/Gemini clients for the three Noviq roles.
//   Compiler  (NL covenant → validated policy)
//   Agent     (goal → next action; intentionally injectable)
//   Auditor   (guard events → compliance narrative)

export { MODELS, type ModelRole } from "./models"
export {
  OpenRouterClient,
  OpenRouterError,
  type ChatMessage,
  type ChatRole,
  type OpenRouterOptions,
  type CompleteParams,
  type CompleteJsonParams,
} from "./openrouter"
export { compileCovenant, type CompileContext, type CompileResult } from "./compiler"
export { proposeAction, type AgentState, type ProposedAction } from "./agent"
export { auditActions, type AuditEvent, type AuditReport } from "./auditor"
