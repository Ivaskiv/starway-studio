// backend/src/modules/mentorship/types.ts
import { MentorshipStatus, Prisma } from "@/db/generated/prisma/client.js";

export interface Mentorship {
  id: string;
  userId: string;
  mentorId: string;
  status: MentorshipStatus;
  startsAt: Date; 
}

export interface MentorshipOffer {
  id: string;
  userId: string;
  expertId: string;
  status: MentorshipStatus;
  offerDetails: Prisma.JsonValue;
  createdAt: Date;
}