export function resolveCurrentStepLabel(
  graph: unknown,
  currentNodeId: string | null | undefined,
): string | null {
  if (!currentNodeId || !graph || typeof graph !== "object") return null;
  const g = graph as { nodes?: { id: string; data?: { label?: string; subtitle?: string } }[] };
  const node = g.nodes?.find((n) => n.id === currentNodeId);
  if (!node?.data) return null;
  return node.data.subtitle ?? node.data.label ?? null;
}
