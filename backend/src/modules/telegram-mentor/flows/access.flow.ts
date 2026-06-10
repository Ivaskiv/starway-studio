import type {
  ProductAccessProduct,
  ProductAccessRole,
} from '../../access/types.js'

type AccessNotificationUser = {
  id: string
  firstName: string | null
  email: string | null
  telegramChatId: string | null
  telegramUserId: string | null
  telegramLinks: Array<{ chatId: string | null }>
}

function resolveChatId(user: AccessNotificationUser) {
  return (
    user.telegramLinks[0]?.chatId ??
    user.telegramChatId ??
    user.telegramUserId ??
    null
  )
}

function buildFrontendUrl() {
  return (process.env.FRONTEND_URL?.trim() || 'http://localhost:5173').replace(
    /\/$/,
    ''
  )
}

function buildOpenUrl() {
  const base = buildFrontendUrl()

  try {
    const url = new URL('/miniapp', base)
    url.searchParams.set('startapp', 'admin')
    return url.toString()
  } catch {
    return `${base}/miniapp?startapp=admin`
  }
}

function toProductLabel(product: ProductAccessProduct) {
  return product === 'AI_MENTOR' ? 'ABsystem' : 'AI Assistant'
}

function toRoleLabel(role: ProductAccessRole) {
  return role === 'ADMIN' ? 'ADMIN' : 'EXPERT'
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendAccessGrantedNotification(input: {
  user: AccessNotificationUser
  product: ProductAccessProduct
  role: ProductAccessRole
}) {
  const chatId = resolveChatId(input.user)
  const productLabel = escapeHtml(toProductLabel(input.product))
  const roleLabel = escapeHtml(toRoleLabel(input.role))
  const openUrl = buildOpenUrl()
  const isSafeWebApp =
    openUrl.startsWith('https://') && !openUrl.includes('localhost')
  const text = [
    '<b>🚀 Тобі відкрито доступ</b>',
    '',
    `• Продукт: <b>${productLabel}</b>`,
    `• Роль: <b>${roleLabel}</b>`,
    '',
    '<blockquote>Тепер ти можеш керувати цим продуктом у Starway.</blockquote>',
  ].join('\n')

  const preview = {
    channel: 'telegram' as const,
    delivered: false,
    recipient: {
      email: input.user.email ?? null,
      chatId,
    },
    product: input.product,
    role: input.role,
    text,
    // cta: {
    //   label: '🌐 Відкрити Starway',
    //   type: isSafeWebApp ? 'web_app' as const : 'url' as const,
    //   url: openUrl,
    // },
  }

  if (!chatId) {
    return preview
  }

  // const delivered = await sendDedupedTelegramMessage(chatId, text, {
  //   parse_mode: 'HTML',
  //   reply_markup: {
  //     inline_keyboard: [[
  //       isSafeWebApp
  //         ? { text: '🌐 Відкрити Starway', web_app: { url: openUrl } }
  //         : { text: '🌐 Відкрити Starway', url: openUrl },
  //     ]],
  //   },
  // })

  return {
    ...preview,
    // delivered,
  }
}
