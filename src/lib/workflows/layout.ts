import type { Edge, Node } from "@xyflow/react";
import type { FunnelChannel } from "@/generated/prisma/client";
import { buildDefaultNodeData } from "./node-catalog";
import type { WorkflowEdgeBranchLabel, WorkflowGraph, WorkflowNodeData } from "./types";

const NODE_START_Y = 80;
const NODE_GAP_Y = 180;
/** Horizontal gap between sibling branch columns (must exceed node width). */
const BRANCH_UNIT_X = 400;
export const NODE_WIDTH = 320;

export function createNodeId() {
  return `step_${crypto.randomUUID().slice(0, 8)}`;
}

export function createEdgeId(source: string, target: string, branchLabel: WorkflowEdgeBranchLabel) {
  return `edge_${source}_${branchLabel}_${target}`;
}

export function getEdgeBranchLabel(edge: Edge): WorkflowEdgeBranchLabel {
  const data = edge.data as { branchLabel?: WorkflowEdgeBranchLabel } | undefined;
  if (data?.branchLabel) return data.branchLabel;
  if (edge.sourceHandle === "yes") return "yes";
  if (edge.sourceHandle === "no") return "no";
  return "default";
}

export function createBranchEdge(
  source: string,
  target: string,
  branchLabel: WorkflowEdgeBranchLabel = "default",
): Edge {
  const sourceHandle = branchLabel === "default" ? undefined : branchLabel;
  return {
    id: createEdgeId(source, target, branchLabel),
    source,
    target,
    sourceHandle,
    type: "addStep",
    data: { sourceId: source, branchLabel },
    animated: branchLabel !== "default",
    label: branchLabel === "default" ? undefined : branchLabel === "yes" ? "Yes" : "No",
    labelStyle: { fill: branchLabel === "yes" ? "#059669" : "#dc2626", fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
  };
}

type LayoutBounds = { left: number; right: number };

function getOrderedOutgoingTargets(
  nodeId: string,
  edges: Edge[],
  nodeById: Map<string, Node<WorkflowNodeData>>,
): string[] {
  const outgoing = edges.filter((e) => e.source === nodeId);
  const isCondition = nodeById.get(nodeId)?.data.stepType === "condition";
  const yesEdge = outgoing.find((e) => getEdgeBranchLabel(e) === "yes");
  const noEdge = outgoing.find((e) => getEdgeBranchLabel(e) === "no");
  const defaultEdges = outgoing.filter((e) => getEdgeBranchLabel(e) === "default");

  if (isCondition && (yesEdge || noEdge)) {
    return [yesEdge?.target, noEdge?.target].filter(Boolean) as string[];
  }

  return defaultEdges.map((e) => e.target);
}

/** Tree layout: Yes/No branches get separate columns; parent centers over children. */
export function layoutBranchGraph(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
): Node<WorkflowNodeData>[] {
  if (nodes.length === 0) return nodes;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const start =
    nodes.find((n) => n.data.stepType === "trigger") ??
    [...nodes].sort((a, b) => a.position.y - b.position.y)[0]!;

  const positions = new Map<string, { x: number; y: number }>();
  const visited = new Set<string>();
  let leafCursor = 0;

  function layoutSubtree(nodeId: string, depth: number): LayoutBounds {
    const existing = positions.get(nodeId);
    if (visited.has(nodeId) && existing) {
      return { left: existing.x, right: existing.x + NODE_WIDTH };
    }

    const children = getOrderedOutgoingTargets(nodeId, edges, nodeById);
    const y = NODE_START_Y + depth * NODE_GAP_Y;

    if (children.length === 0) {
      const x = leafCursor;
      leafCursor += BRANCH_UNIT_X;
      positions.set(nodeId, { x, y });
      visited.add(nodeId);
      return { left: x, right: x + NODE_WIDTH };
    }

    const childBounds = children.map((childId) => layoutSubtree(childId, depth + 1));
    const left = Math.min(...childBounds.map((b) => b.left));
    const right = Math.max(...childBounds.map((b) => b.right));
    const x = (left + right) / 2 - NODE_WIDTH / 2;

    positions.set(nodeId, { x, y });
    visited.add(nodeId);
    return {
      left: Math.min(left, x),
      right: Math.max(right, x + NODE_WIDTH),
    };
  }

  layoutSubtree(start.id, 0);

  let orphanX = leafCursor;
  for (const node of nodes) {
    if (!positions.has(node.id)) {
      positions.set(node.id, { x: orphanX, y: node.position.y || NODE_START_Y });
      orphanX += BRANCH_UNIT_X;
    }
  }

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }));
}

/** Re-layout when a condition's Yes/No targets sit on top of each other. */
export function graphNeedsAutoLayout(
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    if (node.data.stepType !== "condition") continue;

    const yesEdge = edges.find(
      (e) => e.source === node.id && getEdgeBranchLabel(e) === "yes",
    );
    const noEdge = edges.find(
      (e) => e.source === node.id && getEdgeBranchLabel(e) === "no",
    );
    if (!yesEdge || !noEdge) continue;

    const yesNode = byId.get(yesEdge.target);
    const noNode = byId.get(noEdge.target);
    if (!yesNode || !noNode) continue;

    const dx = Math.abs(yesNode.position.x - noNode.position.x);
    if (dx < NODE_WIDTH / 2) return true;
  }

  return false;
}

export function chainNodes(nodes: Node<WorkflowNodeData>[]): Edge[] {
  const sorted = [...nodes].sort((a, b) => a.position.y - b.position.y);
  const edges: Edge[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const source = sorted[i]!.id;
    const target = sorted[i + 1]!.id;
    edges.push(createBranchEdge(source, target, "default"));
  }

  return edges;
}

export function normalizeGraphEdges(graph: WorkflowGraph): Edge[] {
  if (graph.edges.length > 0) {
    return graph.edges.map((edge) => {
      const branchLabel = getEdgeBranchLabel(edge);
      return {
        ...edge,
        type: edge.type ?? "addStep",
        sourceHandle: branchLabel === "default" ? undefined : branchLabel,
        data: { ...(edge.data as object), sourceId: edge.source, branchLabel },
        label:
          branchLabel === "default"
            ? edge.label
            : branchLabel === "yes"
              ? "Yes"
              : branchLabel === "no"
                ? "No"
                : edge.label,
      };
    });
  }
  return chainNodes(graph.nodes as Node<WorkflowNodeData>[]);
}

export function insertNodeAfter(
  graph: WorkflowGraph,
  afterNodeId: string | null,
  newNode: Node<WorkflowNodeData>,
  options?: { branchLabel?: WorkflowEdgeBranchLabel },
): WorkflowGraph {
  const branchLabel = options?.branchLabel ?? "default";
  let nodes = [...graph.nodes];
  let edges = normalizeGraphEdges(graph);

  if (!afterNodeId) {
    nodes.push(newNode);
    const start = nodes.find((n) => n.data.stepType === "trigger");
    if (start && start.id !== newNode.id) {
      edges.push(createBranchEdge(start.id, newNode.id, "default"));
    }
  } else {
    const sourceNode = nodes.find((n) => n.id === afterNodeId);
    const isCondition = sourceNode?.data.stepType === "condition";

    const existingEdge = edges.find((e) => {
      if (e.source !== afterNodeId) return false;
      if (isCondition) return getEdgeBranchLabel(e) === branchLabel;
      return getEdgeBranchLabel(e) === "default";
    });

    nodes.push(newNode);

    if (existingEdge) {
      const oldTarget = existingEdge.target;
      edges = edges.filter((e) => e.id !== existingEdge.id);
      edges.push(createBranchEdge(afterNodeId, newNode.id, branchLabel));
      if (newNode.data.stepType === "condition") {
        // Continue the main path on Yes; No is added separately from the config panel.
        edges.push(createBranchEdge(newNode.id, oldTarget, "yes"));
      } else {
        edges.push(createBranchEdge(newNode.id, oldTarget, "default"));
      }
    } else {
      edges.push(createBranchEdge(afterNodeId, newNode.id, branchLabel));
    }
  }

  const laidOut = layoutBranchGraph(nodes, edges);
  return {
    ...graph,
    nodes: laidOut,
    edges,
  };
}

export function removeNode(graph: WorkflowGraph, nodeId: string): WorkflowGraph {
  const edges = normalizeGraphEdges(graph);
  const incoming = edges.filter((e) => e.target === nodeId);
  const outgoing = edges.filter((e) => e.source === nodeId);

  let nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);

  for (const inc of incoming) {
    for (const out of outgoing) {
      if (getEdgeBranchLabel(out) === "default") {
        nextEdges.push(
          createBranchEdge(inc.source, out.target, getEdgeBranchLabel(inc)),
        );
      }
    }
  }

  const without = graph.nodes.filter(
    (n) => n.id !== nodeId && n.data.stepType !== "trigger",
  );
  const trigger = graph.nodes.find((n) => n.data.stepType === "trigger");
  const nextNodes = trigger ? [trigger, ...without] : without;

  const laidOut = layoutBranchGraph(nextNodes as Node<WorkflowNodeData>[], nextEdges);
  return {
    ...graph,
    nodes: laidOut,
    edges: nextEdges,
  };
}

export function createDefaultGraph(channelType: FunnelChannel = "GENERIC"): WorkflowGraph {
  const triggerId = createNodeId();
  const waitId = createNodeId();

  const nodes: Node<WorkflowNodeData>[] = [
    {
      id: triggerId,
      type: "workflowStep",
      position: { x: 0, y: NODE_START_Y },
      data: buildDefaultNodeData("trigger", channelType),
      draggable: true,
    },
    {
      id: waitId,
      type: "workflowStep",
      position: { x: 0, y: NODE_START_Y + NODE_GAP_Y },
      data: buildDefaultNodeData("wait", channelType),
      draggable: true,
    },
  ];

  const edges = [createBranchEdge(triggerId, waitId, "default")];
  return {
    nodes: layoutBranchGraph(nodes, edges),
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function parseWorkflowGraph(raw: unknown): WorkflowGraph | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as WorkflowGraph;
  if (!Array.isArray(g.nodes) || !Array.isArray(g.edges)) return null;
  return {
    ...g,
    edges: normalizeGraphEdges(g),
  };
}

export function graphToSteps(graph: WorkflowGraph) {
  return [...graph.nodes]
    .sort((a, b) => a.position.y - b.position.y)
    .map((node) => ({
      id: node.id,
      stepType: node.data.stepType,
      label: node.data.label,
      subtitle: node.data.subtitle,
      config: node.data.config,
    }));
}

export const WORKFLOW_NODE_WIDTH = NODE_WIDTH;

export function findNextNodeId(
  graph: WorkflowGraph,
  nodeId: string,
  branch?: WorkflowEdgeBranchLabel,
): string | undefined {
  const edges = graph.edges.filter((e) => e.source === nodeId);
  if (edges.length === 0) return undefined;

  if (branch && branch !== "default") {
    const match = edges.find((e) => getEdgeBranchLabel(e) === branch);
    return match?.target;
  }

  const defaultEdge =
    edges.find((e) => getEdgeBranchLabel(e) === "default") ?? edges[0];
  return defaultEdge?.target;
}
