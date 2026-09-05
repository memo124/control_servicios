export function replaceTemplateVars(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, val] of Object.entries(variables)) {
    result = result.split(`{{${key}}}`).join(val);
  }
  return result;
}
