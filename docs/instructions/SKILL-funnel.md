# SKILL: funnel
> Статус: ACTIVE — за scheduler + followups контентом

## Джерела
- `backend/src/services/scheduler/index.ts`
- `backend/src/products/ab-system/content/abTest.followups.ts`

## Lifecycle reminders (R1-R8, Z1-Z2, SE)
| ID | Тригер | Час | Дія | Copy-файл |
|---|---|---|---|---|
| `R1` | `TEST_NOT_STARTED` | +24h | нагадати старт тесту (`ab_test:start`) | `abTest.followups.ts` (`AB_TEST_LIFECYCLE_REMINDERS.R1_TEST_24H`) |
| `R2` | `TEST_NOT_STARTED` | +72h | ескалація нагадування старту | `abTest.followups.ts` |
| `R3` | `TEST_IN_PROGRESS` | +4h | повернути в тест (`ab_test:resume`) | `abTest.followups.ts` |
| `R4` | `TEST_IN_PROGRESS` | +24h | повторний дожим до завершення | `abTest.followups.ts` |
| `R5` | `TEST_DONE` | +2h | показати результат (`ab_test:show_result`) | `abTest.followups.ts` |
| `R6` | `TEST_DONE` | +48h | CTA у ФОКУС (`open_focus_payment`) | `abTest.followups.ts` |
| `R7` | `OFFER_SHOWN` | +6h | нагадати оффер | `abTest.followups.ts` |
| `R8` | `OFFER_SHOWN` | +3d | фінальний дожим офферу | `abTest.followups.ts` |
| `Z1` | `ZOOM_MEMBER` | Пн 18:00 | zoom reminder (`focus:next_zoom`) | `abTest.followups.ts` |
| `Z2` | `ZOOM_MEMBER` | Пн 18:55 | zoom reminder | `abTest.followups.ts` |
| `SE2` | monthly service event | 1 число, 00:00 | reset `swapsUsedThisMonth` | `scheduler/index.ts` + `zoom/service.ts` |

## AI воронка (objections)
- Objection callbacks обробляються у `backend/src/products/ab-system/telegram/abTest.aiSeller.ts` (`ai_seller:objection:*`).
- Відповіді зараз беруться переважно з контент-реєстру (`aiSeller.content.ts`), не напряму генеруються GPT у цьому хендлері.
- GPT-4o в проекті використовується в інших AI-сервісах (`ai.registry.ts`, `ai-mentor`, `web-map`, `sales-assistant`).
- TODO: якщо потрібен strict flow `заперечення → GPT-4o → відповідь` саме в abTest objections, перевір вручну/допроєктуй окремо.
