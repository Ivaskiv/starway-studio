// packages/frontend/src/pages/user/Builder.tsx

import { useState, useCallback } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';

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
} from 'lucide-react';

import { Button } from '@starway-studio/shared/ui/Button';

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

interface FunnelNodeData {
  label: string;
  type: string;
  icon: any;
  description?: string;
}

type FunnelNode = Node<FunnelNodeData>;

// ───────────────────────────────────────────────
// Node palette
// ───────────────────────────────────────────────

const nodeTypesPalette = [
  { 
    type: 'trigger', 
    label: 'Тригер', 
    icon: Zap, 
    gradient: 'bg-gradient-orange',
    description: 'Початок воронки' 
  },
  { 
    type: 'email', 
    label: 'Email', 
    icon: Mail, 
    gradient: 'bg-gradient-blue',
    description: 'Відправити лист' 
  },
  { 
    type: 'telegram', 
    label: 'Telegram', 
    icon: MessageCircle, 
    gradient: 'bg-gradient-blue',
    description: 'Telegram повідомлення' 
  },
  { 
    type: 'payment', 
    label: 'Оплата', 
    icon: CreditCard, 
    gradient: 'bg-gradient-green',
    description: 'WayForPay чекаут' 
  },
  { 
    type: 'gift', 
    label: 'Подарунок', 
    icon: Gift, 
    gradient: 'bg-gradient-orange',
    description: 'Видати доступ' 
  },
  { 
    type: 'segment', 
    label: 'Сегмент', 
    icon: Users, 
    gradient: 'bg-gradient-orange',
    description: 'Розділити аудиторію' 
  },
  { 
    type: 'notify', 
    label: 'Нагадування', 
    icon: Bell, 
    gradient: 'bg-gradient-orange',
    description: 'Push нотифікація' 
  },
];

// ───────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────

export default function Builder() {
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
        background: 'linear-gradient(135deg, rgb(249, 115, 22), rgb(239, 68, 68))',
        color: 'white',
        borderRadius: '16px',
        padding: '16px',
        fontWeight: 'bold',
        minWidth: '200px',
        border: 'none',
        boxShadow: '0 8px 32px rgba(249, 115, 22, 0.3)',
      },
    },
  ]);

  const [edges, setEdges] = useState<Edge[]>([]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(nds => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(eds => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges(eds =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: 'rgb(249, 115, 22)', strokeWidth: 2 },
          },
          eds
        )
      ),
    []
  );

  const addNode = (type: typeof nodeTypesPalette[number]) => {
    const id = crypto.randomUUID();

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
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        color: 'white',
        borderRadius: '16px',
        padding: '14px',
        minWidth: '180px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
      },
    };

    setNodes(nds => [...nds, newNode]);
  };

  const saveFunnel = () => {
    console.log('[Builder] save funnel', { nodes, edges });
    alert('Воронка збережена ✅');
  };

  const exportFunnel = () => {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `funnel-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 p-6">
      {/* Sidebar */}
      <div className="w-64 glass-card p-4 space-y-4 overflow-y-auto scrollbar-hide">
        <h3 className="font-bold text-lg text-white mb-4">Блоки воронки</h3>

        {nodeTypesPalette.map(type => {
          const Icon = type.icon;
          return (
            <button
              key={type.type}
              onClick={() => addNode(type)}
              className={`w-full p-4 rounded-xl ${type.gradient} hover:scale-105 transition-all text-left shadow-lg`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon size={20} className="text-white" />
                <span className="font-bold text-white">{type.label}</span>
              </div>
              <p className="text-xs text-white/80">{type.description}</p>
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <div className="flex-1 glass-card overflow-hidden">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            style={{
              background: 'transparent',
            }}
          >
            <MiniMap 
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(10px)',
              }}
            />
            <Controls 
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
              }}
            />
            <Background 
              gap={16} 
              color="rgba(255, 255, 255, 0.1)"
            />

            <Panel position="top-right" className="flex gap-2">
              <Button onClick={saveFunnel} variant="primary" className="gradient-button">
                <Save size={16} className="mr-2" />
                Зберегти
              </Button>
              <Button variant="ghost" onClick={exportFunnel} className="glass-button">
                <Download size={16} className="mr-2" />
                Експорт
              </Button>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}