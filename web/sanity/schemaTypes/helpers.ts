// Minimal stand-ins for `sanity`'s `defineType`/`defineField`. See README.md
// for why these are hand-rolled instead of depending on the `sanity`
// package from this repo. Shape-compatible with real Studio schema JSON —
// these are identity functions, kept loose on purpose.

export interface SchemaField {
  name: string;
  title: string;
  type: string;
  description?: string;
  validation?: unknown;
  options?: Record<string, unknown>;
  of?: unknown[];
  fields?: SchemaField[];
  to?: { type: string }[];
  hidden?: unknown;
  [key: string]: unknown;
}

export interface SchemaDefinition extends SchemaField {
  title: string;
  type: 'document' | 'object' | 'array';
}

export function defineField(field: SchemaField): SchemaField {
  return field;
}

export function defineType(type: SchemaDefinition): SchemaDefinition {
  return type;
}
