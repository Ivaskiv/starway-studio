// backend/src/modules/landing/cards/landingController.ts
import { Request, Response } from 'express';
import { buildPaymentRequest } from '../../subscriptions/payments/wayforpay.js';
import { trackEvent } from '../../events/service.js';
import { resolveUserState } from '../../telegram-mentor/handlers/start.js';

// Mock DB (замінити на Prisma/Neon)
let landingDB: Array<{ id: string; userId: string; title: string; url: string; price: number }> = [
  { id: '1', userId: 'u1', title: 'Мій лендінг 1', url: '/landing/1', price: 50 },
  { id: '2', userId: 'u1', title: 'Мій лендінг 2', url: '/landing/2', price: 30 },
];

export async function getUserLandingCards(req: Request, res: Response) {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const cards = landingDB.filter(l => l.userId === userId);
  const state = await resolveUserState(userId).catch(() => null);
  await trackEvent({
    userId,
    type: 'web_landing_cards_viewed',
    source: 'web',
    state,
    payload: {
      count: cards.length,
    },
  });
  res.json({ cards });
}

export async function addLandingCard(req: Request, res: Response) {
  const { userId, title, price } = req.body;
  if (!userId || !title || !price) return res.status(400).json({ error: 'Missing fields' });

  const id = `${Date.now()}`;
  const newCard = { id, userId, title, url: `/landing/${id}`, price };
  landingDB.push(newCard);
  const state = await resolveUserState(userId).catch(() => null);
  await trackEvent({
    userId,
    type: 'web_landing_card_created',
    source: 'web',
    state,
    payload: {
      landingId: id,
      price,
      title,
    },
  });
  res.json({ card: newCard });
}

export async function createLeadMagnetLandingCard(params: {
  userId: string
  title: string
  url: string
  price?: number
}) {
  const id = `${Date.now()}`
  const card = {
    id,
    userId: params.userId,
    title: params.title,
    url: params.url,
    price: params.price ?? 0,
  }
  landingDB.push(card)
  const state = await resolveUserState(params.userId).catch(() => null)
  await trackEvent({
    userId: params.userId,
    type: 'web_landing_card_created',
    source: 'web',
    state,
    payload: {
      landingId: id,
      title: params.title,
      url: params.url,
      price: card.price,
      source: 'lead_magnet_builder',
    },
  })
  return card
}

export async function updateLandingCard(req: Request, res: Response) {
  const { id, title, price, userId } = req.body;
  const card = landingDB.find(l => l.id === id);
  if (!card) return res.status(404).json({ error: 'Landing not found' });

  if (title) card.title = title;
  if (price) card.price = price;

  const state = typeof userId === 'string'
    ? await resolveUserState(userId).catch(() => null)
    : null;
  await trackEvent({
    userId: typeof userId === 'string' ? userId : null,
    type: 'web_landing_card_updated',
    source: 'web',
    state,
    payload: {
      landingId: card.id,
      price: card.price,
      title: card.title,
    },
  });
  res.json({ card });
}

export async function initiateLandingPayment(req: Request, res: Response) {
  const { userId, landingId } = req.body;
  const landing = landingDB.find(l => l.id === landingId);
  if (!landing) return res.status(404).json({ error: 'Landing not found' });

  const payRef = `landing_${landing.id}_${Date.now()}`;
  const paymentData = buildPaymentRequest({
    userId,
    productId: landing.id,
    amount: landing.price,
    currency: 'EUR',
    payRef,
    product_name: [landing.title],
  });

  const state = typeof userId === 'string'
    ? await resolveUserState(userId).catch(() => null)
    : null;
  await trackEvent({
    userId: typeof userId === 'string' ? userId : null,
    type: 'web_landing_payment_initiated',
    source: 'web',
    state,
    payload: {
      landingId: landing.id,
      payRef,
      amount: landing.price,
    },
  });

  res.json({ payment: paymentData });
}
