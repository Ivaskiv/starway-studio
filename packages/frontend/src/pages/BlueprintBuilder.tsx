// /Users/viravira/Documents/starway-studio/packages/frontend/src/pages/admin/WhiteLabel.tsx
// src/pages/admin/FunnelManager.tsx
// import { Button } from '@starway-studio/shared/ui/Button.js'
// import { Input } from '@starway-studio/shared/ui/Input.js'
// import { Select } from '@starway-studio/shared/ui/Select.js'
// import {
//   Copy,
//   DollarSign,
//   Eye,
//   MoreVertical, Play,
//   Plus, Search,
//   Star,
//   Target,
//   Trash2,
//   TrendingUp
// } from 'lucide-react'
// import { useState } from 'react'
// import { Link } from 'react-router-dom'

// interface Funnel {
//   id: string
//   name: string
//   status: 'active' | 'paused' | 'draft' | 'archived'
//   type: 'evergreen' | 'campaign' | 'webinar'
//   stages: number
//   visitors: number
//   conversions: number
//   revenue: number
//   conversion_rate: number
//   created_at: string
//   isFavorite: boolean
// }

// export default function FunnelManager() {
//   const [searchQuery, setSearchQuery] = useState('')
//   const [statusFilter, setStatusFilter] = useState('all')
//   const [typeFilter, setTypeFilter] = useState('all')

//   const [funnels, setFunnels] = useState<Funnel[]>([
//     {
//       id: '1',
//       name: 'Сила свідомості - основна',
//       status: 'active',
//       type: 'evergreen',
//       stages: 5,
//       visitors: 2847,
//       conversions: 623,
//       revenue: 747600,
//       conversion_rate: 21.9,
//       created_at: '2024-01-15',
//       isFavorite: true
//     },
//     {
//       id: '2',
//       name: 'AI-воронки інтенсив',
//       status: 'active',
//       type: 'campaign',
//       stages: 4,
//       visitors: 1923,
//       conversions: 412,
//       revenue: 1030000,
//       conversion_rate: 21.4,
//       created_at: '2024-02-20',
//       isFavorite: true
//     },
//     {
//       id: '3',
//       name: '5 точок опори',
//       status: 'active',
//       type: 'evergreen',
//       stages: 3,
//       visitors: 1456,
//       conversions: 287,
//       revenue: 229600,
//       conversion_rate: 19.7,
//       created_at: '2024-03-10',
//       isFavorite: false
//     },
//     {
//       id: '4',
//       name: 'Вебінар "Telegram автоматизація"',
//       status: 'paused',
//       type: 'webinar',
//       stages: 2,
//       visitors: 847,
//       conversions: 123,
//       revenue: 246000,
//       conversion_rate: 14.5,
//       created_at: '2024-11-01',
//       isFavorite: false
//     }
//   ])

//   const statusOptions = [
//     { value: 'all', label: 'Всі статуси' },
//     { value: 'active', label: 'Активні' },
//     { value: 'paused', label: 'Призупинені' },
//     { value: 'draft', label: 'Чернетки' },
//     { value: 'archived', label: 'Архівовані' }
//   ]

//   const typeOptions = [
//     { value: 'all', label: 'Всі типи' },
//     { value: 'evergreen', label: 'Evergreen' },
//     { value: 'campaign', label: 'Campaign' },
//     { value: 'webinar', label: 'Webinar' }
//   ]

//   const filteredFunnels = funnels.filter(funnel => {
//     if (statusFilter !== 'all' && funnel.status !== statusFilter) return false
//     if (typeFilter !== 'all' && funnel.type !== typeFilter) return false
//     if (searchQuery && !funnel.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
//     return true
//   })

//   const toggleFavorite = (id: string) => {
//     setFunnels(funnels.map(f => 
//       f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
//     ))
//   }

//   const duplicateFunnel = (id: string) => {
//     const funnel = funnels.find(f => f.id === id)
//     if (!funnel) return

//     const newFunnel: Funnel = {
//       ...funnel,
//       id: `${Date.now()}`,
//       name: `${funnel.name} (копія)`,
//       status: 'draft',
//       visitors: 0,
//       conversions: 0,
//       revenue: 0,
//       conversion_rate: 0
//     }
//     setFunnels([...funnels, newFunnel])
//   }

//   const deleteFunnel = (id: string) => {
//     if (confirm('Видалити цю воронку?')) {
//       setFunnels(funnels.filter(f => f.id !== id))
//     }
//   }

//   const stats = {
//     total: funnels.length,
//     active: funnels.filter(f => f.status === 'active').length,
//     total_revenue: funnels.reduce((sum, f) => sum + f.revenue, 0),
//     avgConversion: funnels.length > 0 
//       ? funnels.reduce((sum, f) => sum + f.conversion_rate, 0) / funnels.length 
//       : 0
//   }

//   return (
//     <div className="space-y-8">
      
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-bold mb-2">Воронки</h1>
//           <p className="text-gray-400">Керуй всіма воронками в одному місці</p>
//         </div>

//         <Link to="/admin/funnels/generate">
//           <Button variant="primary">
//             <Plus size={20} />
//             Створити воронку
//           </Button>
//         </Link>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//         <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
//           <div className="flex items-center gap-3">
//             <Target size={20} className="text-blue-400" />
//             <div>
//               <p className="text-sm text-gray-400">Всього воронок</p>
//               <p className="text-2xl font-bold">{stats.total}</p>
//             </div>
//           </div>
//         </div>

//         <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
//           <div className="flex items-center gap-3">
//             <Play size={20} className="text-green-400" />
//             <div>
//               <p className="text-sm text-gray-400">Активних</p>
//               <p className="text-2xl font-bold">{stats.active}</p>
//             </div>
//           </div>
//         </div>

//         <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
//           <div className="flex items-center gap-3">
//             <DollarSign size={20} className="text-orange-400" />
//             <div>
//               <p className="text-sm text-gray-400">Загальний дохід</p>
//               <p className="text-2xl font-bold">₴{(stats.total_revenue / 1000).toFixed(0)}k</p>
//             </div>
//           </div>
//         </div>

//         <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
//           <div className="flex items-center gap-3">
//             <TrendingUp size={20} className="text-purple-400" />
//             <div>
//               <p className="text-sm text-gray-400">Сер. конверсія</p>
//               <p className="text-2xl font-bold">{stats.avgConversion.toFixed(1)}%</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="flex flex-col sm:flex-row gap-4">
//         <div className="flex-1 relative">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//           <Input
//             type="text"
//             placeholder="Пошук воронок..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="pl-12"
//           />
//         </div>

//         <Select
//           options={statusOptions}
//           value={statusFilter}
//           onChange={(e) => setStatusFilter(e.target.value)}
//           className="w-full sm:w-48"
//         />

//         <Select
//           options={typeOptions}
//           value={typeFilter}
//           onChange={(e) => setTypeFilter(e.target.value)}
//           className="w-full sm:w-48"
//         />
//       </div>

//       {/* Funnels Grid */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {filteredFunnels.map((funnel) => (
//           <div
//             key={funnel.id}
//             className={`
//               bg-gray-900 border rounded-2xl p-6 transition-all hover:border-gray-700
//               ${funnel.status === 'active' ? 'border-green-500/20' : 'border-gray-800'}
//             `}
//           >
//             {/* Header */}
//             <div className="flex items-start justify-between mb-4">
//               <div className="flex-1">
//                 <div className="flex items-center gap-2 mb-2">
//                   <h3 className="font-bold text-lg">{funnel.name}</h3>
//                   <Button
//                     variant="ghost"
//                     onClick={() => toggleFavorite(funnel.id)}
//                     className="p-1"
//                     aria-label={funnel.isFavorite ? 'Видалити з обраного' : 'Додати в обране'}
//                   >
//                     <Star 
//                       size={16} 
//                       className={funnel.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
//                     />
//                   </Button>
//                 </div>

//                 <div className="flex items-center gap-2 text-sm">
//                   <span className={`
//                     px-2 py-1 rounded-full text-xs font-medium
//                     ${funnel.status === 'active' ? 'bg-green-500/10 text-green-400' :
//                       funnel.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
//                       funnel.status === 'draft' ? 'bg-gray-500/10 text-gray-400' :
//                       'bg-blue-500/10 text-blue-400'
//                     }
//                   `}>
//                     {funnel.status === 'active' ? 'Активна' :
//                      funnel.status === 'paused' ? 'Призупинена' :
//                      funnel.status === 'draft' ? 'Чернетка' :
//                      'Архівована'
//                     }
//                   </span>
//                   <span className="text-gray-500">•</span>
//                   <span className="text-gray-400 capitalize">{funnel.type}</span>
//                   <span className="text-gray-500">•</span>
//                   <span className="text-gray-400">{funnel.stages} етапів</span>
//                 </div>
//               </div>

//               <div className="relative group">
//                 <Button variant="ghost" className="p-2" aria-label="Більше опцій">
//                   <MoreVertical size={20} />
//                 </Button>
                
//                 {/* Dropdown menu */}
//                 <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-10">
//                   <Link 
//                     to={`/admin/funnels/blueprint?id=${funnel.id}`}
//                     className="flex items-center gap-2 px-4 py-3 hover:bg-gray-700 text-sm rounded-t-xl"
//                   >
//                     <Eye size={16} />
//                     Переглянути
//                   </Link>
//                   <Button
//                     variant="ghost"
//                     onClick={() => duplicateFunnel(funnel.id)}
//                     className="flex items-center gap-2 px-4 py-3 text-sm w-full justify-start"
//                   >
//                     <Copy size={16} />
//                     Дублювати
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     onClick={() => deleteFunnel(funnel.id)}
//                     className="flex items-center gap-2 px-4 py-3 text-sm text-red-400 w-full justify-start rounded-b-xl"
//                   >
//                     <Trash2 size={16} />
//                     Видалити
//                   </Button>
//                 </div>
//               </div>
//             </div>

//             {/* Metrics */}
//             <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-800">
//               <div>
//                 <p className="text-xs text-gray-400 mb-1">Visitors</p>
//                 <p className="font-bold">{funnel.visitors.toLocaleString()}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-400 mb-1">Conversions</p>
//                 <p className="font-bold">{funnel.conversions}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-400 mb-1">Rate</p>
//                 <p className="font-bold text-orange-400">{funnel.conversion_rate}%</p>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-400 mb-1">Revenue</p>
//                 <p className="font-bold text-green-400">₴{(funnel.revenue / 1000).toFixed(0)}k</p>
//               </div>
//             </div>

//             {/* Actions */}
//             <div className="flex gap-2">
//               <Link to={`/admin/analytics?funnel=${funnel.id}`} className="flex-1">
//                 <Button variant="secondary" className="w-full">
//                   <TrendingUp size={16} />
//                   Аналітика
//                 </Button>
//               </Link>
              
//               <Link to={`/admin/funnels/blueprint?id=${funnel.id}`} className="flex-1">
//                 <Button variant="primary" className="w-full">
//                   Редагувати
//                 </Button>
//               </Link>
//             </div>
//           </div>
//         ))}
//       </div>

//       {filteredFunnels.length === 0 && (
//         <div className="text-center py-20">
//           <Target size={64} className="text-gray-600 mx-auto mb-4" />
//           <p className="text-gray-400 mb-6">Воронок не знайдено</p>
//           <Link to="/admin/funnels/generate">
//             <Button variant="primary">
//               <Plus size={20} />
//               Створити першу воронку
//             </Button>
//           </Link>
//         </div>
//       )}
//     </div>
//   )
// }

// /Users/viravira/Documents/starway-studio/packages/frontend/src/pages/admin/BlueprintBuilder.tsx
// src/pages/admin/BlueprintBuilder.tsx

// import { useState, useCallback } from 'react'
// import ReactFlow, {
//   ReactFlowProvider,
//   addEdge,
//   MiniMap,
//   Controls,
//   Background,
//   applyNodeChanges,
//   applyEdgeChanges,
//   Panel,
//   Node,
//   Edge,
//   Connection,
//   NodeChange,
//   EdgeChange,
// } from 'reactflow'
// import 'reactflow/dist/style.css'
// import { 
//   Plus, Save, Sparkles, Zap, Mail, MessageCircle, 
//   DollarSign, Gift, Users, Target, TrendingUp,
//   Play, Settings, Layers, ChevronRight
// } from 'lucide-react'
// import { BLOCK_TYPES, FunnelBlock } from './adminTypes'


// export default function BlueprintBuilder() {
//   const [nodes, setNodes] = useState<FunnelBlock[]>([])
//   const [edges, setEdges] = useState<Edge[]>([])
//   const [selectedNode, setSelectedNode] = useState<FunnelBlock | null>(null)
//   const [showSidebar, setShowSidebar] = useState(true)
//   const [funnelName, setFunnelName] = useState('Нова воронка')
//   const [aiMode, setAiMode] = useState(false)

//   const onNodesChange: any = useCallback(
//     (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
//     []
//   )

//   const onEdgesChange: any = useCallback(
//     (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
//     []
//   )

//   const onConnect = useCallback(
//     (params: Edge | Connection) => setEdges((eds) => addEdge({
//       ...params,
//       animated: true,
//       style: { stroke: '#f97316', strokeWidth: 3 }
//     }, eds)),
//     []
//   )

//   // Додати новий блок
//   const addBlock = (blockType: typeof BLOCK_TYPES[0]) => {
//     const id = `block-${Date.now()}`
//     const yPosition = nodes.length * 150 + 50
    
//     const newNode: FunnelBlock = {
//       id,
//       type: 'default',
//       position: { x: 250, y: yPosition },
//       data: {
//         type: blockType.type,
//         label: blockType.label,
//         channels: [],
//         duration: 7,
//       },
//       style: {
//         background: `linear-gradient(135deg, ${getGradientColors(blockType.color)})`,
//         color: 'white',
//         border: 'none',
//         borderRadius: '16px',
//         padding: '20px',
//         minWidth: '280px',
//         boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
//       }
//     }
    
//     setNodes((nds) => [...nds, newNode])
    
//     // Автоматично з'єднати з попереднім блоком
//     if (nodes.length > 0) {
//       const lastNode = nodes[nodes.length - 1]
//       setEdges((eds) => [...eds, {
//         id: `e-${lastNode.id}-${id}`,
//         source: lastNode.id,
//         target: id,
//         animated: true,
//         style: { stroke: '#f97316', strokeWidth: 3 }
//       }])
//     }
//   }

//   const getGradientColors = (gradient: string) => {
//     const colors: Record<string, string> = {
//       'from-blue-500 to-cyan-500': '#3b82f6, #06b6d4',
//       'from-purple-500 to-pink-500': '#a855f7, #ec4899',
//       'from-green-500 to-emerald-500': '#22c55e, #10b981',
//       'from-orange-500 to-red-500': '#f97316, #ef4444',
//       'from-pink-500 to-rose-500': '#ec4899, #f43f5e'
//     }
//     return colors[gradient] || '#f97316, #ec4899'
//   }

//   // AI генерація воронки
//   const generateWithAI = async () => {
//     setAiMode(true)
    
//     // Симуляція AI генерації
//     await new Promise(resolve => setTimeout(resolve, 2000))
    
//     // Створюємо стандартну структуру з 5 етапів
//     const aiBlocks = BLOCK_TYPES.map((block, idx) => ({
//       id: `ai-block-${idx}`,
//       type: 'default' as const,
//       position: { x: 250, y: idx * 150 + 50 },
//       data: {
//         type: block.type,
//         label: block.label,
//         channels: idx === 0 ? ['landing', 'telegram'] : 
//                  idx === 1 ? ['email', 'ai-mentor'] :
//                  idx === 2 ? ['telegram', 'email'] :
//                  idx === 3 ? ['payment', 'telegram'] :
//                  ['ai-mentor', 'email'],
//         duration: idx === 0 ? 3 : idx === 1 ? 7 : idx === 2 ? 4 : idx === 3 ? 1 : 14,
//         product: idx === 0 ? { name: 'Лід-магніт', price: 0 } :
//                 idx === 1 ? { name: 'Tripwire', price: 99 } :
//                 idx === 3 ? { name: 'Core продукт', price: 1200 } :
//                 idx === 4 ? { name: 'Upsell', price: 2500 } :
//                 undefined
//       },
//       style: {
//         background: `linear-gradient(135deg, ${getGradientColors(block.color)})`,
//         color: 'white',
//         border: 'none',
//         borderRadius: '16px',
//         padding: '20px',
//         minWidth: '280px',
//         boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
//       }
//     }))

//     const aiEdges = aiBlocks.slice(0, -1).map((node, idx) => ({
//       id: `ai-edge-${idx}`,
//       source: node.id,
//       target: aiBlocks[idx + 1].id,
//       animated: true,
//       style: { stroke: '#f97316', strokeWidth: 3 }
//     }))

//     setNodes(aiBlocks)
//     setEdges(aiEdges)
//     setAiMode(false)
//   }

//   // Зберегти воронку
//   const saveFunnel = () => {
//     const funnelData = {
//       name: funnelName,
//       nodes,
//       edges,
//       created_at: new Date().toISOString()
//     }
//     console.log('Saving funnel:', funnelData)
//     alert('Воронка збережена! ✅')
//   }

//   // Оновити вибраний блок
//   const updateSelectedNode = (updates: Partial<FunnelBlock['data']>) => {
//     if (!selectedNode) return
    
//     setNodes((nds) => nds.map(node => 
//       node.id === selectedNode.id 
//         ? { ...node, data: { ...node.data, ...updates } }
//         : node
//     ))
    
//     setSelectedNode(prev => prev ? {
//       ...prev,
//       data: { ...prev.data, ...updates }
//     } : null)
//   }

//   return (
//     <div className="h-screen flex">
      
//       {/* Left Sidebar - Block Library */}
//       <div className={`
//         bg-gray-900 border-r border-gray-800 transition-all duration-300
//         ${showSidebar ? 'w-80' : 'w-0 overflow-hidden'}
//       `}>
//         <div className="p-6 space-y-6">
          
//           <div>
//             <Input
//               label="Назва воронки"
//               value={funnelName}
//               onChange={(e) => setFunnelName(e.target.value)}
//               className="mb-4"
//             />
            
//             <Button
//               variant="primary"
//               className="w-full mb-3"
//               onClick={generateWithAI}
//               disabled={aiMode}
//             >
//               <Sparkles size={20} />
//               {aiMode ? 'AI генерує...' : 'Згенерувати AI воронку'}
//             </Button>

//             <div className="h-px bg-gray-800 my-4" />
//           </div>

//           <div>
//             <h3 className="font-bold mb-4 flex items-center gap-2">
//               <Layers size={18} />
//               Блоки воронки
//             </h3>
            
//             <div className="space-y-3">
//               {BLOCK_TYPES.map((block) => {
//                 const Icon = block.icon
//                 return (
//                   <button
//                     key={block.id}
//                     onClick={() => addBlock(block)}
//                     className={`
//                       w-full p-4 rounded-xl bg-gradient-to-br ${block.color}
//                       hover:scale-105 transition-all text-left group
//                     `}
//                   >
//                     <div className="flex items-center gap-3 mb-2">
//                       <Icon size={20} className="text-white" />
//                       <span className="font-bold text-white">{block.label}</span>
//                     </div>
//                     <p className="text-xs text-white/80">{block.description}</p>
//                   </button>
//                 )
//               })}
//             </div>
//           </div>

//           <div>
//             <h3 className="font-bold mb-3 text-sm text-gray-400">
//               Доступні канали
//             </h3>
//             <div className="flex flex-wrap gap-2">
//               {CHANNELS.map(channel => (
//                 <span 
//                   key={channel.id}
//                   className="px-2 py-1 bg-gray-800 rounded-lg text-xs"
//                 >
//                   {channel.label}
//                 </span>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Canvas */}
//       <div className="flex-1 relative">
//         <ReactFlowProvider>
//           <ReactFlow
//             nodes={nodes}
//             edges={edges}
//             onNodesChange={onNodesChange}
//             onEdgesChange={onEdgesChange}
//             onConnect={onConnect}
//             onNodeClick={(_, node) => setSelectedNode(node as FunnelBlock)}
//             fitView
//             style={{ background: '#0f172a' }}
//           >
//             <MiniMap 
//               style={{ 
//                 background: '#1e293b',
//                 border: '1px solid #334155'
//               }}
//               maskColor="rgba(0, 0, 0, 0.6)"
//             />
            
//             <Controls 
//               style={{
//                 background: '#1e293b',
//                 border: '1px solid #334155'
//               }}
//             />
            
//             <Background 
//               color="#334155" 
//               gap={16} 
//               size={1}
//             />

//             {/* Top Panel */}
//             <Panel position="top-left" className="flex gap-2">
//               <Button
//                 variant="secondary"
//                 onClick={() => setShowSidebar(!showSidebar)}
//                 className="p-2"
//                 aria-label={showSidebar ? 'Сховати бібліотеку' : 'Показати бібліотеку'}
//               >
//                 <Layers size={20} />
//               </Button>
//             </Panel>

//             <Panel position="top-right" className="flex gap-2">
//               <Button
//                 onClick={saveFunnel}
//                 variant="success"
//                 className="flex items-center gap-2"
//               >
//                 <Save size={16} />
//                 Зберегти
//               </Button>
              
//               <Button
//                 variant="primary"
//                 className="flex items-center gap-2"
//               >
//                 <Play size={16} />
//                 Запустити
//               </Button>
//             </Panel>
//           </ReactFlow>
//         </ReactFlowProvider>

//         {/* Empty State */}
//         {nodes.length === 0 && (
//           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//             <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 text-center max-w-md">
//               <Zap size={64} className="text-orange-400 mx-auto mb-6" />
//               <h3 className="text-2xl font-bold mb-3">Створи свою воронку!</h3>
//               <p className="text-gray-400 mb-6">
//                 Додай блоки зліва або використай AI для автоматичної генерації
//               </p>
//               <div className="flex gap-3 justify-center pointer-events-auto">
//                 <Button variant="primary" onClick={generateWithAI}>
//                   <Sparkles size={20} />
//                   AI генерація
//                 </Button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Right Sidebar - Block Settings */}
//       {selectedNode && (
//         <div className="w-96 bg-gray-900 border-l border-gray-800 p-6 overflow-y-auto">
//           <div className="flex items-center justify-between mb-6">
//             <h3 className="text-xl font-bold">Налаштування блоку</h3>
//             <button
//               onClick={() => setSelectedNode(null)}
//               className="p-2 hover:bg-gray-800 rounded-lg transition"
//               aria-label="Закрити"
//             >
//               ✕
//             </button>
//           </div>

//           <div className="space-y-6">
//             {/* Тип блоку */}
//             <div>
//               <p className="text-sm text-gray-400 mb-2">Тип</p>
//               <div className={`
//                 px-4 py-3 rounded-xl bg-gradient-to-br
//                 ${BLOCK_TYPES.find(b => b.type === selectedNode.data.type)?.color}
//                 font-bold text-white
//               `}>
//                 {selectedNode.data.label}
//               </div>
//             </div>

//             {/* Тривалість */}
//             <Input
//               label="Тривалість (днів)"
//               type="number"
//               value={selectedNode.data.duration}
//               onChange={(e) => updateSelectedNode({ duration: parseInt(e.target.value) })}
//             />

//             {/* Продукт */}
//             <div>
//               <p className="text-sm font-medium mb-3">Продукт на етапі</p>
//               <Input
//                 label="Назва продукту"
//                 placeholder="Наприклад: Лід-магніт"
//                 value={selectedNode.data.product?.name || ''}
//                 onChange={(e) => updateSelectedNode({ 
//                   product: { 
//                     ...selectedNode.data.product,
//                     name: e.target.value,
//                     price: selectedNode.data.product?.price || 0
//                   } 
//                 })}
//                 className="mb-3"
//               />
//               <Input
//                 label="Ціна (₴)"
//                 type="number"
//                 placeholder="0"
//                 value={selectedNode.data.product?.price || 0}
//                 onChange={(e) => updateSelectedNode({ 
//                   product: { 
//                     name: selectedNode.data.product?.name || '',
//                     price: parseInt(e.target.value) || 0
//                   } 
//                 })}
//               />
//             </div>

//             {/* Канали */}
//             <div>
//               <p className="text-sm font-medium mb-3">Канали комунікації</p>
//               <div className="space-y-2">
//                 {CHANNELS.map(channel => (
//                   <label 
//                     key={channel.id}
//                     className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition"
//                   >
//                     <input
//                       type="checkbox"
//                       checked={selectedNode.data.channels.includes(channel.id)}
//                       onChange={(e) => {
//                         const newChannels = e.target.checked
//                           ? [...selectedNode.data.channels, channel.id]
//                           : selectedNode.data.channels.filter(c => c !== channel.id)
//                         updateSelectedNode({ channels: newChannels })
//                       }}
//                       className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
//                     />
//                     <span className="text-sm">{channel.label}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>

//             {/* AI конфігурація */}
//             <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
//               <div className="flex items-center gap-2 mb-3">
//                 <Sparkles size={18} className="text-orange-400" />
//                 <p className="font-medium text-orange-400">AI автоматизація</p>
//               </div>
//               <p className="text-sm text-gray-400">
//                 Налаштуй AI-ментора для персоналізованих повідомлень та рекомендацій
//               </p>
//               <Button variant="secondary" className="w-full mt-3">
//                 <Settings size={16} />
//                 Налаштувати AI
//               </Button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }