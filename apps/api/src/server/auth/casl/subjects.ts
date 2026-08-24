/**
 * CASL Subjects — centralized subject definitions.
 * Each subject maps to a Prisma model or domain concept.
 *
 * Canonical source is `shared/casl/subjects.ts` (re-exported below).
 */
import { SHARED_SUBJECT_OBJECT, type SharedSubject } from "@shared/casl/actions";

export const Subjects = SHARED_SUBJECT_OBJECT;
export type Subject = SharedSubject;
