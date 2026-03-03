# Tool Contracts

## Tool Call Request Contract

Each tool call follows a JSON object with the following fields:

- `toolName`: string
- `input`: object, must conform to the tool's JSON Schema

Example:

```json
{
  "toolName": "search_docs",
  "input": { "query": "how to authenticate" }
}
```

## Tool Result Contract

Each tool result follows a JSON object with the following fields:

- `ok`: boolean
- `data`: optional, any JSON-serializable value
- `error`: optional, string

Example success:

```json
{
  "ok": true,
  "data": {
    "results": [
      { "title": "Auth", "path": "docs/auth.md" }
    ]
  }
}
```

Example failure:

```json
{
  "ok": false,
  "error": "Permission denied"
}
```

## Minimum Required Tool Metadata

Each tool must include:

- `name`
- `description`
- `inputSchema` (JSON Schema)
- `riskTier` (read | write | side_effect | deploy)

## Extension Point

Add project-specific tools in `src/tools/custom_tools.ts` and export them as `customTools`.
