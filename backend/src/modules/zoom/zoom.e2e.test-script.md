# Zoom E2E Test Script (Prompt 29)

## Preconditions
- `FOCUS_TELEGRAM_CHANNEL_ID=-1003324208087`
- `COACH_TELEGRAM_ID=<coach_telegram_user_id>`
- Backend restarted after webhook/allowed_updates updates
- Keep `[DEBUG channel_post]` and `[syncChannelPost]` logs enabled

## Scenario 1: Channel -> DB parser
### 1A Valid template with Link
Post in channel:
```
Дата: 15.06.2026
Час: 19:00
Тема: Ціль і фокус
Link: https://zoom.us/j/111111111
```
Expected:
- log `[DEBUG channel_post]` with channel id `-1003324208087`
- logs `[syncChannelPost] start` and `[syncChannelPost] done`
- `ZoomSession` created at `15.06.2026 19:00`
- pinned channel schedule updated

### 1B Valid template without Link
Post:
```
Дата: 22.06.2026
Час: 19:00
Тема: Рішення і дія
```
Expected:
- `ZoomSession` created
- `requests.zoomLink` empty string
- pinned post updated
- coach receives confirmation

### 1C Regular non-structured post
Post:
```
Всім привіт! Сьогодні активна неділя
```
Expected:
- ignored silently
- no session create/update

### 1D Structured post with invalid date
Post:
```
Дата: 32.13.2026
Час: 19:00
Тема: Тест
```
Expected:
- session is not created
- coach receives validation error

## Scenario 2: `/zoom add`
Command:
```
/zoom add 2026-06-20 19:00 "Вибір і напрям" https://zoom.us/j/222
```
Expected:
- `ZoomSession` created
- `syncChannelPost` logs shown
- subscribers push sent

## Scenario 3: Coach panel create
Create in UI:
- Date `25.06.2026`
- Time `19:00`
- Topic `Стан і ресурс — фінал`
- Link `https://zoom.us/j/333`
- Type `group_practice`
Expected:
- session in DB
- channel sync done
- subscribers push sent

## Scenario 4: Reminder -24h / -2h
Use fast-forward endpoint and verify:
- -24h reminder sent
- -2h reminder sent
- -2h message includes zoom link when available

## Scenario 5: Private slot swap
Run A-E flow:
- create two private sessions with two attendees
- create swap request
- accept flow: attendees swapped, jobs re-scheduled, coach notified
- decline flow: requester notified, schedule unchanged
- expire flow: status `EXPIRED`, requester notified

## Scenario 6: `/start` user-state matrix
Verify 6A-6D states as defined in Prompt 29:
- new user
- test result without payment
- paid + zoomAttended=0
- paid + zoomAttended>=1

## Scenario 7: Full paid analysis
Press full analysis CTA and verify expected copy/buttons.

## Final Checklist
Fill after execution:

| Scenario | Status |
|---|---|
| 1A | ✅/❌/? |
| 1B | ✅/❌/? |
| 1C | ✅/❌/? |
| 1D | ✅/❌/? |
| 2 | ✅/❌/? |
| 3 | ✅/❌/? |
| 4 | ✅/❌/? |
| 5A-E | ✅/❌/? |
| 6A-D | ✅/❌/? |
| 7 | ✅/❌/? |
