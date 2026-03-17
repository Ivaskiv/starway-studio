// backend/src/modules/landing/cards/landingController.ts
import { Request, Response } from 'express';
import { buildPaymentRequest } from '../../subscriptions/payments/wayforpay.js';

// Mock DB (замінити на Prisma/Neon)
let landingDB: Array<{ id: string; userId: string; title: string; url: string; price: number }> = [
  { id: '1', userId: 'u1', title: 'Мій лендінг 1', url: '/landing/1', price: 50 },
  { id: '2', userId: 'u1', title: 'Мій лендінг 2', url: '/landing/2', price: 30 },
];

export async function getUserLandingCards(req: Request, res: Response) {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const cards = landingDB.filter(l => l.userId === userId);
  res.json({ cards });
}

export async function addLandingCard(req: Request, res: Response) {
  const { userId, title, price } = req.body;
  if (!userId || !title || !price) return res.status(400).json({ error: 'Missing fields' });

  const id = `${Date.now()}`;
  const newCard = { id, userId, title, url: `/landing/${id}`, price };
  landingDB.push(newCard);
  res.json({ card: newCard });
}

export async function updateLandingCard(req: Request, res: Response) {
  const { id, title, price } = req.body;
  const card = landingDB.find(l => l.id === id);
  if (!card) return res.status(404).json({ error: 'Landing not found' });

  if (title) card.title = title;
  if (price) card.price = price;

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

  res.json({ payment: paymentData });
}