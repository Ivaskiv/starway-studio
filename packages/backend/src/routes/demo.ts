// routes/demo.ts
import { Router, Request, Response } from "express";
import { DemoService } from "./services/DemoService";

const router = Router();

// POST /api/demo/create - Створити повну демо-воронку
router.post("/create", async (req: Request, res: Response) => {
  try {
    const demo = await DemoService.createDemoFunnel(req.user.id);
    
    res.json({
      success: true,
      message: '🎉 Демо-воронка створена!',
      data: {
        funnelId: demo.funnel.id,
        landingPageUrl: `${process.env.APP_URL}/l/${demo.landingPage.slug}`,
        botUsername: demo.funnel.settings.botUsername,
        miniAppsCount: demo.miniApps.length,
        demoSubscriber: {
          name: demo.subscriber.name,
          progress: demo.subscriber.progress
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "demo_creation_failed" });
  }
});

// GET /api/demo/tour - Отримати інтерактивний тур
router.get("/tour", async (req: Request, res: Response) => {
  res.json({
    steps: [
      {
        id: 1,
        title: '🎯 Створення воронки',
        description: 'AI генерує воронку за 20 секунд',
        action: 'highlight_button',
        target: '#create-funnel-btn'
      },
      {
        id: 2,
        title: '🤖 Підключення Telegram',
        description: 'Бот створюється автоматично',
        action: 'open_modal',
        target: '#telegram-integration'
      },
      {
        id: 3,
        title: '📱 Mini Apps',
        description: 'Інтерактивні додатки у Telegram',
        action: 'show_preview',
        target: '#miniapps-list'
      },
      {
        id: 4,
        title: '🌐 Landing Page',
        description: 'Готовий сайт для продажу',
        action: 'open_preview',
        url: '/l/demo-yoga-start'
      },
      {
        id: 5,
        title: '📊 Аналітика',
        description: 'Відстежуйте прогрес учасників',
        action: 'navigate',
        target: '/dashboard'
      }
    ]
  });
});

export default router;