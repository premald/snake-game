import { ToolSpec } from "../types";
import { readTools } from "./read_tools";
import { writeTools } from "./write_tools";
import { customTools } from "./custom_tools";

export const toolRegistry: ToolSpec[] = [
  ...readTools,
  ...writeTools,
  ...customTools,
];

export function getToolSpec(name: string): ToolSpec | undefined {
  return toolRegistry.find((tool) => tool.name === name);
}
