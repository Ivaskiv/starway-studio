export default function DashboardAdmin() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
        Ласкаво просимо в Starway Admin!
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-8 border border-gray-800">
          <h3 className="text-2xl font-bold mb-4">AI-Ментори</h3>
          <p className="text-gray-300">Щоденний супровід і аналіз</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-lg rounded-2xl p-8 border border-gray-800">
          <h3 className="text-2xl font-bold mb-4">Практикуми</h3>
          <p className="text-gray-300">Теорія + практика + перевірка</p>
        </div>
        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-8 border border-gray-800">
          <h3 className="text-2xl font-bold mb-4">Воронки</h3>
          <p className="text-gray-300">Максимум продажів на автопілоті</p>
        </div>
      </div>

      <div className="text-center">
        <a
          href="/products"
          className="inline-block px-10 py-5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-xl hover:scale-110 transition transform"
        >
          Почати створювати продукти
        </a>
      </div>
    </div>
  )
}