import { useState, useCallback } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  MiniMap,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Panel,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type OnNodesChange,
  type OnEdgesChange,
} from 'reactflow'
// import 'reactflow/dist/style.css'

import {
  Plus,
  Save,
  Download,
  Zap,
  Mail,
  MessageCircle,
  CreditCard,
  Gift,
  Users,
  Bell,
} from 'lucide-react'

import { Button } from '@starway-studio/shared'

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

interface FunnelNodeData {
  label: string
  type: string
  icon: any
  description?: string
}

type FunnelNode = Node<FunnelNodeData>

// ───────────────────────────────────────────────
// Node palette
// ───────────────────────────────────────────────

const nodeTypesPalette = [
  { type: 'trigger', label: 'Тригер', icon: Zap, color: 'from-yellow-500 to-orange-500', description: 'Початок воронки' },
  { type: 'email', label: 'Email', icon: Mail, color: 'from-blue-500 to-cyan-500', description: 'Відправити лист' },
  { type: 'telegram', label: 'Telegram', icon: MessageCircle, color: 'from-sky-500 to-blue-500', description: 'Telegram повідомлення' },
  { type: 'payment', label: 'Оплата', icon: CreditCard, color: 'from-green-500 to-emerald-500', description: 'WayForPay чекаут' },
  { type: 'gift', label: 'Подарунок', icon: Gift, color: 'from-pink-500 to-rose-500', description: 'Видати доступ' },
  { type: 'segment', label: 'Сегмент', icon: Users, color: 'from-purple-500 to-pink-500', description: 'Розділити аудиторію' },
  { type: 'notify', label: 'Нагадування', icon: Bell, color: 'from-orange-500 to-red-500', description: 'Push нотифікація' },
]

// ───────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────

export default function Builder() {
  console.log('[Builder] render')

  const [nodes, setNodes] = useState<FunnelNode[]>([
    {
      id: 'start',
      type: 'input',
      data: {
        label: '🚀 Старт воронки',
        type: 'trigger',
        icon: Zap,
      },
      position: { x: 250, y: 50 },
      style: {
        background: 'linear-gradient(135deg, #f59e0b, #f97316)',
        color: 'white',
        borderRadius: '12px',
        padding: '16px',
        fontWeight: 'bold',
        minWidth: '200px',
        border: 'none',
      },
    },
  ])

  const [edges, setEdges] = useState<Edge[]>([])

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(nds => applyNodeChanges(changes, nds)),
    []
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(eds => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges(eds =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#f97316', strokeWidth: 2 },
          },
          eds
        )
      ),
    []
  )

  const addNode = (type: typeof nodeTypesPalette[number]) => {
    const id = crypto.randomUUID()

    const newNode: FunnelNode = {
      id,
      type: 'default',
      data: {
        label: type.label,
        type: type.type,
        icon: type.icon,
        description: type.description,
      },
      position: {
        x: 200 + Math.random() * 400,
        y: 150 + Math.random() * 300,
      },
      style: {
        background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
        color: 'white',
        borderRadius: '12px',
        padding: '14px',
        minWidth: '180px',
        border: 'none',
      },
    }

    setNodes(nds => [...nds, newNode])
  }

  const saveFunnel = () => {
    console.log('[Builder] save funnel', { nodes, edges })
    alert('Воронка збережена ✅')
  }

  const exportFunnel = () => {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `funnel-${Date.now()}.json`
    a.click()
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4 overflow-y-auto">
        <h3 className="font-bold text-lg">Блоки воронки</h3>

        {nodeTypesPalette.map(type => {
          const Icon = type.icon
          return (
            <button
              key={type.type}
              onClick={() => addNode(type)}
              className={`w-full p-4 rounded-xl bg-gradient-to-br ${type.color} hover:scale-105 transition text-left`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon size={20} />
                <span className="font-bold">{type.label}</span>
              </div>
              <p className="text-xs opacity-80">{type.description}</p>
            </button>
          )
        })}
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
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
            <Background gap={16} />

            <Panel position="top-right" className="flex gap-2">
              <Button onClick={saveFunnel}>
                <Save size={16} /> Зберегти
              </Button>
              <Button variant="secondary" onClick={exportFunnel}>
                <Download size={16} /> Експорт
              </Button>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  )
}
