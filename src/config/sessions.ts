export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number | string;
}

export interface Superset {
  rest: number;
  exercises: Exercise[];
}

export interface Session {
  id: string;
  name: string;
  supersets: Superset[];
}

export const sessions: Session[] = [
  {
    id: "A",
    name: "PASS A – Upper Body",
    supersets: [
      {
        rest: 90,
        exercises: [
          { id: "bench", name: "Bench Press", sets: 5, reps: 5 },
          { id: "barbell_row", name: "Barbell Row", sets: 5, reps: 8 }
        ]
      },
      {
        rest: 60,
        exercises: [
          { id: "incline_db_press", name: "Incline Dumbbell Press", sets: 3, reps: 10 },
          { id: "lat_pulldown", name: "Lat Pulldown", sets: 3, reps: 10 }
        ]
      },
      {
        rest: 45,
        exercises: [
          { id: "lateral_raise", name: "Dumbbell Lateral Raises", sets: 3, reps: 15 },
          { id: "face_pull", name: "Face Pulls", sets: 3, reps: 15 }
        ]
      },
      {
        rest: 45,
        exercises: [
          { id: "barbell_curl", name: "Barbell Curl", sets: 3, reps: 10 },
          { id: "triceps_pushdown", name: "Triceps Pushdown", sets: 3, reps: 12 }
        ]
      }
    ]
  },
  {
    id: "B",
    name: "PASS B – Legs + Back",
    supersets: [
      {
        rest: 120,
        exercises: [
          { id: "squat", name: "Back Squat", sets: 5, reps: 5 },
          { id: "lat_pulldown_neutral", name: "Lat Pulldown (Neutral Grip)", sets: 5, reps: 8 }
        ]
      },
      {
        rest: 75,
        exercises: [
          { id: "rdl", name: "Romanian Deadlift", sets: 3, reps: 8 },
          { id: "seated_row", name: "Seated Cable Row", sets: 3, reps: 10 }
        ]
      },
      {
        rest: 60,
        exercises: [
          { id: "reverse_lunge", name: "Reverse Dumbbell Lunges", sets: 3, reps: 10 },
          { id: "plank", name: "Plank", sets: 3, reps: "45s" }
        ]
      },
      {
        rest: 45,
        exercises: [
          { id: "alt_db_curl", name: "Alternating Dumbbell Curl", sets: 2, reps: 12 },
          { id: "overhead_triceps", name: "Overhead Triceps Extension", sets: 2, reps: 12 }
        ]
      }
    ]
  },
  {
    id: "S",
    name: "SNABBPASS – Full Body",
    supersets: [
      {
        rest: 75,
        exercises: [
          { id: "bench", name: "Bench Press", sets: 4, reps: 6 },
          { id: "barbell_row", name: "Barbell Row", sets: 4, reps: 8 }
        ]
      },
      {
        rest: 90,
        exercises: [
          { id: "squat", name: "Back Squat", sets: 4, reps: 5 },
          { id: "lat_pulldown", name: "Lat Pulldown", sets: 4, reps: 8 }
        ]
      },
      {
        rest: 45,
        exercises: [
          { id: "barbell_curl", name: "Barbell Curl", sets: 3, reps: 10 },
          { id: "triceps_pushdown", name: "Triceps Pushdown", sets: 3, reps: 12 }
        ]
      }
    ]
  }
];
