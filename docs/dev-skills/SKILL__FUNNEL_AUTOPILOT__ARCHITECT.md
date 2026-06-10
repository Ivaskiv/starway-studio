# SKILL: Funnel Autopilot — Architecture for Engineers
**Версія**: 1.0  
**Мова**: Українська  
**Тип**: Architecture Pattern  
**Для**: Senior engineers, SaaS architects  
**Реиспользуемо для**: Будь-якого SaaS з маркетинговою воронкою  

---

## 📋 НАЗНАЧЕНИЕ

Цей скіл описує **архітектурний pattern** для побудови **AI-управління воронкою** для SaaS проектів.

**Проблема що вирішує**:
- Власник витрачає 2+ години на день на управління маркетингом
- Вручну пише контент, аналізує метрики, плануває оптимізації
- Не може масштабувати на кілька воронок паралельно
- Нема даних для прийняття рішень

**Рішення**:
- AI Agent (Claude) керує 80% роботи
- Власник займається тільки review + approval
- Масштабує на 5-10 воронок за той же час
- Дані-driven decisions через реальні метрики

---

## 🏗️ АРХІТЕКТУРНІ ПРИНЦИПИ

### Принцип 1: Одна правда про метрики

```
ANTI-PATTERN:
├─ Надя рахує в голові
├─ Manager Bot показує одне
├─ Database має інше
└─ Дані не синхронізовані

PATTERN:
├─ FunnelEvent логує ВСЕ (кожна дія)
├─ FunnelMetrics агрегує (щогодини)
├─ Manager Bot читає з DB (одна правда)
└─ Рішення на основі однієї версії
```

**Імплементація**:
- Кожна дія → FunnelEvent в базу (з timestamp)
- CRON щогодини → FunnelMetrics calculate
- API → одна point of truth для UI/Agent
- Жодних ручних розрахунків

### Принцип 2: Non-blocking logging

```
ANTI-PATTERN:
if (logEvent(...)) { // Очікувати результат
  continueFlow();
}

PATTERN:
logEvent(...).catch(err => {
  console.error('Log failed');
  // Не падаємо, користувач бачить результат
});
continueFlow(); // Продовжуємо одразу
```

**Результат**: Логування ніколи не уповільнює бізнес-логіку.

### Принцип 3: API-first architecture

```
Manager Bot
  ↓ (не напряму до DB)
API Routes
  ↓
Services (бізнес-логіка)
  ↓
Database
```

**Переваги**:
- Легко тестувати (mock API)
- Легко розширювати (додавати функції в API)
- Легко масштабувати (microservices потім)
- Легко міняти UI (бот → web → мобільний)

### Принцип 4: Agent як Orchestrator (не Decision Maker)

```
ANTI-PATTERN:
Agent робить рішення → Nadya виконує

PATTERN:
Agent пропонує → Nadya обирає → Agent виконує
```

**Результат**: Надя завжди в контролі, Agent = помічник.

---

## 📐 КОМПОНЕНТИ СТАНДАРТНОЇ СИСТЕМИ

### Компонент 1: Event Logger

**Відповідальність**: Логування кожної дії користувача

**Де використовується**:
- /start command
- Кожна відповідь на питання
- Завершення тесту
- Email gate (skip/submit)
- Offer show
- Payment (click, success, failed)
- Dojim (sent, opened, skipped)

**Вихід**: FunnelEvent записи в DB

**Код pattern**:
```typescript
async function logEvent(
  userId: string,
  eventType: string,
  metadata?: Record<string, any>
) {
  await db.funnelEvent.create({
    data: { userId, eventType, metadata }
  }).catch(err => console.error('Log failed'));
}

// Виклик (non-blocking):
logEvent(userId, 'start', { ip: req.ip });
continueFlow();
```

### Компонент 2: Metrics Calculator

**Відповідальність**: Агрегація подій в метрики

**Коли запускається**: Щогодини (CRON) або по-запросу

**Входи**: FunnelEvent таблиця

**Виходи**: FunnelMetrics запис

**Стандартні метрики**:
```
totalStarts = COUNT(event='start')
totalCompletions = COUNT(event='complete_q*')
totalPayments = COUNT(event='payment_success')

completionRate = completions / starts × 100%
conversionRate = payments / completions × 100%
emailGateSkipRate = skipped / completions × 100%

trend = current vs avg(last 7 days)
```

**Код pattern**:
```typescript
async function calculateMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const events = await db.funnelEvent.groupBy({
    by: ['eventType'],
    where: { createdAt: { gte: today } },
    _count: true
  });
  
  // Map events to numbers
  const totalStarts = events.find(e => e.eventType === 'start')?._count || 0;
  const totalCompletions = events.find(e => e.eventType === 'complete_q8')?._count || 0;
  
  // Calculate rates
  const completionRate = (totalCompletions / totalStarts) * 100;
  
  // Save
  await db.funnelMetrics.create({
    data: {
      date: today,
      totalStarts,
      totalCompletions,
      completionRate,
      // ... інші метрики
    }
  });
}
```

### Компонент 3: Dashboard API

**Відповідальність**: Повернути метрики для UI

**Endpoint**: `GET /api/analytics/dashboard`

**Формат відповіді**:
```json
{
  "today": {
    "starts": 25,
    "completions": 20,
    "payments": 10,
    "completionRate": 80.0,
    "conversionRate": 50.0,
    "trend": "UP"
  },
  "weekTrend": [
    { "date": "2026-06-01", "conversions": 5, "rate": 35 },
    { "date": "2026-06-02", "conversions": 8, "rate": 42 }
  ],
  "goal": {
    "daily": 20,
    "current": 10
  }
}
```

**Код pattern**:
```typescript
router.get('/dashboard', async (req, res) => {
  const today = await getTodayMetrics();
  const weekTrend = await getWeekTrend();
  
  res.json({
    today: formatMetrics(today),
    weekTrend: formatTrend(weekTrend),
    goal: calculateGoal(today)
  });
});
```

### Компонент 4: Manager Bot Interface

**Відповідальність**: UI для Nadya (власника)

**Platform**: Telegram Bot (@starway_manager_bot)

**Функцій**:
1. Show dashboard (метрики)
2. Show tasks (контент що генерував Claude)
3. Allow edits (Nadya редагує)
4. Publish (одним кліком публікувати)
5. Monitor (live статистика)

**Код pattern**:
```typescript
router.post('/manager-webhook', async (req, res) => {
  const { message } = req.body;
  
  if (message.text === '/dashboard') {
    const metrics = await getDashboardMetrics();
    const reply = formatDashboard(metrics);
    await sendMessage(message.chat.id, reply);
  }
  
  res.json({ ok: true });
});
```

### Компонент 5: Content Generator (Claude Integration)

**Відповідальність**: Генерація контенту за Claude API

**Входи**: 
- Поточні метрики
- Минулі результати
- Параметри аудиторії

**Виходи**: 
- Story текст + CTA
- DM варіанти (warm + cold)
- Рекомендації

**Код pattern**:
```typescript
async function generateContent(params: GenerationParams) {
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: formatPrompt(params)
    }]
  });
  
  return JSON.parse(message.content[0].text);
}
```

### Компонент 6: Task Queue

**Відповідальність**: Зберігання denних завдань для Nadya

**Таблиця**: ManagerTask

**Поля**:
- taskDate (коли)
- stories (JSON array)
- dms (JSON object)
- recommendations (JSON array)
- status (PENDING, APPROVED, PUBLISHED)
- nadyaEdits (що змінила)

**Код pattern**:
```typescript
// Щоранку генерувати завдання
async function generateDailyTasks() {
  const metrics = await getMetrics();
  const content = await generateContent(metrics);
  
  await db.managerTask.create({
    data: {
      nadyaId,
      taskDate: today,
      stories: content.stories,
      dms: content.dms,
      status: 'PENDING'
    }
  });
}

// Nadya одобрює
await db.managerTask.update({
  where: { id: taskId },
  data: {
    nadyaEdits: { modified: edits },
    status: 'APPROVED'
  }
});
```

---

## 🔄 DATA FLOW PATTERN

```
User Action (от клієнта)
    ↓
logEvent() [non-blocking]
    ↓
FunnelEvent (zapisati в DB)
    ↓
[CRON щогодини]
    ↓
calculateMetrics()
    ↓
FunnelMetrics (напиши)
    ↓
Dashboard API (читай)
    ↓
Manager Bot (показ Nadya)
    ↓
[Nadya ранку]
    ↓
generateDailyTasks() (Claude)
    ↓
ManagerTask + notification
    ↓
Nadya review + edit
    ↓
Publish button
    ↓
Post to Instagram/Telegram/Email
    ↓
Track in FunnelEvent (loop)
```

---

## 📊 DATABASE SCHEMA PATTERN

```sql
-- Events (immutable, append-only)
CREATE TABLE funnelevent (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES "User",
  eventType VARCHAR, -- 'start', 'answer_q1', 'payment_success'
  metadata JSON,     -- дополнительные данные
  createdAt TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ON funnelevent(userId);
CREATE INDEX ON funnelevent(eventType);
CREATE INDEX ON funnelevent(createdAt);

-- Metrics (aggreated, 1 row per day)
CREATE TABLE funnelmetrics (
  id UUID PRIMARY KEY,
  date DATE UNIQUE,
  totalStarts INT,
  totalCompletions INT,
  totalPayments INT,
  completionRate FLOAT,
  conversionRate FLOAT,
  trend VARCHAR -- 'UP', 'DOWN'
);
CREATE INDEX ON funnelmetrics(date);

-- Tasks for Manager
CREATE TABLE managertask (
  id UUID PRIMARY KEY,
  nadyaId UUID,
  taskDate DATE,
  stories JSON,      -- [{ title, text, cta }]
  dms JSON,         -- { warm: [...], cold: [...] }
  recommendations JSON,
  status VARCHAR,   -- 'PENDING', 'APPROVED', 'PUBLISHED'
  nadyaEdits JSON,  -- що змінила Nadya
  publishedAt TIMESTAMP
);
CREATE INDEX ON managertask(nadyaId, taskDate);
CREATE INDEX ON managertask(status);

-- A/B Tests
CREATE TABLE abtestVariant (
  id UUID PRIMARY KEY,
  component VARCHAR, -- 'story', 'dm', 'dojim'
  testDate DATE,
  variantA JSON,
  variantB JSON,
  resultA JSON,      -- { views, clicks, conversions }
  resultB JSON,
  winner VARCHAR,    -- 'A', 'B'
  status VARCHAR
);
```

---

## ⚠️ ANTI-PATTERNS TO AVOID

### Anti-Pattern 1: Synchronous logging
```
❌ WRONG:
if (!logEvent(...)) { fail() }

✅ RIGHT:
logEvent(...).catch(() => {});
continue();
```

### Anti-Pattern 2: Multiple sources of truth
```
❌ WRONG:
- Dashboard from API
- Manager Bot from cached data
- Reports from SQL directly

✅ RIGHT:
- Single FunnelMetrics table
- All UI reads from it
```

### Anti-Pattern 3: Agent as decision maker
```
❌ WRONG:
Agent → [Auto-publish to Instagram]

✅ RIGHT:
Agent → [Propose to Nadya] → Nadya → [Publish]
```

### Anti-Pattern 4: Mixing business logic with UI
```
❌ WRONG:
Dashboard API contains if-logic, calculations

✅ RIGHT:
Service layer has logic
API just serializes
```

### Anti-Pattern 5: Real-time everything
```
❌ WRONG:
Calculate metrics on every request

✅ RIGHT:
Calculate metrics once per hour (CRON)
Serve from cache (FunnelMetrics table)
```

---

## ✅ IMPLEMENTATION CHECKLIST

### For any new SaaS with funnels:

- [ ] Define core events (what actions matter?)
- [ ] Create FunnelEvent logging (every action)
- [ ] Create FunnelMetrics calculation (aggregation)
- [ ] Create Dashboard API (single source of truth)
- [ ] Create Manager Bot/UI (owner interface)
- [ ] Create ManagerTask queue (daily assignments)
- [ ] Create Content Generator (Claude integration)
- [ ] Create Decision Engine (IF-THEN rules)
- [ ] A/B testing framework (optional, PHASE 2)
- [ ] Advanced analytics (optional, PHASE 3)

### Database:
- [ ] FunnelEvent (append-only log)
- [ ] FunnelMetrics (daily snapshots)
- [ ] ManagerTask (owner tasks)
- [ ] ABTestVariant (A/B results)

### APIs:
- [ ] /api/analytics/dashboard (metrics)
- [ ] /api/manager/tasks (daily tasks)
- [ ] /api/agent/generate-content (Claude)
- [ ] /api/telegram/manager-webhook (bot)

### Services:
- [ ] EventLogger (log everything)
- [ ] MetricsCalculator (aggregate hourly)
- [ ] ContentGenerator (Claude prompts)
- [ ] DecisionEngine (IF-THEN rules)
- [ ] DashboardService (format for UI)

---

## 📈 SCALING PATTERN

### Phase 1: Single funnel
```
1 Manager Bot → 1 Funnel
Time: 2 weeks
Owner time: 15 min/day
Revenue: +1,675€/month
```

### Phase 2: Multiple funnels (same owner)
```
1 Manager Bot → 5 Funnels
Time: +2 weeks (templates)
Owner time: 20 min/day (for 5)
Revenue: +8,375€/month
```

### Phase 3: Multiple owners
```
1 Agent → 10 Funnels × 5 Owners
Time: +3 weeks (multi-tenant)
Owner time: 15 min/day each
Revenue: +50,000€/month
```

**Key**: Architecture supports all 3 phases from start.

---

## 🎯 УСПІХ МЕТРИКИ

| Метрика | Фаза 1 | Фаза 2 | Фаза 3 |
|---------|--------|--------|--------|
| Funnels | 1 | 5 | 10 |
| Owner time/day | 15 min | 20 min | 15 min/owner |
| Revenue/month | +€1,675 | +€8,375 | +€50,000 |
| Cost/month | €200 | €1,000 | €5,000 |
| Net profit | €1,475 | €7,375 | €45,000 |

---

## 📝 ВИСНОВОК

Цей скіл надає **blueprint** для будь-якого SaaS проекту що хоче автоматизувати управління воронкою.

**Ключові принципи**:
1. Event logging (single source of truth)
2. Metrics aggregation (dashboards)
3. AI assistance (not decision-making)
4. API-first (pluggable UI)
5. Scalable from day 1

**Результат**: 80% менше часу на управління, 5× більше фунелів, 300%+ profit growth.

---

**Версія**: 1.0  
**Остаточна**: 09.06.2026  
**Для**: Senior engineers, SaaS architects  
**Мова**: Українська  
