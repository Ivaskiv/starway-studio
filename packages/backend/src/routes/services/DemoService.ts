import { Router, Request, Response } from "express";
// services/DemoService.ts
import { sql } from '../../db/client';

export class DemoService {
  
  // Створити повну демо-воронку для нового користувача
  static async createDemoFunnel(userId: string) {
    
    // 1. Створити воронку
    const [funnel] = await sql`
      INSERT INTO funnels (user_id, name, type, status, steps, settings)
      VALUES (
        ${userId},
        'Демо: Йога для початківців',
        'telegram',
        'active',
        ${JSON.stringify(this.getDemoSteps())}::jsonb,
        ${JSON.stringify({
          niche: 'wellness',
          isDemo: true,
          landingPageUrl: null,
          botUsername: 'demo_yoga_bot'
        })}::jsonb
      )
      RETURNING *
    `;
    
    // 2. Створити Mini Apps
    const miniApps = await this.createDemoMiniApps(funnel.id);
    
    // 3. Створити Landing Page
    const landingPage = await this.createDemoLandingPage(funnel.id);
    
    // 4. Створити демо-учасника
    const subscriber = await this.createDemoSubscriber(funnel.id);
    
    return {
      funnel,
      miniApps,
      landingPage,
      subscriber
    };
  }
  
  // Демо кроки воронки
  private static getDemoSteps() {
    return [
      {
        id: 'step_1',
        order: 1,
        day: 1,
        delay: 0,
        type: 'welcome',
        content: {
          text: '👋 Привіт! Вітаю на курсі "Йога-старт"\n\nРозпочнемо з короткого знайомства',
          buttons: [
            { text: '🎯 Розпочати', action: 'open_miniapp', miniAppId: 'onboarding' }
          ]
        }
      },
      {
        id: 'step_2',
        order: 2,
        day: 2,
        delay: 86400,
        type: 'lesson',
        content: {
          text: '☀️ Доброго ранку!\n\nСьогодні ваша перша практика. Урок вже готовий 👇',
          buttons: [
            { text: '▶️ Розпочати урок', action: 'open_miniapp', miniAppId: 'lesson_1' }
          ]
        }
      },
      {
        id: 'step_3',
        order: 3,
        day: 3,
        delay: 172800,
        type: 'lesson',
        content: {
          text: '💨 День 3: Техніка дихання\n\nСьогодні навчимося правильно дихати під час практики',
          buttons: [
            { text: '▶️ Виконати вправу', action: 'open_miniapp', miniAppId: 'breathing' }
          ]
        }
      },
      {
        id: 'step_4',
        order: 4,
        day: 7,
        delay: 518400,
        type: 'completion',
        content: {
          text: '🎉 Вітаю! Ви пройшли курс!\n\nВаші результати:\n✓ 7/7 уроків виконано\n✓ 6 днів streak\n✓ 90 хвилин практики',
          buttons: [
            { text: '📜 Отримати сертифікат', action: 'open_miniapp', miniAppId: 'certificate' },
            { text: '🎁 Бонус: Просунутий курс', action: 'upsell' }
          ]
        }
      }
    ];
  }
  
  // Створити демо Mini Apps
  private static async createDemoMiniApps(funnelId: string) {
    const apps = [
      {
        name: 'Знайомство',
        type: 'onboarding',
        order_index: 1,
        app_url: '/miniapp/onboarding',
        config: {
          title: '🧘 Давайте познайомимось',
          description: 'Анкета + відео привітання',
          components: [
            { type: 'radio', label: 'Чи маєте досвід йоги?', options: ['Ні, перший раз', 'Трохи практикував(ла)', 'Регулярно займаюсь'] },
            { type: 'checkbox', label: 'Яка ваша мета?', options: ['Гнучкість', 'Зняти стрес', 'Схуднути'] }
          ]
        }
      },
      {
        name: 'Перша практика',
        type: 'lesson',
        order_index: 2,
        app_url: '/miniapp/lesson-1',
        config: {
          title: '🎥 Перша практика',
          description: 'Відео-урок 15 хвилин',
          components: [
            { type: 'video', url: 'https://demo.com/video1.mp4', duration: 900 },
            { type: 'checklist', items: ['Поза гори', 'Поза собаки', 'Поза дитини'] },
            { type: 'button', text: '✓ Я виконала', action: 'complete' }
          ]
        }
      },
      {
        name: 'Техніка дихання',
        type: 'task',
        order_index: 3,
        app_url: '/miniapp/breathing',
        config: {
          title: '💨 Дихання',
          description: 'Інтерактивна вправа 5 хвилин',
          components: [
            { type: 'timer', duration: 300 },
            { type: 'animation', pattern: 'breathe' }
          ]
        }
      },
      {
        name: 'Сертифікат',
        type: 'custom',
        order_index: 4,
        app_url: '/miniapp/certificate',
        config: {
          title: '🏆 СЕРТИФІКАТ',
          description: 'Ви завершили курс!',
          components: [
            { type: 'certificate', userName: 'dynamic', courseName: 'Йога-старт' },
            { type: 'share', platforms: ['telegram', 'instagram'] }
          ]
        }
      }
    ];
    
    const created = [];
    for (const app of apps) {
      const [miniApp] = await sql`
        INSERT INTO mini_apps (funnel_id, name, type, order_index, app_url, config)
        VALUES (
          ${funnelId},
          ${app.name},
          ${app.type},
          ${app.order_index},
          ${app.app_url},
          ${JSON.stringify(app.config)}::jsonb
        )
        RETURNING *
      `;
      created.push(miniApp);
    }
    
    return created;
  }
  
  // Створити демо Landing Page
  private static async createDemoLandingPage(funnelId: string) {
    const [landingPage] = await sql`
      INSERT INTO landing_pages (funnel_id, slug, html_content, css_content, meta, published)
      VALUES (
        ${funnelId},
        'demo-yoga-start',
        ${this.getDemoLandingHTML()},
        ${this.getDemoLandingCSS()},
        ${JSON.stringify({
          title: 'Йога для початківців - 7 днів до гнучкого тіла',
          description: 'Безкоштовний курс йоги для початківців. Навчіться базовим асанам за 7 днів',
          ogImage: '/demo/yoga-og.jpg'
        })}::jsonb,
        true
      )
      RETURNING *
    `;
    
    return landingPage;
  }
  
  // Створити демо-учасника (для показу прогресу)
  private static async createDemoSubscriber(funnelId: string) {
    const [subscriber] = await sql`
      INSERT INTO funnel_subscribers (
        funnel_id, 
        telegram_id, 
        telegram_username, 
        name, 
        current_step_index, 
        status,
        progress
      )
      VALUES (
        ${funnelId},
        123456789,
        'demo_user',
        'Олена Іваненко',
        2,
        'active',
        ${JSON.stringify({
          completedSteps: ['step_1', 'step_2'],
          completedMiniApps: ['onboarding', 'lesson_1'],
          totalPoints: 150,
          streak: 2
        })}::jsonb
      )
      RETURNING *
    `;
    
    return subscriber;
  }
  
  // HTML для Landing Page
  private static getDemoLandingHTML() {
    return `
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Йога для початківців</title>
</head>
<body>
  <div class="hero">
    <h1>🧘 Йога-старт</h1>
    <p>7 днів до гнучкого тіла</p>
    <button class="cta">Розпочати за 199 грн</button>
  </div>
  
  <div class="features">
    <div class="feature">
      <span>📱</span>
      <h3>У Telegram</h3>
      <p>Зручно навчатися у месенджері</p>
    </div>
    <div class="feature">
      <span>🎥</span>
      <h3>Відео-уроки</h3>
      <p>15 хвилин на день</p>
    </div>
    <div class="feature">
      <span>🏆</span>
      <h3>Сертифікат</h3>
      <p>По завершенню курсу</p>
    </div>
  </div>
  
  <div class="program">
    <h2>Програма курсу</h2>
    <ul>
      <li>День 1: Знайомство 👋</li>
      <li>День 2: Перша практика 🧘</li>
      <li>День 3: Техніка дихання 💨</li>
      <li>День 4: Ранкова зарядка ☀️</li>
      <li>День 5: Медитація 🕉️</li>
      <li>День 6: Комплекс асан 🌟</li>
      <li>День 7: Підсумки + бонус 🎁</li>
    </ul>
  </div>
  
  <button class="cta">Купити зараз - 199 грн</button>
</body>
</html>`;
  }
  
  // CSS для Landing Page
  private static getDemoLandingCSS() {
    return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.hero { text-align: center; padding: 80px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.hero h1 { font-size: 48px; margin-bottom: 20px; }
.hero p { font-size: 24px; margin-bottom: 40px; opacity: 0.9; }
.cta { background: white; color: #667eea; border: none; padding: 16px 48px; font-size: 18px; font-weight: bold; border-radius: 50px; cursor: pointer; transition: transform 0.2s; }
.cta:hover { transform: scale(1.05); }
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 40px; padding: 80px 20px; max-width: 1200px; margin: 0 auto; }
.feature { text-align: center; }
.feature span { font-size: 64px; }
.feature h3 { margin: 20px 0 10px; font-size: 24px; }
.program { max-width: 600px; margin: 0 auto; padding: 80px 20px; }
.program h2 { text-align: center; margin-bottom: 40px; font-size: 36px; }
.program ul { list-style: none; }
.program li { padding: 20px; margin: 10px 0; background: #f7f7f7; border-radius: 12px; font-size: 18px; }`;
  }
}