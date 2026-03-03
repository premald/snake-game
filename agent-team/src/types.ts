export type JsonSchema = {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  description?: string;
  enum?: string[];
};

export type JsonObjectSchema = JsonSchema & { type: "object" };

export type ToolSpec = {
  name: string;
  description: string;
  inputSchema: JsonObjectSchema;
  riskTier: "read" | "write" | "side_effect" | "deploy";
};

export type ToolCall = {
  toolName: string;
  input: Record<string, unknown>;
};

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

export type AgentSpec = {
  name: string;
  role: string;
  summary: string;
  handoffTargets: string[];
};

export type TeamConfig = {
  defaultModel: string;
  temperature: number;
};

export type ToolPermissions = {
  autoApprove: string[];
  requireApproval: string[];
};
