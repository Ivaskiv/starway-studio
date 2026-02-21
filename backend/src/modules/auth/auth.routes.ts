// backend/src/modules/auth/auth.routes.ts
import { authRequired } from '@/modules/auth/middleware/auth.js'
import { prisma }       from '@/db/client.js'
import { Router }       from 'express'
import {
  forgotPassword,
  getMe,
  login,
  logout,
  register,
  refresh,
  resetPassword,
  socialAuth,
  updateSettings,
} from './auth.controller.js'

const router = Router()

// ── Auth ──────────────────────────────────────────────
router.post('/register', register)
router.post('/login',    login)
router.post('/refresh',  refresh)
router.post('/social', socialAuth)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.get ('/me',       authRequired, getMe)
router.post('/logout',   authRequired, logout)
router.patch('/settings', authRequired, updateSettings)

// ── Users (admin) ─────────────────────────────────────
router.patch('/users/:id/role', authRequired, async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN')
      return res.status(403).json({ error: 'forbidden' })

    const { role } = req.body
    if (!['USER', 'ADMIN', 'MENTOR'].includes(role))
      return res.status(400).json({ error: 'invalid_role' })

    const user = await prisma.user.update({
      where:  { id: req.params.id },
      data:   { role },
      select: { id: true, email: true, role: true },
    })

    res.json({ user })
  } catch (err) {
    console.error('❌ Update role error:', err)
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
