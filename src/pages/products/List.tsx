import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useStore } from '../../store'

interface Product {
  id: string
  title: string
  price: number
  description?: string
  modules?: string[]
}

export default function ProductsList() {
  const [products, setProducts] = useState<Product[]>([])
  const { user } = useStore() 
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get<Product[]>('/api/products', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`
          }
        })
        setProducts(res.data)
      } catch (err) {
        console.error('Помилка завантаження продуктів', err)
      }
    }
    fetchProducts()
  }, [])

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Продукти</h1>
        {user?.role === 'admin' && (
          <Link
            to="/products/new"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-bold hover:scale-105 transition"
          >
            Створити продукт
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(p => (
          <div
            key={p.id}
            className="bg-gray-900/50 backdrop-blur rounded-xl p-6 border border-gray-800 hover:border-purple-500 transition"
          >
            <h3 className="text-xl font-bold mb-2">{p.title}</h3>
            <p className="text-gray-400 mb-4">{p.description || 'Без опису'}</p>
            <div className="text-2xl font-bold text-green-400">
              {p.price ? `${p.price} ₴` : 'Безкоштовно'}
            </div>
            <div className="mt-4 flex gap-3">
              {user?.role === 'admin' && (
                <Link to={`/products/edit/${p.id}`} className="text-purple-400 hover:underline">
                  Редагувати
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
