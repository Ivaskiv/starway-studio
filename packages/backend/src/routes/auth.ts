// packages/backend/src/routes/auth.ts
import { Router } from 'express'
import crypto from 'crypto'

const router = Router()

// ✅ In-memory database (для тестування)
let users: any[] = []

// ====================== REGISTER ======================
router.post('/register', (req, res) => {
  console.log('📝 POST /auth/register', req.body)
  
  const { email, first_name, last_name, password, role } = req.body

  // Валідація
  if (!email || !password || !first_name) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email, ім\'я та пароль обов\'язкові' 
    })
  }

  // Перевірка чи користувач вже існує
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ 
      success: false, 
      message: 'Користувач з таким email вже існує' 
    })
  }

  // Створення нового користувача
  const user = {
    id: crypto.randomUUID(),
    email,
    first_name,
    last_name: last_name || '',
    password, // В реальному проєкті хешувати!
    role: role || 'user',
    is_active: true,
    is_email_verified: false,
    created_at: new Date().toISOString(),
  }

  users.push(user)

  // Повертаємо дані без пароля
  const { password: _, ...userWithoutPassword } = user

  console.log('✅ User registered:', userWithoutPassword.email)

  res.status(201).json({
    success: true,
    user: userWithoutPassword,
    tokens: { 
      accessToken: `token-${user.id}`, 
      refreshToken: `refresh-${user.id}`, 
      expiresIn: 3600 
    },
  })
})

// ====================== LOGIN ======================
router.post('/login', (req, res) => {
  console.log('🔐 POST /auth/login', { email: req.body.email })
  
  const { email, password } = req.body

  // Валідація
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email та пароль обов\'язкові' 
    })
  }

  // Пошук користувача
  const user = users.find(u => u.email === email)

  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Невірний email або пароль' 
    })
  }

  // Перевірка пароля
  if (user.password !== password) {
    return res.status(401).json({ 
      success: false, 
      message: 'Невірний email або пароль' 
    })
  }

  // Повертаємо дані без пароля
  const { password: _, ...userWithoutPassword } = user

  console.log('✅ User logged in:', userWithoutPassword.email)

  res.json({
    success: true,
    user: userWithoutPassword,
    tokens: { 
      accessToken: `token-${user.id}`, 
      refreshToken: `refresh-${user.id}`, 
      expiresIn: 3600 
    },
  })
})

// ====================== GET /ME ======================
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader?.split(' ')[1]

  console.log('👤 GET /auth/me', { token: token ? '***' : 'null' })

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    })
  }

  // Витягуємо user_id з токена (формат: token-{user_id})
  const userId = token.replace('token-', '')
  const user = users.find(u => u.id === userId)

  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    })
  }

  // Повертаємо дані без пароля
  const { password: _, ...userWithoutPassword } = user

  console.log('✅ User found:', userWithoutPassword.email)

  res.json({
    success: true,
    user: userWithoutPassword,
    tokens: { 
      accessToken: token,
      refreshToken: `refresh-${user.id}`,
      expiresIn: 3600 
    },
  })
})

// ====================== LOGOUT ======================
router.post('/logout', (req, res) => {
  console.log('👋 POST /auth/logout')
  res.json({ success: true, message: 'Logged out successfully' })
})

// ====================== DEBUG: Get all users ======================
router.get('/users', (req, res) => {
  const usersWithoutPasswords = users.map(({ password, ...user }) => user)
  res.json({ 
    success: true, 
    count: users.length,
    users: usersWithoutPasswords 
  })
})

export default router