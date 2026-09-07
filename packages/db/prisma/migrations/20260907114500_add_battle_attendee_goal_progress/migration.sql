ALTER TABLE "ZoomSessionAttendee"
ADD COLUMN "goalText" TEXT,
ADD COLUMN "progress" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ZoomSessionAttendee" AS attendee
SET
  "goalText" = CASE
    WHEN session."requests"->>'challengerId' = attendee."userId" THEN session."requests"->>'goalA'
    WHEN session."requests"->>'opponentId' = attendee."userId" THEN session."requests"->>'goalB'
    ELSE attendee."goalText"
  END,
  "progress" = COALESCE(session."requests"->'progress'->attendee."userId", attendee."progress")
FROM "ZoomSession" AS session
WHERE attendee."sessionId" = session."id"
  AND session."requests"->>'type' = 'battle_review';
