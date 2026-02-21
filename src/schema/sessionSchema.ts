import { z } from "zod";

/**
 * v2 goals:
 * - Still supports "superset only" right now
 * - Future-proof via Session.blocks (discriminated union)
 * - Replaces reps/metricType with a structured target union
 * - Separates load (kg / bodyweight / etc) from target (reps/time)
 * - Supports per-exercise overrides while also enabling block-level rounds
 */

/** ---------- Small reusable schemas ---------- */

const IdSchema = z.string().min(1);

/** How you measure/describe the "work" target for an exercise */
const TargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("reps"),
    reps: z.number().int().positive(),
  }),
  z
    .object({
      type: z.literal("range"),
      min: z.number().int().positive(),
      max: z.number().int().positive(),
    })
    .refine((v) => v.max >= v.min, { message: "range.max must be >= range.min" }),
  z.object({
    type: z.literal("time"),
    seconds: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("amrap"),
    capReps: z.number().int().positive().optional(),
  }),
]);

/** How external resistance is applied (optional; many exercises can be bodyweight/time-only) */
const LoadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("weight"),
    unit: z.enum(["kg", "lb"]).default("kg"),
    value: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal("bodyweight"),
    added: z
      .object({
        unit: z.enum(["kg", "lb"]).default("kg"),
        value: z.number().positive(),
      })
      .optional(),
  }),
  z.object({
    type: z.literal("band"),
    band: z.string().min(1),
  }),
  z.object({
    type: z.literal("machine"),
    setting: z.string().min(1),
  }),
]);

const TempoSchema = z
  .string()
  .regex(/^\d-\d-\d(-\d)?$/, 'tempo must look like "3-1-1" or "3-1-1-0"')
  .optional();

/** Optional exertion guidance */
const EffortSchema = z
  .object({
    rir: z.number().int().min(0).max(10).optional(),
    rpe: z.number().min(1).max(10).optional(),
  })
  .refine((v) => !(v.rir != null && v.rpe != null), {
    message: "Provide either RIR or RPE (not both).",
  });

/** ---------- Exercise / Step ---------- */

export const StepSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  sets: z.number().int().positive(),
  target: TargetSchema,
  load: LoadSchema.optional(),
  restAfterSeconds: z.number().int().nonnegative().optional(),
  tempo: TempoSchema,
  effort: EffortSchema.optional(),
  notes: z.string().optional(),
});

/** ---------- Blocks (superset-only today, extensible tomorrow) ---------- */

export const SupersetBlockSchema = z
  .object({
    type: z.literal("superset"),
    id: IdSchema.optional(),
    name: z.string().min(1).optional(),
    rounds: z.number().int().positive().optional(),
    rest: z.object({
      betweenExercisesSeconds: z.number().int().nonnegative().default(0),
      afterRoundSeconds: z.number().int().nonnegative().default(60),
    }),
    exercises: z.array(StepSchema).min(1),
    notes: z.string().optional(),
  })
  .strict();

const BlockSchema = z.discriminatedUnion("type", [
  SupersetBlockSchema,
]);

/** ---------- Session / Plan ---------- */

export const SessionSchemaV2 = z.object({
  id: IdSchema,
  name: z.string().min(1),
  blocks: z.array(BlockSchema).min(1),
  version: z.literal(2).default(2),
  tags: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
});

export const SessionsSchemaV2 = z.array(SessionSchemaV2);

/** ---------- Types ---------- */
type Target = z.infer<typeof TargetSchema>;
type Load = z.infer<typeof LoadSchema>;
export type Step = z.infer<typeof StepSchema>;
export type SupersetBlock = z.infer<typeof SupersetBlockSchema>;
type Block = z.infer<typeof BlockSchema>;
export type SessionV2 = z.infer<typeof SessionSchemaV2>;
type SessionsV2 = z.infer<typeof SessionsSchemaV2>;

/** ---------- Legacy conversion helpers ---------- */

interface LegacyExercise {
  id: string;
  name: string;
  sets: number;
  reps: number | string;
  metricType?: "weight" | "time";
}

interface LegacySuperset {
  rest: number;
  exercises: LegacyExercise[];
}

interface LegacySession {
  id: string;
  name: string;
  supersets: LegacySuperset[];
}

function legacyExerciseToStep(e: LegacyExercise): Step {
  const metricType = e.metricType ?? "weight";

  const target: Target =
    metricType === "time"
      ? {
          type: "time",
          seconds:
            typeof e.reps === "string" ? parseInt(e.reps, 10) : e.reps,
        }
      : typeof e.reps === "number"
        ? { type: "reps", reps: e.reps }
        : typeof e.reps === "string" && /^\d+\s*s$/i.test(e.reps)
          ? { type: "time", seconds: parseInt(e.reps, 10) }
          : typeof e.reps === "string" && /^\d+\s*-\s*\d+$/.test(e.reps)
            ? (() => {
                const [min, max] = e.reps
                  .split("-")
                  .map((x) => parseInt(x.trim(), 10));
                return { type: "range" as const, min, max };
              })()
            : { type: "reps", reps: parseInt(String(e.reps), 10) || 10 };

  const load: Load | undefined =
    metricType === "weight" ? { type: "weight", unit: "kg" } : undefined;

  return {
    id: e.id,
    name: e.name,
    sets: e.sets,
    target,
    load,
  };
}

function legacySupersetToBlock(superset: LegacySuperset): SupersetBlock {
  return {
    type: "superset",
    rest: {
      betweenExercisesSeconds: 0,
      afterRoundSeconds: superset.rest,
    },
    exercises: superset.exercises.map(legacyExerciseToStep),
  };
}

export function legacySessionToV2(session: LegacySession): SessionV2 {
  return {
    id: session.id,
    name: session.name,
    blocks: session.supersets.map(legacySupersetToBlock),
    version: 2,
  };
}
