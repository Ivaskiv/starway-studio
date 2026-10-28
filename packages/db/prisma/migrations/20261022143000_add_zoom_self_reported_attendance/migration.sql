-- Keep a participant's own checkpoint distinct from coach/Zoom-verified attendance.
ALTER TABLE "ZoomSessionAttendee"
  ADD COLUMN "selfReportedAttended" BOOLEAN,
  ADD COLUMN "selfReportedAt" TIMESTAMP(3);
