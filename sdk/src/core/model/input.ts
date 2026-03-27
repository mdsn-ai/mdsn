export type InputType = "text" | "number" | "boolean" | "choice" | "file" | "json";

export interface InputDefinition {
  id: string;
  block: string;
  name: string;
  type: InputType;
  required: boolean;
  secret: boolean;
  options?: string[];
  schema?: string;
}
