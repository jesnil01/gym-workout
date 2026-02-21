import {
  SessionsSchemaV2,
  legacySessionToV2,
  type SessionV2,
} from "../schema/sessionSchema";

const legacySessions = [
  {
    id: "A",
    name: "PASS A – Upper Body",
    supersets: [
      {
        rest: 90,
        exercises: [
          {
            id: "bench",
            name: "Bench Press",
            sets: 5,
            reps: 5,
            metricType: "weight" as const,
          },
          {
            id: "barbell_row",
            name: "Barbell Row",
            sets: 5,
            reps: 8,
            metricType: "weight" as const,
          },
        ],
      },
      {
        rest: 60,
        exercises: [
          {
            id: "incline_db_press",
            name: "Incline Dumbbell Press",
            sets: 3,
            reps: 10,
            metricType: "weight" as const,
          },
          {
            id: "lat_pulldown",
            name: "Lat Pulldown",
            sets: 3,
            reps: 10,
            metricType: "weight" as const,
          },
        ],
      },
      {
        rest: 45,
        exercises: [
          {
            id: "lateral_raise",
            name: "Dumbbell Lateral Raises",
            sets: 3,
            reps: 15,
            metricType: "weight" as const,
          },
          {
            id: "face_pull",
            name: "Face Pulls",
            sets: 3,
            reps: 15,
            metricType: "weight" as const,
          },
        ],
      },
      {
        rest: 45,
        exercises: [
          {
            id: "barbell_curl",
            name: "Barbell Curl",
            sets: 3,
            reps: 10,
            metricType: "weight" as const,
          },
          {
            id: "triceps_pushdown",
            name: "Triceps Pushdown",
            sets: 3,
            reps: 12,
            metricType: "weight" as const,
          },
        ],
      },
    ],
  },
  {
    id: "B",
    name: "PASS B – Legs + Back",
    supersets: [
      {
        rest: 120,
        exercises: [
          {
            id: "squat",
            name: "Back Squat",
            sets: 5,
            reps: 5,
            metricType: "weight" as const,
          },
          {
            id: "lat_pulldown_neutral",
            name: "Lat Pulldown (Neutral Grip)",
            sets: 5,
            reps: 8,
            metricType: "weight" as const,
          },
        ],
      },
      {
        rest: 75,
        exercises: [
          {
            id: "rdl",
            name: "Romanian Deadlift",
            sets: 3,
            reps: 8,
            metricType: "weight" as const,
          },
          {
            id: "seated_row",
            name: "Seated Cable Row",
            sets: 3,
            reps: 10,
            metricType: "weight" as const,
          },
        ],
      },
      {
        rest: 60,
        exercises: [
          {
            id: "reverse_lunge",
            name: "Reverse Dumbbell Lunges",
            sets: 3,
            reps: 10,
            metricType: "weight" as const,
          },
          {
            id: "plank",
            name: "Plank",
            sets: 3,
            reps: "45s",
            metricType: "time" as const,
          },
        ],
      },
      {
        rest: 45,
        exercises: [
          {
            id: "alt_db_curl",
            name: "Alternating Dumbbell Curl",
            sets: 2,
            reps: 12,
            metricType: "weight" as const,
          },
          {
            id: "overhead_triceps",
            name: "Overhead Triceps Extension",
            sets: 2,
            reps: 12,
            metricType: "weight" as const,
          },
        ],
      },
    ],
  },
  {
    id: "S",
    name: "SNABBPASS – Full Body",
    supersets: [
      {
        rest: 75,
        exercises: [
          { id: "bench", name: "Bench Press", sets: 4, reps: 6 },
          { id: "barbell_row", name: "Barbell Row", sets: 4, reps: 8 },
        ],
      },
      {
        rest: 90,
        exercises: [
          { id: "squat", name: "Back Squat", sets: 4, reps: 5 },
          { id: "lat_pulldown", name: "Lat Pulldown", sets: 4, reps: 8 },
        ],
      },
      {
        rest: 45,
        exercises: [
          {
            id: "barbell_curl",
            name: "Barbell Curl",
            sets: 3,
            reps: 10,
            metricType: "weight" as const,
          },
          {
            id: "triceps_pushdown",
            name: "Triceps Pushdown",
            sets: 3,
            reps: 12,
            metricType: "weight" as const,
          },
        ],
      },
    ],
  },
];

export const sessions: SessionV2[] = SessionsSchemaV2.parse(
  legacySessions.map(legacySessionToV2)
);
