"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { WorkflowStepNode } from "./workflow-step-node";
import { AddStepEdge } from "./add-step-edge";
import { StepPickerPanel } from "./step-picker-panel";
import { Button } from "@/components/ui/button";
import { saveWorkflowGraph } from "@/lib/actions/workflows";
import { buildDefaultNodeData } from "@/lib/workflows/node-catalog";
import {
  CONDITION_PRESETS,
  conditionPresetSubtitle,
  type ConditionPreset,
} from "@/lib/workflows/condition-presets";
import {
  createNodeId,
  getEdgeBranchLabel,
  graphNeedsAutoLayout,
  insertNodeAfter,
  layoutBranchGraph,
  normalizeGraphEdges,
  removeNode,
} from "@/lib/workflows/layout";
import type { FunnelChannel } from "@/generated/prisma/client";
import type {
  WorkflowEdgeBranchLabel,
  WorkflowGraph,
  WorkflowNodeData,
  WorkflowStepType,
} from "@/lib/workflows/types";
import { Loader2, Save, LayoutGrid } from "lucide-react";

const nodeTypes = { workflowStep: WorkflowStepNode };
const edgeTypes = { addStep: AddStepEdge };

export function WorkflowBuilder({
  workflowId,
  workflowName,
  channelType,
  initialGraph,
}: {
  workflowId: string;
  workflowName: string;
  channelType: FunnelChannel;
  initialGraph: WorkflowGraph;
}) {
  const normalizedInitial = useMemo(() => {
    const edges = normalizeGraphEdges(initialGraph);
    const nodes = initialGraph.nodes as Node<WorkflowNodeData>[];
    const laidOutNodes = graphNeedsAutoLayout(nodes, edges)
      ? layoutBranchGraph(nodes, edges)
      : nodes;
    return { ...initialGraph, edges, nodes: laidOutNodes };
  }, [initialGraph]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>(
    normalizedInitial.nodes as Node<WorkflowNodeData>[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(normalizedInitial.edges);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
  const [insertBranchLabel, setInsertBranchLabel] =
    useState<WorkflowEdgeBranchLabel>("default");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const syncFromGraph = useCallback(
    (graph: WorkflowGraph) => {
      setNodes(graph.nodes as Node<WorkflowNodeData>[]);
      setEdges(graph.edges);
    },
    [setNodes, setEdges],
  );

  const getGraph = useCallback((): WorkflowGraph => {
    const normalizedEdges = normalizeGraphEdges({ nodes, edges } as WorkflowGraph);
    return {
      nodes: nodes as Node<WorkflowNodeData>[],
      edges: normalizedEdges,
      viewport: initialGraph.viewport,
    };
  }, [nodes, edges, initialGraph.viewport]);

  const handleAddStep = useCallback(
    (stepType: WorkflowStepType) => {
      const newNode: Node<WorkflowNodeData> = {
        id: createNodeId(),
        type: "workflowStep",
        position: { x: 0, y: 0 },
        data: buildDefaultNodeData(stepType, channelType),
        draggable: true,
      };

      const graph = insertNodeAfter(getGraph(), insertAfterId, newNode, {
        branchLabel: insertBranchLabel,
      });
      syncFromGraph(graph);
      setPickerOpen(false);
      setInsertAfterId(null);
      setInsertBranchLabel("default");
    },
    [channelType, getGraph, insertAfterId, insertBranchLabel, syncFromGraph],
  );

  useEffect(() => {
    function onAddStep(e: Event) {
      const detail = (e as CustomEvent<{ afterNodeId?: string; branchLabel?: WorkflowEdgeBranchLabel }>)
        .detail;
      setInsertAfterId(detail.afterNodeId ?? null);
      setInsertBranchLabel(detail.branchLabel ?? "default");
      setPickerOpen(true);
    }

    function onDeleteNode(e: Event) {
      const detail = (e as CustomEvent<{ nodeId?: string }>).detail;
      if (!detail.nodeId) return;
      const graph = removeNode(getGraph(), detail.nodeId);
      syncFromGraph(graph);
    }

    window.addEventListener("workflow:add-step", onAddStep);
    window.addEventListener("workflow:delete-node", onDeleteNode);
    return () => {
      window.removeEventListener("workflow:add-step", onAddStep);
      window.removeEventListener("workflow:delete-node", onDeleteNode);
    };
  }, [getGraph, syncFromGraph]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    const graph = getGraph();
    const result = await saveWorkflowGraph(workflowId, JSON.stringify(graph));
    setSaving(false);
    setSaveMessage(result.ok ? "Saved" : result.error ?? "Save failed");
    if (result.ok) setTimeout(() => setSaveMessage(null), 2500);
  }

  function handleAutoArrange() {
    const normalizedEdges = normalizeGraphEdges({ nodes, edges } as WorkflowGraph);
    setNodes(layoutBranchGraph(nodes as Node<WorkflowNodeData>[], normalizedEdges));
  }

  const defaultViewport = useMemo(
    () => initialGraph.viewport ?? { x: 0, y: 0, zoom: 1 },
    [initialGraph.viewport],
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) as
    | Node<WorkflowNodeData>
    | undefined;

  return (
    <div className="relative h-[calc(100vh-8rem)] min-h-[560px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        defaultViewport={defaultViewport}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        minZoom={0.4}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        zoomOnScroll
        className="workflow-canvas"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
        <Controls showInteractive={false} className="!rounded-lg !border-slate-200 !shadow-sm" />
        <MiniMap
          nodeColor="#e2e8f0"
          maskColor="rgb(241 245 249 / 0.8)"
          className="!rounded-lg !border-slate-200"
        />

        <Panel position="top-left" className="!m-4">
          <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold text-slate-900">{workflowName}</p>
            <p className="text-xs text-slate-500">
              Drag steps freely · Condition steps branch Yes (left) / No (right)
            </p>
          </div>
        </Panel>

        <Panel position="top-right" className="!m-4 flex items-center gap-2">
          {saveMessage && (
            <span className="text-xs font-medium text-emerald-600">{saveMessage}</span>
          )}
          <Button type="button" variant="outline" size="sm" onClick={handleAutoArrange}>
            <LayoutGrid className="h-4 w-4" />
            Auto-arrange
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save workflow
          </Button>
        </Panel>
      </ReactFlow>

      {pickerOpen && (
        <StepPickerPanel
          onSelect={handleAddStep}
          onClose={() => {
            setPickerOpen(false);
            setInsertAfterId(null);
            setInsertBranchLabel("default");
          }}
        />
      )}

      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          edges={edges}
          onClose={() => setSelectedNodeId(null)}
          onUpdate={(updated) => {
            setNodes((nds) =>
              nds.map((n) => (n.id === updated.id ? { ...n, data: updated.data } : n)),
            );
          }}
          onAddBranchStep={(branchLabel) => {
            setInsertAfterId(selectedNode.id);
            setInsertBranchLabel(branchLabel);
            setPickerOpen(true);
          }}
        />
      )}
    </div>
  );
}

function NodeConfigPanel({
  node,
  edges,
  onClose,
  onUpdate,
  onAddBranchStep,
}: {
  node: Node<WorkflowNodeData>;
  edges: Edge[];
  onClose: () => void;
  onUpdate: (node: Node<WorkflowNodeData>) => void;
  onAddBranchStep: (branchLabel: "yes" | "no") => void;
}) {
  const { data } = node;
  const hasYesBranch = edges.some(
    (e) => e.source === node.id && getEdgeBranchLabel(e) === "yes",
  );
  const hasNoBranch = edges.some(
    (e) => e.source === node.id && getEdgeBranchLabel(e) === "no",
  );

  function updateField(field: keyof WorkflowNodeData["config"], value: string | number) {
    const config = { ...data.config, [field]: value };
    let subtitle = data.subtitle;

    if (data.stepType === "wait" && field === "waitSeconds") {
      subtitle = `Wait ${value} seconds`;
    }
    if (data.stepType === "wait" && field === "waitMode") {
      subtitle =
        value === "event"
          ? `Wait until ${data.config.waitEvent ?? "replied"}`
          : `Wait ${data.config.waitSeconds ?? 30} seconds`;
    }
    if (data.stepType === "wait" && field === "waitEvent") {
      subtitle = `Wait until ${value}`;
    }
    if (data.stepType === "condition" && field === "conditionMode") {
      subtitle =
        value === "wait"
          ? `Wait until ${data.config.conditionPreset ?? "replied"}`
          : conditionPresetSubtitle(
              (data.config.conditionPreset as ConditionPreset) ?? "replied",
              data.config,
            );
    }
    if (data.stepType === "add_tag" && field === "tag") {
      subtitle = `Add tag: ${value}`;
    }
    if (data.stepType === "ai_reply" && field === "aiModel") {
      subtitle = `${value} respond`;
    }
    if (data.stepType === "condition" && field === "conditionPreset") {
      subtitle = conditionPresetSubtitle(value as ConditionPreset, config);
    }
    if (data.stepType === "condition" && (field === "conditionValue" || field === "conditionField")) {
      subtitle = conditionPresetSubtitle(
        (config.conditionPreset as ConditionPreset) ?? "custom",
        config,
      );
    }

    onUpdate({
      ...node,
      data: { ...data, config, subtitle },
    });
  }

  return (
    <div className="absolute bottom-4 right-4 z-10 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Edit step</p>
        <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-800">
          Close
        </button>
      </div>

      {data.stepType === "condition" && (
        <div className="space-y-3">
          <label className="block text-xs text-slate-600">
            Branch condition
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={data.config.conditionPreset ?? "replied"}
              onChange={(e) => updateField("conditionPreset", e.target.value)}
            >
              {CONDITION_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-slate-500">
            {CONDITION_PRESETS.find((p) => p.value === data.config.conditionPreset)?.description ??
              "Routes to Yes or No path based on prospect data."}
          </p>

          {(data.config.conditionPreset === "tag" ||
            data.config.conditionPreset === "lifecycleStage" ||
            data.config.conditionPreset === "custom") && (
            <>
              {data.config.conditionPreset === "custom" && (
                <label className="block text-xs text-slate-600">
                  Field
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    value={data.config.conditionField ?? ""}
                    onChange={(e) => updateField("conditionField", e.target.value)}
                  />
                </label>
              )}
              <label className="block text-xs text-slate-600">
                Value
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={data.config.conditionValue ?? ""}
                  onChange={(e) => updateField("conditionValue", e.target.value)}
                />
              </label>
            </>
          )}

          {(data.config.conditionPreset === "link_clicked" ||
            data.config.conditionPreset === "replied") && (
            <label className="block text-xs text-slate-600">
              Evaluation
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={data.config.conditionMode ?? "instant"}
                onChange={(e) => updateField("conditionMode", e.target.value)}
              >
                <option value="instant">Check once (route to No if not met)</option>
                <option value="wait">Wait until event (then re-check)</option>
              </select>
            </label>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-700">Branch paths</p>
            {!hasYesBranch && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => onAddBranchStep("yes")}
              >
                + Add Yes path step
              </Button>
            )}
            {!hasNoBranch && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => onAddBranchStep("no")}
              >
                + Add No path step
              </Button>
            )}
            {hasYesBranch && hasNoBranch && (
              <p className="text-[11px] text-slate-500">
                Both branches connected. Use + on the green/red connectors to add more steps.
              </p>
            )}
          </div>
        </div>
      )}

      {data.stepType === "wait" && (
        <div className="space-y-3">
          <label className="block text-xs text-slate-600">
            Wait type
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={data.config.waitMode ?? "delay"}
              onChange={(e) => updateField("waitMode", e.target.value)}
            >
              <option value="delay">Time delay</option>
              <option value="event">Wait for event</option>
            </select>
          </label>

          {(data.config.waitMode ?? "delay") === "delay" ? (
            <label className="block text-xs text-slate-600">
              Wait (seconds)
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={data.config.waitSeconds ?? 30}
                onChange={(e) => updateField("waitSeconds", Number(e.target.value))}
              />
            </label>
          ) : (
            <>
              <label className="block text-xs text-slate-600">
                Wait until
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={data.config.waitEvent ?? "replied"}
                  onChange={(e) => updateField("waitEvent", e.target.value)}
                >
                  <option value="replied">Prospect replies</option>
                  <option value="link_clicked">Promotion link clicked</option>
                </select>
              </label>
              <label className="block text-xs text-slate-600">
                Timeout (seconds, optional)
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={data.config.waitTimeoutSeconds ?? 604800}
                  onChange={(e) => updateField("waitTimeoutSeconds", Number(e.target.value))}
                />
              </label>
              <p className="text-[11px] text-slate-500">
                Use tracked links from the campaign page for link-click events.
              </p>
            </>
          )}
        </div>
      )}

      {data.stepType === "ai_reply" && (
        <div className="space-y-2">
          <label className="block text-xs text-slate-600">
            AI model
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={data.config.aiModel ?? "gpt-4o-mini"}
              onChange={(e) => updateField("aiModel", e.target.value)}
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="claude-sonnet">Claude Sonnet</option>
              <option value="gemini-pro">Gemini Pro</option>
              <option value="deepseek-chat">DeepSeek Chat</option>
            </select>
          </label>
          <label className="block text-xs text-slate-600">
            Prompt
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={data.config.prompt ?? ""}
              onChange={(e) => updateField("prompt", e.target.value)}
            />
          </label>
        </div>
      )}

      {data.stepType === "add_tag" && (
        <label className="block text-xs text-slate-600">
          Tag name
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={data.config.tag ?? ""}
            onChange={(e) => updateField("tag", e.target.value)}
          />
        </label>
      )}

      {(data.stepType === "sms" || data.stepType === "email") && (
        <label className="block text-xs text-slate-600">
          Message
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={data.config.message ?? ""}
            onChange={(e) => updateField("message", e.target.value)}
          />
        </label>
      )}

      {data.stepType === "human_call" && (
        <label className="block text-xs text-slate-600">
          Assign to
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={data.config.assignTo ?? ""}
            onChange={(e) => updateField("assignTo", e.target.value)}
          />
        </label>
      )}

      {data.stepType === "trigger" && (
        <p className="text-xs text-slate-500">Entry trigger is set by funnel channel type.</p>
      )}

      {!["wait", "ai_reply", "add_tag", "sms", "email", "human_call", "trigger", "condition"].includes(
        data.stepType,
      ) && (
        <label className="block text-xs text-slate-600">
          Label
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={data.label}
            onChange={(e) => onUpdate({ ...node, data: { ...data, label: e.target.value } })}
          />
        </label>
      )}
    </div>
  );
}
