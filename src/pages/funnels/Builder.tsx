import { useState, useCallback } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  MiniMap,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow'
import type { Node, Edge, Connection, NodeChange, EdgeChange, OnNodesChange, OnEdgesChange } from 'reactflow'
import 'reactflow/dist/style.css'
import './Builder.scss'

interface FunnelNode extends Node {
  data: { label: string }
}

export default function Builder() {
  const [nodes, setNodes] = useState<FunnelNode[]>([
    { id: '1', type: 'input', data: { label: 'Старт' }, position: { x: 250, y: 5 } },
  ])
  const [edges, setEdges] = useState<Edge[]>([])

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  )

  return (
    <div className="builder-container">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
