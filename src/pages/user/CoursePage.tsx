// src/pages/student/CoursePage.tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '@/lib/api'

export default function CoursePage() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [blocks, setBlocks] = useState([])
  
  useEffect(() => {
    loadCourse()
  }, [id])
  
  const loadCourse = async () => {
    const res = await api.get(`/api/products/${id}`)
    setCourse(res.data)
    
    const blocksRes = await api.get(`/api/products/${id}/blocks`)
    setBlocks(blocksRes.data)
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* <h1>{course?.title}</h1> */}
      {/* ... решта коду */}
    </div>
  )
}