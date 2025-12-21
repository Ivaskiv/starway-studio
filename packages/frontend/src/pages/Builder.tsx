// src/pages/funnels/Builder.tsx
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
} from 'reactflow'
import type { 
  Node, 
  Edge, 
  Connection, 
  NodeChange, 
  EdgeChange, 
  OnNodesChange, 
  OnEdgesChange 
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  Plus, Save, Download, Zap, Mail, MessageCircle, 
  CreditCard, Gift, Users, Bell
} from 'lucide-react'
import { Button } from '../components/ui/Button'

interface FunnelNode extends Node {
  data: { 
    label: string
    type: string
    icon: any
    description?: string
  }
}

// Доступні типи блоків для воронки
const nodeTypes = [
  { 
    type: 'trigger', 
    label: 'Тригер', 
    icon: Zap, 
    color: 'from-yellow-500 to-orange-500',
    description: 'Початок воронки'
  },
  { 
    type: 'email', 
    label: 'Email', 
    icon: Mail, 
    color: 'from-blue-500 to-cyan-500',
    description: 'Відправити лист'
  },
  { 
    type: 'telegram', 
    label: 'Telegram', 
    icon: MessageCircle, 
    color: 'from-sky-500 to-blue-500',
    description: 'Telegram повідомлення'
  },
  { 
    type: 'payment', 
    label: 'Оплата', 
    icon: CreditCard, 
    color: 'from-green-500 to-emerald-500',
    description: 'WayForPay чекаут'
  },
  { 
    type: 'gift', 
    label: 'Подарунок', 
    icon: Gift, 
    color: 'from-pink-500 to-rose-500',
    description: 'Видати доступ'
  },
  { 
    type: 'segment', 
    label: 'Сегмент', 
    icon: Users, 
    color: 'from-purple-500 to-pink-500',
    description: 'Розділити аудиторію'
  },
  { 
    type: 'notify', 
    label: 'Нагадування', 
    icon: Bell, 
    color: 'from-orange-500 to-red-500',
    description: 'Push нотифікація'
  }
]

export default function Builder() {
  const [nodes, setNodes] = useState<FunnelNode[]>([
    { 
      id: '1', 
      type: 'input', 
      data: { 
        label: '🚀 Старт воронки', 
        type: 'trigger',
        icon: Zap 
      }, 
      position: { x: 250, y: 50 },
      style: {
        background: 'linear-gradient(135deg, #f59e0b, #f97316)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        padding: '16px',
        fontWeight: 'bold',
        minWidth: '200px'
      }
    }
  ])
  
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null)

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#f97316', strokeWidth: 2 }
    }, eds)),
    []
  )

  // Додати новий блок
  const addNode = (type: typeof nodeTypes[0]) => {
    const id = `${Date.now()}`
    const newNode: FunnelNode = {
      id,
      type: 'default',
      data: {
        label: type.label,
        type: type.type,
        icon: type.icon,
        description: type.description
      },
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 200
      },
      style: {
        background: `linear-gradient(135deg, ${type.color.split(' ')[0].replace('from-', '#')})`,
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '180px'
      }
    }
    
    setNodes((nds) => [...nds, newNode])
  }

  // Зберегти воронку
  const saveFunnel = () => {
    const funnelData = {
      nodes,
      edges,
      createdAt: new Date().toISOString()
    }
    console.log('Saving funnel:', funnelData)
    // Тут додамо API виклик
    alert('Воронка збережена! ✅')
  }

  // Експорт в JSON
  const exportFunnel = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `funnel-${Date.now()}.json`
    link.click()
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar з блоками */}
      <div className="w-64 bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4 overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">Блоки воронки</h3>
        
        {nodeTypes.map((type) => {
          const Icon = type.icon
          return (
            <button
              key={type.type}
              onClick={() => addNode(type)}
              className={`w-full p-4 rounded-xl bg-gradient-to-br ${type.color} hover:scale-105 transition text-left group`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon size={20} className="text-white" />
                <span className="font-bold text-white">{type.label}</span>
              </div>
              <p className="text-xs text-white/80">{type.description}</p>
            </button>
          )
        })}
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden relative">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            style={{ background: '#0f172a' }}
          >
            <MiniMap 
              style={{ 
                background: '#1e293b',
                border: '1px solid #334155'
              }}
              maskColor="rgba(0, 0, 0, 0.6)"
            />
            
            <Controls 
              style={{
                background: '#1e293b',
                border: '1px solid #334155'
              }}
            />
            
            <Background 
              color="#334155" 
              gap={16} 
              size={1}
            />

            {/* Панель дій */}
            <Panel position="top-right" className="flex gap-2">
              <Button
                onClick={saveFunnel}
                variant="success"
                className="flex items-center gap-2"
                aria-label="Зберегти воронку"
              >
                <Save size={16} />
                Зберегти
              </Button>
              
              <Button
                onClick={exportFunnel}
                variant="secondary"
                className="flex items-center gap-2"
                aria-label="Експортувати воронку"
              >
                <Download size={16} />
                Експорт
              </Button>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>

        {/* Підказка */}
        {nodes.length === 1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 text-center max-w-md">
              <Zap size={48} className="text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Створи свою першу воронку!</h3>
              <p className="text-gray-400">
                Обери блоки зліва та з'єднай їх, щоб створити автоматизацію
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}