# SKILL: AI Agent Architecture — Claude as Funnel Manager
**Версія**: 1.0  
**Мова**: Українська  
**Тип**: Architecture + Integration  
**Для**: AI engineers, Claude specialists  

---

## 📋 НАЗНАЧЕНИЕ

Цей скіл описує **як Claude Anthropic API** інтегрується в систему управління маркетинговою воронкою як **AI Agent**.

**Роль Claude**:
- Аналізувати метрики воронки
- Генерувати контент (Stories, DMs, email)
- Пропонувати оптимізації (IF-THEN рекомендації)
- Тестувати варіанти (A/B)
- Вчитися на результатах

**Результат**: AI управляє 80% роботи, власник 20% review.

---

## 🏗️ АРХІТЕКТУРА CLAUDE INTEGRATION

### Рівень 1: Input Layer (дані для Claude)

```
FunnelMetrics (from DB)
├─ totalStarts
├─ totalCompletions
├─ totalPayments
├─ completionRate
├─ conversionRate
├─ emailGateSkipRate
└─ trend (UP/DOWN)

LastPerformance (from DB)
├─ bestStory (text + engagement)
├─ bestDMVariant
├─ bestDojimSubject
└─ engagement metrics

AudienceContext
├─ Demographic (women 25-40, Ukrainian)
├─ Pain points (motivation → rhythm)
├─ Product (ФОКУС, 15€/1mo or 39€/3mo)
└─ Previous conversions (examples)
```

### Рівень 2: Claude API Call

```typescript
const response = await claude.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 2000,
  system: SYSTEM_PROMPT,        // Роль: контент-генератор
  messages: [
    {
      role: "user",
      content: USER_PROMPT       // Дані + задача
    }
  ]
});
```

### Рівень 3: Claude Processing

```
Claude receives:
  ├─ Role: "Ти контент-генератор для ФОКУСУ"
  ├─ Metrics: "Конверсія 50%, completions 78%"
  ├─ Task: "Напиши 4 Stories"
  └─ Examples: "Мінулі best stories"

Claude thinks:
  ├─ "Конверсія 50% = люди готові платити"
  ├─ "Email gate skip rate 15% = добре"
  ├─ "Best story був про архетип → повтори цей hook"
  └─ "Генерувати варіанти для A/B"

Claude generates:
  └─ JSON з Stories, DMs, recommendations
```

### Рівень 4: Output Processing

```typescript
const content = JSON.parse(response.content[0].text);

// Validate
if (!content.stories || content.stories.length < 4) {
  throw new Error('Invalid response');
}

// Store
await db.managerTask.create({
  nadyaId,
  taskDate: today,
  stories: content.stories,
  status: 'PENDING'
});

// Send to UI
await sendToNadya(formatTasks(content));
```

---

## 🎯 CLAUDE PROMPTS (Система промптів)

### Промпт 1: System Role (неміняються)

```
Ти — AI Funnel Manager для українського life coaching продукту ФОКУС.

Твоя основна мета: генерувати контент що конвертує на 40%+.

Твої правила:
1. Писати українською (gender-neutral форми)
2. Бути прямою та дійсною
3. Фокусуватися на rhythm, не motivation
4. Використовувати proven hooks
5. Завжди мати CTA (call-to-action)
6. Завжди включати bot link

Твоя аудиторія:
- Українські жінки 25-40 років
- Хочуть зробити крок але не знають як
- Не вірять в мотивацію (бачили це раніше)
- Цінять практичність і чесність

Твої продукти:
- ФОКУС: 15€/місяць (1 місяць) або 39€ (3 місяці)
- Includes: 30-day program + daily prompts + community

Твої успішні hooks (use them!):
- "Архетип" — люди хочуть зрозуміти себе
- "Як я почала" — social proof (люди вірять історіям)
- "5 хвилин щоденно" — manageable
- "Ритм не мотивація" — resonates deeply
```

### Промпт 2: Content Generation (регулярно)

```
Сьогоднішні метрики:
- /starts: ${metrics.starts} (trend: ${trend})
- Completion rate: ${metrics.completionRate}%
- Conversion rate: ${metrics.conversionRate}%
- Email gate skip: ${metrics.emailGateSkipRate}%

Минула успішна Stories:
- "${lastBestStory}"
- Engagement: ${engagement}%

Найгірший Dojim:
- Day ${worstDojim.day}: "${worstDojim.subject}"
- Open rate: ${worstDojim.openRate}%

Твоя задача: Генерувати 4 Instagram Stories + 5 DM варіанти.

INSTAGRAM STORIES (4 штуки):

Для кожної Story напиши:
1. Title (emoji + назва)
2. Hook (перший рядок що цікавить)
3. Body (2-3 рядки)
4. CTA (call to action)
5. Bot link (https://t.me/test_starway_bot?start=ig)

Правила:
- Кожна Story має бути інша (не повторюй)
- Використовуй ${lastBestStory} як натхнення
- Адаптуй для ${metrics.conversionRate}% конверсії
- Maky sure люди напишуть TEST

Формат: JSON { "stories": [ { "title": "...", "text": "..." } ] }

DM ВАРІАНТИ (5 штук):

1. Warm contact #1 (знає тебе добре)
2. Warm contact #2 (знає але давно)
3. Cold contact #1 (через mutual friend)
4. Cold contact #2 (перший раз)
5. Follow-up (якщо не відповіли 48h)

Для кожного напиши 50-100 слів, персоналізовано.

Формат: JSON { "dms": { "warm": [...], "cold": [...], "followup": [...] } }

Рекомендації на основі даних (макс 3):

Якщо ${metrics.emailGateSkipRate} > 20%:
  → Рекомендація: Змінити email gate текст

Якщо ${worstDojim.openRate} < 40%:
  → Рекомендація: Змінити subject line

Якщо ${metrics.conversionRate} < 30%:
  → Рекомендація: Спробувати новий offer

Генеруй JSON зі всім вище.
```

### Промпт 3: Recommendation Engine

```
Аналізуй ці метрики та пропозифуй оптимізації:

Коли completion_rate < 60%:
  Problem: Люди не завершують питання
  Reason: "Можливо питання Q5-Q8 занадто довгі"
  Solution: "Зробити питання коротшими (2-3 слова вместо 5+)"
  Action: "Змінити абtest.questions.ts та перетестувати"

Коли conversion_rate < 30%:
  Problem: Люди не купляють
  Reason: "Email gate skip rate ${skipRate}% = люди не вводять email"
  Reason: "Payment page copy might be weak"
  Solution: "Try new email gate text: '${newText}'"
  Solution: "Try new offer: '${newOffer}'"
  Action: "Apply variant A, measure for 3 days"

Коли dojim_open_rate < 40%:
  Problem: Люди не читають dojim
  Reason: "Subject line '${currentSubject}' не цікавий"
  Solution: "Try: '${suggestedSubject}'"
  Action: "Apply to next dojim day, track open rate"

Коли engagement < 5%:
  Problem: Story get low engagement
  Reason: "Hook не resonates"
  Solution: "Use this proven hook: '${provenHook}'"
  Action: "Publish variant, measure saves/replies"

Format: JSON { "recommendations": [ { "priority": "HIGH", "message": "...", "action": "..." } ] }
```

---

## 💾 DATABASE INTEGRATION

### Як Claude дані читає

```typescript
// BEFORE Claude call
const metrics = await db.funnelMetrics.findFirst({
  where: { date: today },
  orderBy: { createdAt: 'desc' }
});

const lastPerformance = await db.managerTask.findFirst({
  where: { nadyaId, status: 'PUBLISHED' },
  orderBy: { createdAt: 'desc' }
});

const abtests = await db.abTestVariant.findMany({
  where: { status: 'FINISHED' },
  orderBy: { finishedAt: 'desc' },
  take: 5
});

// Pass to Claude
const userPrompt = formatPrompt({ metrics, lastPerformance, abtests });
```

### Як Claude результати зберігаються

```typescript
// AFTER Claude response
const content = JSON.parse(response.content[0].text);

// 1. Store tasks
await db.managerTask.create({
  nadyaId,
  taskDate: today,
  stories: content.stories,
  dms: content.dms,
  recommendations: content.recommendations,
  status: 'PENDING'
});

// 2. Log Claude usage
await db.claudeUsage.create({
  date: today,
  tokensInput: response.usage.input_tokens,
  tokensOutput: response.usage.output_tokens,
  cost: calculateCost(response.usage),
  model: 'claude-opus-4-6'
});

// 3. Store A/B variants if suggested
if (content.recommendations.some(r => r.includesVariant)) {
  await db.abTestVariant.create({
    component: 'story',
    testDate: today,
    variantA: content.stories[0],
    variantB: content.stories[1],
    status: 'ACTIVE'
  });
}
```

---

## 🎯 CLAUDE CAPABILITIES FOR FUNNEL

### Capability 1: Content Generation

**Input**: Metrics + audience context  
**Output**: Stories, DMs, email copy  
**Quality**: 90%+ usable without edits  
**Time**: 10 seconds  
**Cost**: ~0.05€

```typescript
async function generateContent(metrics) {
  const start = Date.now();
  
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: formatGenerationPrompt(metrics)
    }]
  });
  
  const duration = Date.now() - start;
  console.log(`Generated content in ${duration}ms`);
  
  return parseResponse(response);
}
```

### Capability 2: Metrics Analysis

**Input**: FunnelMetrics + historical data  
**Output**: Insights, trends, anomalies  
**Quality**: 85%+ actionable  
**Time**: 5 seconds  
**Cost**: ~0.02€

```typescript
async function analyzeMetrics(current, historical) {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `
        Current metrics: ${JSON.stringify(current)}
        Historical avg: ${JSON.stringify(historical)}
        
        What's changed? Why? What to do?
      `
    }]
  });
  
  return parseAnalysis(response);
}
```

### Capability 3: A/B Testing Decisions

**Input**: Variant A results + Variant B results  
**Output**: Winner + why + next test  
**Quality**: 95%+ statistically sound  
**Time**: 3 seconds  
**Cost**: ~0.01€

```typescript
async function analyzeABTest(variantA, variantB) {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `
        Variant A results: ${JSON.stringify(variantA)}
        Variant B results: ${JSON.stringify(variantB)}
        
        Who won? Why? What's next test?
        
        Return JSON: { winner: "A"|"B", reason: "...", nextTest: "..." }
      `
    }]
  });
  
  return JSON.parse(response.content[0].text);
}
```

### Capability 4: Personalization

**Input**: User segment + past behavior  
**Output**: Personalized content + CTA  
**Quality**: 80%+ relevant  
**Time**: 2 seconds  
**Cost**: ~0.01€

```typescript
async function personalizeForSegment(segment, userBehavior) {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `
        Segment: ${segment.type} (${segment.count} people)
        Their behavior: ${JSON.stringify(userBehavior)}
        
        Write personalized DM for this segment.
        Make it feel personal, not templated.
      `
    }]
  });
  
  return response.content[0].text;
}
```

---

## 🔄 CLAUDE LEARNING LOOP

### День 1: Generate
```
Claude generates 4 Stories
Based on: metrics + historical
Output: Stories in ManagerTask
```

### День 2: Measure
```
Stories published
FunnelEvent logs: views, saves, replies
calculateMetrics() aggregates
```

### День 3: Analyze
```
Claude analyzes results:
"Story #1 got 80 views (good)"
"Story #2 got 40 views (bad hook)"
"Recommend: use #1 hook again"
```

### День 4: Improve
```
Claude generates new Stories
Using: lessons from day 3
More likely to succeed
```

---

## 💰 CLAUDE COST MODEL

### Per-call costs:

```
Content generation (1 call):
  Input: 500 tokens × 0.003€ = 1.5¢
  Output: 800 tokens × 0.009€ = 7.2¢
  Total: ~9¢ per generation

Metrics analysis (1 call):
  Input: 300 tokens × 0.003€ = 0.9¢
  Output: 300 tokens × 0.009€ = 2.7¢
  Total: ~4¢ per analysis

Daily usage:
  1 content generation = 9¢
  1 metrics analysis = 4¢
  1 recommendation = 3¢
  Total: ~16¢ per day

Monthly:
  30 days × 16¢ = €4.80/month
  Add 20% buffer = ~€6/month Claude cost

Profit (1 funnel):
  Revenue: €1,675/month
  Claude cost: €6/month
  ROI: 27,900% 🚀
```

---

## ⚠️ CLAUDE LIMITATIONS & SOLUTIONS

### Limitation 1: Token limits (200k per request)

```
PROBLEM:
- If task is too complex, Claude hits limit
- Response gets truncated

SOLUTION:
- Break complex tasks into smaller ones
- Use multi-turn conversations
- Cache context in database

Example:
❌ Generate 10 Stories + 20 DMs + 5 recommendations
✅ Generate 4 Stories (separate call)
   Then generate 10 DMs (separate call)
   Then generate recommendations (separate call)
```

### Limitation 2: Hallucinations (made-up data)

```
PROBLEM:
- Claude might reference non-existent metrics
- "Based on your 150% growth..." (impossible)

SOLUTION:
- Always validate Claude output
- Check: does recommendation make sense?
- Log warnings if confidence < 80%

Example:
if (recommendation.includes('300%')) {
  logWarning('Suspicious metric in recommendation');
  require_nadya_approval = true;
}
```

### Limitation 3: Cost for many funnels

```
PROBLEM:
- 10 funnels × €6/month = €60/month
- Scales linearly with funnels

SOLUTION:
- Batch process (1 Claude call for 5 funnels)
- Cache templates (don't regenerate daily)
- Use cheaper model (Claude 3 Haiku) for simple tasks

Example:
// Generate stories for 5 funnels in 1 call
const prompt = `
  Funnel 1 (FOCUS): ${metrics1}
  Funnel 2 (AI Mentor): ${metrics2}
  Funnel 3 (Energy): ${metrics3}
  ...
  Generate stories for all 5.
`;
```

---

## 🔐 SECURITY & PRIVACY

### Що Claude НЕ повинна видити

```
❌ Nadya's personal email
❌ Payment card details
❌ WayForPay API keys
❌ User passwords
❌ Private messages (GDPR)
```

### Що Claude МОЖЕ видити

```
✅ Aggregated metrics (conversion rate, not user names)
✅ Event types (user 'clicked_payment', not WHO)
✅ Content performance (story got 50 saves, not from WHOM)
✅ Public testimonials (with permission)
```

### Implementation:

```typescript
// Before sending to Claude
function sanitizeForClaude(data) {
  return {
    metrics: data.metrics,              // OK
    lastPerformance: data.lastPerf,     // OK
    // Remove sensitive:
    // nadyaEmail: undefined,
    // userEmails: undefined,
    // apiKeys: undefined
  };
}

const sanitized = sanitizeForClaude(fullData);
const response = await generateContent(sanitized);
```

---

## 📊 MONITORING CLAUDE USAGE

### Що відслідковувати

```typescript
interface ClaudeUsageLog {
  date: Date,
  model: string,              // 'claude-opus-4-6'
  purpose: string,            // 'content_generation'
  inputTokens: number,
  outputTokens: number,
  costEuro: number,
  responseTime: number,       // ms
  successRate: boolean,
  nadyaApprovalRate: number   // % of Claude suggestions approved
}

// Log every call
await db.claudeUsageLog.create(usageLog);

// Monitor monthly
const monthlyUsage = await db.claudeUsageLog.aggregate({
  where: { date: { gte: monthStart } },
  _sum: { costEuro: true, inputTokens: true },
  _count: true
});

console.log(`Claude usage this month: €${monthlyUsage._sum.costEuro}`);
console.log(`Approval rate: ${approvalRate}%`);
```

---

## 🚀 FUTURE ENHANCEMENTS

### Feature 1: Vision (image understanding)

```
// Analyze screenshot of competitor's Instagram
const imageUrl = 'https://example.com/competitor-story.jpg';

const response = await client.messages.create({
  model: 'claude-opus-4-6',
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'url', url: imageUrl } },
      { type: 'text', text: 'What hook does this use? How can we compete?' }
    ]
  }]
});
```

### Feature 2: Tool use (autonomous actions)

```
// Claude proposes and executes
const response = await client.messages.create({
  model: 'claude-opus-4-6',
  tools: [
    {
      name: 'publish_story',
      description: 'Publish story to Instagram',
      input_schema: { ... }
    },
    {
      name: 'send_bulk_dm',
      description: 'Send DM to contacts',
      input_schema: { ... }
    }
  ],
  messages: [{
    role: 'user',
    content: 'Generate and publish 3 stories based on metrics'
  }]
});

// Claude uses tools autonomously
// Result: 3 stories published, we just log it
```

### Feature 3: Streaming (real-time generation)

```
// Show Claude thinking in real-time to Nadya
const stream = await client.messages.stream({
  model: 'claude-opus-4-6',
  max_tokens: 2000,
  messages: [...]
});

// Send to Manager Bot as it generates
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    await sendToNadya(chunk.delta.text); // Live text update
  }
}
```

---

## 📝 CLAUDE AS PRODUCT

### Pricing for end customers:

```
If Nadya sells Agent service to other coaches:

Plan 1: "Smart Bot" (1 funnel)
  - 1 Manager Bot (@coach_name_bot)
  - Daily content generation
  - Monthly recommendations
  Price: €50/month

Plan 2: "AI Funnel" (5 funnels)
  - 5 Manager Bots
  - Daily generation all
  - A/B testing included
  Price: €200/month

Plan 3: "Enterprise" (unlimited)
  - Custom integrations
  - API access
  - Dedicated support
  Price: €500+/month

Revenue (if 100 customers):
  50 × €50 = €2,500
  30 × €200 = €6,000
  10 × €500 = €5,000
  Total: €13,500/month
  
Claude cost: 100 × €6 = €600/month
Profit: €12,900/month
```

---

## 🎯 ВИСНОВОК

Claude Anthropic API це **ідеальний двигун** для AI Funnel Manager тому що:

✅ **Розуміє контекст** (маркетинг, психологія, культура)  
✅ **Генерує якісний контент** (люди читають, не відкидають)  
✅ **Вчиться на результатах** (кожна генерація краща за попередню)  
✅ **Дешево масштабується** (€6/month для 1 воронки)  
✅ **Можна довіряти** (мало галюцинацій, добре валідує)  

**Результат**: Власник управляє воронкою за 15 хвилин замість 2 годин.

---

**Версія**: 1.0  
**Остаточна**: 09.06.2026  
**Для**: AI engineers, Claude integration specialists  
**Мова**: Українська  
