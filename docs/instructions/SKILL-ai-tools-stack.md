---
name: ai-tools-stack
description: Стек AI-інструментів STARWAY — який інструмент для якої задачі, бюджетні альтернативи, промпти для кожного сервісу. Використовуй коли потрібно: згенерувати відео, зробити озвучку, створити зображення, змонтувати рілс, транскрибувати аудіо.
version: 2.0
author: Starway Studio
---

# SKILL: AI Tools Stack STARWAY
**Який інструмент · Для чого · Скільки коштує · Як промптити**

---

## ГОЛОВНИЙ ПРИНЦИП

```
БЕЗКОШТОВНО або ДЕШЕВО = без втрати якості.
Платимо тільки за те що не можна отримати безкоштовно.

Пріоритет вибору інструменту:
1. Безкоштовно + потрібна якість → беремо
2. Pay-as-you-go → беремо якщо < $10/міс реально
3. Підписка → тільки якщо використовується щодня
```

---

## СТЕК ПО ЗАДАЧАХ

### 🎬 ВІДЕО — Генерація з промпту

| Задача | Інструмент | Ціна | Коли використовувати |
|--------|-----------|------|----------------------|
| Реалістичний рух людей, міміка | **Kling AI 2.6/3.0** | ~66 кредитів/день безкоштовно | Основний відеогенератор для рілсів |
| Кінематографічна зміна атмосфери | **Google Veo 3** | Безкоштовно (AI Studio) | Перехід стан→трансформація |
| Різка візуальна трансформація | **Pika 2.5** | Безкоштовно (базово) | "Розрив" сцени, ефекти |
| API-доступ до всіх моделей | **Fal.ai** | Pay-as-you-go (центи/ролик) | Автоматизація через код |
| Швидкий монтаж → Reels | **CapCut Desktop** | Безкоштовно | Фінальний монтаж і субтитри |

**Замінює:** Higgsfield ($$$), Seedance 2.0 ($$$)

---

### 🗣️ ОЗВУЧКА — Голос Наді та інші

| Задача | Інструмент | Ціна | Коли використовувати |
|--------|-----------|------|----------------------|
| Клонування голосу (укр.) | **Fish Audio** | Стартові кредити безкоштовно | Голос Наді у всіх рілсах |
| Self-hosted клонування | **Coqui XTTS v2** | Безкоштовно (свій сервер) | Якщо є GPU на Render |
| Швидка озвучка без клону | **ElevenLabs** | 10к символів/міс безкоштовно | Тестові озвучки |
| Open-source zero-shot | **OpenVoice** | Безкоштовно | Альтернатива без реєстрації |

**Замінює:** Vox ($$$)

---

### 🎨 ЗОБРАЖЕННЯ — Банери, обкладинки, промо

| Задача | Інструмент | Ціна | Коли використовувати |
|--------|-----------|------|----------------------|
| Фото з Надею в кадрі | **GPT Image 4** | Включено в ChatGPT Plus | Промо з реальним фото коуча |
| Стилізовані ілюстрації | **Flux.1 (через Fal.ai)** | Pay-as-you-go | Абстрактні візуали для постів |
| Швидкі банери | **Canva AI** | Безкоштовно | Telegram-банери, обкладинки |
| Batch-генерація | **ComfyUI + Flux** | Безкоштовно (локально) | Серії зображень для каналу |

---

### 📝 ТРАНСКРИПЦІЯ — Zoom, голосові

| Задача | Інструмент | Ціна | Коли використовувати |
|--------|-----------|------|----------------------|
| Точна укр. транскрипція | **Whisper API (OpenAI)** | ~$0.006/хв | Основний транскрибатор |
| Безкоштовно локально | **Whisper local** | Безкоштовно | Якщо є сервер |
| Zoom-запис → текст | **Otter.ai** | 600 хв/міс безкоштовно | Транскрипти Zoom-практик |

---

### 📊 АНАЛІТИКА — Поведінка, воронка

| Задача | Інструмент | Ціна | Коли використовувати |
|--------|-----------|------|----------------------|
| Основна аналітика | **Власний analytics.service.ts** | Безкоштовно | Revenue, funnel, churn |
| Instagram аналітика | **Meta Business Suite** | Безкоштовно | Охоплення, CTR постів |
| UTM-трекінг | **utm.io або власний** | Безкоштовно | Instagram → тест → покупка |

---

## ПРОМПТИ ДЛЯ КОЖНОГО ІНСТРУМЕНТУ

### Kling AI — Промпт-формула для рілсів ABSystem

```
СТРУКТУРА ПРОМПТУ KLING:

[SUBJECT]: Ukrainian woman coach, 35-45 years old, warm confident energy,
natural appearance, [конкретна емоція/дія в цій сцені]

[SETTING]: [локація — home office / cafe / nature / minimal studio]

[CAMERA]: [рух камери]
Варіанти:
- slow push in (наближення)
- static medium shot (нерухомо, середній план)  
- handheld slight movement (живий ефект)
- slow pan right (повільне панорамування)

[LIGHTING]: [тип освітлення]
Варіанти:
- soft natural window light (ранкове)
- warm golden hour (вечірнє)
- soft studio light, neutral (нейтральне)

[STYLE]: cinematic, photorealistic, 9:16 vertical format,
shallow depth of field, no text overlays

[MOOD]: [настрій сцени]
Варіанти для ABSystem:
- introspective, quiet internal struggle (СТАН)
- moment of clarity and realization (ВИБІР→РІШЕННЯ)
- calm focused energy, purposeful (ДІЯ)
- warm hopeful, new beginning (після трансформації)

[DURATION]: 5-6 seconds
[NEGATIVE]: blurry, distorted face, text in frame, watermark, unrealistic

ПРИКЛАД ГОТОВОГО ПРОМПТУ:
"Ukrainian woman coach, 35-40yo, sitting at desk looking out window
with thoughtful slightly frustrated expression. Soft natural window light.
Camera: slow gentle push in toward her face. Cinematic, photorealistic,
9:16 vertical, shallow depth of field. Mood: quiet internal struggle,
introspective. 5 seconds. No text, no watermark."
```

---

### Google Veo 3 — Промпт для зміни атмосфери

```
СТРУКТУРА ПРОМПТУ VEO 3:

A [тривалість]-second cinematic vertical video (9:16).

SCENE TRANSITION:
Opens with: [опис початкового емоційного стану — тривога/напруга/втома]
Transitions to: [опис кінцевого стану — спокій/ясність/фокус]

SUBJECT: [опис людини або предмету]
SETTING: [локація]

CINEMATOGRAPHY:
- Lighting shifts from [cold/harsh] to [warm/soft]
- Camera movement: [static / slow zoom / drift]

COLOR GRADE:
- Start: desaturated, cool tones
- End: warm, slightly golden

MOOD ARC: from [tension/overwhelm] to [clarity/peace]
No dialogue. No text overlays. Photorealistic.

ПРИКЛАД:
"A 8-second cinematic vertical video (9:16).
Opens with a woman staring at her phone, tense, overwhelmed,
harsh cool office lighting. Camera slowly pulls back.
Transitions to: same woman at desk, calm, writing in journal,
warm golden afternoon light fills the room.
Color grade shifts from desaturated cool to warm amber tones.
Mood arc: from anxiety to quiet focus. No text. Photorealistic."
```

---

### Fish Audio — Налаштування голосу Наді

```
ПАРАМЕТРИ ДЛЯ КЛОНУВАННЯ:

1. Завантаж зразок голосу Наді (мінімум 30 секунд чистого аудіо)
2. Назви модель: "Nadya_ABSystem_UA"
3. Параметри генерації:
   - Language: Ukrainian (uk)
   - Speed: 0.95 (трохи повільніше норми — вдумливо)
   - Stability: 0.75
   - Similarity: 0.85

ТЕГИ ЕМОЦІЙНОГО СТАНУ для скриптів:
[calm] — спокійний, роздумливий тон
[warm] — тепло, особисто
[direct] — впевнено, прямо
[gentle] — м'яко, підтримуючи
[energized] — енергійно, надихаюче

ФОРМАТ СКРИПТУ:
[warm] Ти вже третій тиждень повертаєшся до одного рішення. [pause]
[calm] Це не слабкість. Це сигнал що щось важливіше чекає за ним.
[direct] Тест покаже твою точку за три хвилини.
```

---

### GPT Image 4 — Промпти для банерів ABSystem

```
ПРОМПТ-ШАБЛОН A (з Надею):

"Professional coaching photo of Ukrainian woman named Nadya,
[вставити опис зовнішності Наді], warm confident expression.
[Локація/фон відповідно до продукту].
Style: clean, premium, editorial photography feel.
Colors: warm neutrals, slight purple accent (#6366f1).
Format: [розміри — 1080x1920 для Reels / 1080x1080 для пост].
No text in image. Professional lighting."

ПРОМПТ-ШАБЛОН B (абстрактний для методології):

"Minimal abstract illustration representing [тема точки ABSystem].
For СТАН: woman figure, scattered energy, warm chaos
For ЦІЛЬ: clear arrow path through fog, golden light ahead
For ВИБІР: two paths diverging, person at crossroads, soft light
For РІШЕННЯ: hand placing final piece of puzzle, satisfying click moment  
For ДІЯ: person in motion, purposeful stride, dynamic composition
Style: modern, clean lines, brand colors purple #6366f1 and amber #f59e0b.
No text. Vertical 9:16 format."
```

---

### CapCut Desktop — Workflow для Reels

```
АЛГОРИТМ МОНТАЖУ РІЛСУ ЧЕРЕЗ CAPCUT:

КРОК 1: Імпорт
- Завантажити відеосцени з Kling/Veo 3 (5-7 кліпів)
- Завантажити озвучку з Fish Audio

КРОК 2: AI Auto-Captions
- Script → Auto Captions → Ukrainian
- Стиль субтитрів: великий шрифт, контраст, нижня третина

КРОК 3: Синхронізація
- Підрізати кліпи під тайм-коди скрипту
- Музика: -20dB під голос

КРОК 4: Текст на екрані
- Ключові слова: виділити іншим кольором (#f59e0b)
- Шрифт: Montserrat Bold або Inter Black

КРОК 5: Експорт
- 1080×1920, 30fps, H.264
- Без водяного знаку (Desktop версія)
```

---

## ПАЙПЛАЙН ПОВНОГО РІЛСУ (від ідеї до публікації)

```
ЧАС: ~2-3 години на один рілс (з AI)

КРОК 1 (15 хв): Claude → /video-tz [тема]
  Отримуємо: скрипт, 5 сцен, промпти для кожної

КРОК 2 (30 хв): Kling AI → генерація 5 відеосцен
  Вхід: промпти зі скілу SKILL-creative-ads
  Вихід: 5 відеокліпів по 5-6 секунд

КРОК 3 (10 хв): Fish Audio → озвучка
  Вхід: текст скрипту з тегами [warm][direct][calm]
  Вихід: MP3 файл голосом Наді

КРОК 4 (30 хв): Google Veo 3 → transition сцена (якщо потрібна)
  Вхід: промпт зміни атмосфери
  Вихід: кінематографічна перехідна сцена

КРОК 5 (30 хв): CapCut Desktop → монтаж
  Вхід: всі кліпи + озвучка
  Вихід: готовий Reels 1080×1920 30fps

КРОК 6 (5 хв): Публікація
  Instagram → тест (CTA в біо або stories)
  Telegram-канал → анонс або дублікат
```

---

## БЮДЖЕТ НА МІСЯЦЬ

```
Kling AI:        $0-6/міс    (66 кредитів/день безкоштовно)
Google Veo 3:    $0          (безкоштовно через AI Studio)
Fish Audio:      $0-5/міс    (стартові кредити + мінімум)
CapCut:          $0          (desktop безкоштовно)
Whisper API:     ~$2/міс     (транскрипція Zoom-сесій)
GPT Image 4:     включено    (в ChatGPT Plus $20/міс)
Fal.ai:          $0-5/міс    (pay-as-you-go якщо потрібно)

РАЗОМ: $2-16/міс
vs. Higgsfield + Seedance + Vox: $80-150/міс

ЕКОНОМІЯ: $70-140/міс = $840-1680/рік
```

---

## CHANGELOG
| Версія | Дата | Зміни |
|--------|------|-------|
| 2.0 | 28.05.2026 | Повний стек з бюджетними альтернативами + промпти |
| 1.0 | 28.05.2026 | Перша версія |