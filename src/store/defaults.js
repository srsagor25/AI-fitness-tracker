export const DEFAULT_PROFILE = {
  name: "Athlete",
  age: 28,
  sex: "male",
  heightCm: 178,
  weightKg: 78,
  activity: "moderate",
  goal: "maintain",
  proteinTarget: 150,
};

// Built-in workout programs. Every day is sized so that the time-budget
// helper in lib/calories.js (estimateMinutesForDay) lands in the 56–62
// minute range — roughly one hour from warm-up to final set, matching
// the typical gym-session budget. Volumes follow common evidence-based
// templates (Renaissance Periodization, Stronger By Science): one heavy
// compound + 2–3 accessories per muscle group + isolation + core.
export const BUILTIN_PROGRAMS = {
  full_body_4day: {
    id: "full_body_4day",
    name: "Full Body 4-Day",
    subtitle: "4-day Full Body split · ~60 min/session",
    builtin: true,
    days: [
      {
        id: "day1",
        name: "Mix",
        accent: "#c44827",
        exercises: [
          { id: "d1e1", name: "Back Squat",            sets: 4, reps: 8,  restSec: 150, url: "https://youtu.be/-bJIpOq-LWk" },
          { id: "d1e2", name: "Bench Press",           sets: 4, reps: 8,  restSec: 150, url: "https://youtu.be/SCVCLChPQFY" },
          { id: "d1e3", name: "Barbell Row",           sets: 4, reps: 8,  restSec: 90,  url: "https://youtu.be/6FZHJGzMFEc" },
          { id: "d1e4", name: "DB Lateral Raise",      sets: 3, reps: 15, restSec: 60,  url: "https://youtu.be/3VcKaXpzqRo" },
          { id: "d1e5", name: "DB Hammer Curl",        sets: 3, reps: 12, restSec: 60,  url: "https://youtu.be/zC3nLlEvin4" },
          { id: "d1e6", name: "Cable Tricep Pushdown", sets: 3, reps: 12, restSec: 60,  url: "https://youtu.be/-xa-6cQaZKY" },
          { id: "d1e7", name: "Hanging Leg Raise",     sets: 3, reps: 15, restSec: 60,  url: "https://youtu.be/Pr1ieGZ5atk" },
        ],
      },
      {
        id: "day2",
        name: "Pull",
        accent: "#3b6aa3",
        exercises: [
          { id: "d2e1", name: "Deadlift",        sets: 4, reps: 6,  restSec: 180, url: "https://youtu.be/AweC3UaM14o" },
          { id: "d2e2", name: "Overhead Press",  sets: 4, reps: 8,  restSec: 120, url: "https://youtu.be/cGnhixvC8uA" },
          { id: "d2e3", name: "Pull-Up",         sets: 4, reps: 9,  restSec: 90,  url: "https://youtu.be/sIvJTfGxdFo" },
          { id: "d2e4", name: "DB Row",          sets: 3, reps: 10, restSec: 75,  url: "https://youtu.be/pYcpY20QaE8" },
          { id: "d2e5", name: "Cable Face Pull", sets: 3, reps: 15, restSec: 60,  url: "https://youtu.be/0Po47vvj9g4" },
          { id: "d2e6", name: "DB Shrug",        sets: 3, reps: 12, restSec: 60,  url: "https://youtu.be/cJRVVxmytaM" },
          { id: "d2e7", name: "Rope Pushdown",   sets: 3, reps: 13, restSec: 60,  url: "https://youtu.be/-xa-6cQaZKY" },
        ],
      },
      {
        id: "day3",
        name: "Power",
        accent: "#4a6b3e",
        exercises: [
          { id: "d3e1", name: "Front Squat",        sets: 4, reps: 8,  restSec: 150, url: "https://youtu.be/HHxNbhP16UE" },
          { id: "d3e2", name: "Incline DB Press",   sets: 4, reps: 9,  restSec: 120, url: "https://youtu.be/5CECBjd7HLQ" },
          { id: "d3e3", name: "Seated Row",         sets: 4, reps: 10, restSec: 75,  url: "https://youtu.be/lJoozxC0Rns" },
          { id: "d3e4", name: "Romanian Deadlift",  sets: 3, reps: 10, restSec: 90,  url: "https://youtu.be/2SHsk9AzdjA" },
          { id: "d3e5", name: "DB Lateral Raise",   sets: 3, reps: 15, restSec: 60,  url: "https://youtu.be/3VcKaXpzqRo" },
          { id: "d3e6", name: "Calf Raise",         sets: 3, reps: 15, restSec: 60,  url: "https://youtu.be/_iYwv4QVFjM" },
          { id: "d3e7", name: "Plank Hold (sec)",   sets: 3, reps: 30, restSec: 45,  url: "https://youtu.be/mwlp75MS6Rg" },
        ],
      },
      {
        id: "day4",
        name: "Arms",
        accent: "#6b5a3e",
        exercises: [
          { id: "d4e1", name: "Barbell Curl",            sets: 4, reps: 10, restSec: 75, url: "https://youtu.be/kwG2ipFRgfo" },
          { id: "d4e2", name: "Close-Grip Bench Press",  sets: 4, reps: 8,  restSec: 90, url: "https://youtu.be/mpcPTUAhfto" },
          { id: "d4e3", name: "DB Scott Curl",           sets: 4, reps: 11, restSec: 60, url: "https://youtu.be/u00CqDeAHTE" },
          { id: "d4e4", name: "Overhead Tricep Ext",     sets: 4, reps: 12, restSec: 60, url: "https://youtu.be/_gsUck-7M74" },
          { id: "d4e5", name: "Hammer Curl",             sets: 3, reps: 12, restSec: 60, url: "https://youtu.be/zC3nLlEvin4" },
          { id: "d4e6", name: "DB Triceps Kickback",     sets: 3, reps: 13, restSec: 60, url: "https://youtu.be/YdUUYFgpA7g" },
          { id: "d4e7", name: "Donkey Calf Raise",       sets: 4, reps: 15, restSec: 60, url: "https://youtu.be/0eQQwveeQzw" },
          { id: "d4e8", name: "Cable Crunch",            sets: 3, reps: 15, restSec: 60, url: "https://youtu.be/6cGOg5jx8Ck" },
        ],
      },
    ],
    defaultWeek: ["rest", "day1", "day2", "rest", "day3", "day4", "rest"],
  },
  ppl: {
    id: "ppl",
    name: "Push / Pull / Legs",
    subtitle: "Classic 6-day split · ~60 min/session",
    builtin: true,
    days: [
      {
        id: "push",
        name: "Push",
        accent: "#c44827",
        exercises: [
          { id: "p1", name: "Bench Press",             sets: 4, reps: 8,  restSec: 120, url: "https://youtu.be/SCVCLChPQFY" },
          { id: "p2", name: "Incline DB Press",        sets: 4, reps: 10, restSec: 90,  url: "https://youtu.be/5CECBjd7HLQ" },
          { id: "p3", name: "Machine Shoulder Press",  sets: 3, reps: 10, restSec: 90,  url: "https://youtu.be/MjVDrYPD7Rs" },
          { id: "p4", name: "DB Lateral Raise",        sets: 4, reps: 12, restSec: 60,  url: "https://youtu.be/3VcKaXpzqRo" },
          { id: "p5", name: "Cable Chest Fly",         sets: 3, reps: 12, restSec: 60,  url: "https://youtu.be/eozdVDA78K0" },
          { id: "p6", name: "Rope Pushdown",           sets: 4, reps: 12, restSec: 60,  url: "https://youtu.be/-xa-6cQaZKY" },
          { id: "p7", name: "Overhead Tricep Ext",     sets: 3, reps: 12, restSec: 60,  url: "https://youtu.be/_gsUck-7M74" },
          { id: "p8", name: "Reverse Pec Deck",        sets: 3, reps: 15, restSec: 60,  url: "https://youtu.be/0GqOpMKMlBA" },
        ],
      },
      {
        id: "pull",
        name: "Pull",
        accent: "#3b6aa3",
        exercises: [
          { id: "pl1", name: "Pull-Up",             sets: 4, reps: 8,  restSec: 120, url: "https://youtu.be/sIvJTfGxdFo" },
          { id: "pl2", name: "Barbell Row",         sets: 4, reps: 10, restSec: 90,  url: "https://youtu.be/6FZHJGzMFEc" },
          { id: "pl3", name: "Seated Row",          sets: 3, reps: 10, restSec: 75,  url: "https://youtu.be/lJoozxC0Rns" },
          { id: "pl4", name: "Cable Face Pull",     sets: 3, reps: 15, restSec: 60,  url: "https://youtu.be/0Po47vvj9g4" },
          { id: "pl5", name: "DB Shrug",            sets: 3, reps: 12, restSec: 60,  url: "https://youtu.be/cJRVVxmytaM" },
          { id: "pl6", name: "Barbell Curl",        sets: 4, reps: 10, restSec: 60,  url: "https://youtu.be/kwG2ipFRgfo" },
          { id: "pl7", name: "DB Hammer Curl",      sets: 3, reps: 12, restSec: 60,  url: "https://youtu.be/zC3nLlEvin4" },
          { id: "pl8", name: "Hanging Leg Raise",   sets: 3, reps: 15, restSec: 60,  url: "https://youtu.be/Pr1ieGZ5atk" },
        ],
      },
      {
        id: "legs",
        name: "Legs",
        accent: "#4a6b3e",
        exercises: [
          { id: "lg1", name: "Back Squat",          sets: 4, reps: 8,  restSec: 150, url: "https://youtu.be/-bJIpOq-LWk" },
          { id: "lg2", name: "Romanian Deadlift",   sets: 3, reps: 10, restSec: 90,  url: "https://youtu.be/2SHsk9AzdjA" },
          { id: "lg3", name: "Leg Press",           sets: 3, reps: 12, restSec: 90,  url: "https://youtu.be/gspQiEILqOw" },
          { id: "lg4", name: "Hip Thrust",          sets: 3, reps: 10, restSec: 75,  url: "https://youtu.be/5S8SApGU_Lk" },
          { id: "lg5", name: "Leg Curl",            sets: 3, reps: 12, restSec: 60,  url: "https://youtu.be/1Tq3QdYUuHs" },
          { id: "lg6", name: "Leg Extension",       sets: 3, reps: 12, restSec: 60,  url: "https://youtu.be/YyvSfVjQeL0" },
          { id: "lg7", name: "Standing Calf Raise", sets: 4, reps: 15, restSec: 60,  url: "https://youtu.be/_iYwv4QVFjM" },
          { id: "lg8", name: "Plank Hold (sec)",    sets: 3, reps: 30, restSec: 45,  url: "https://youtu.be/mwlp75MS6Rg" },
        ],
      },
    ],
    defaultWeek: ["rest", "push", "pull", "legs", "push", "pull", "legs"],
  },
};

export const FOOD_LIBRARY = [
  { id: "chicken_breast", name: "Chicken Breast (100g)", kcal: 165, protein: 31, fat: 3.6, carbs: 0 },
  { id: "rice_white", name: "White Rice (1 cup cooked)", kcal: 205, protein: 4.3, fat: 0.4, carbs: 45 },
  { id: "rice_brown", name: "Brown Rice (1 cup cooked)", kcal: 218, protein: 4.5, fat: 1.6, carbs: 46 },
  { id: "egg", name: "Egg (large)", kcal: 72, protein: 6.3, fat: 4.8, carbs: 0.4 },
  { id: "oats_dry", name: "Oats (50g dry)", kcal: 190, protein: 6.5, fat: 3.5, carbs: 33 },
  { id: "milk_2pct", name: "Milk 2% (1 cup)", kcal: 122, protein: 8, fat: 5, carbs: 12 },
  { id: "whey_scoop", name: "Whey Scoop", kcal: 120, protein: 24, fat: 1.5, carbs: 3 },
  { id: "banana", name: "Banana (medium)", kcal: 105, protein: 1.3, fat: 0.4, carbs: 27 },
  { id: "peanut_butter", name: "Peanut Butter (1 tbsp)", kcal: 95, protein: 4, fat: 8, carbs: 3 },
  { id: "salmon", name: "Salmon (100g)", kcal: 208, protein: 20, fat: 13, carbs: 0 },
  { id: "broccoli", name: "Broccoli (1 cup)", kcal: 55, protein: 3.7, fat: 0.6, carbs: 11 },
  { id: "sweet_potato", name: "Sweet Potato (medium)", kcal: 103, protein: 2.3, fat: 0.2, carbs: 24 },
  { id: "greek_yogurt", name: "Greek Yogurt (1 cup)", kcal: 100, protein: 17, fat: 0.7, carbs: 6 },
  { id: "almonds", name: "Almonds (28g)", kcal: 164, protein: 6, fat: 14, carbs: 6 },
  { id: "olive_oil", name: "Olive Oil (1 tbsp)", kcal: 119, protein: 0, fat: 13.5, carbs: 0 },
  { id: "bread_whole", name: "Whole Wheat Bread (slice)", kcal: 80, protein: 4, fat: 1, carbs: 14 },
];

export const DEFAULT_GROCERY = [
  { id: "g1", name: "Chicken Breast", category: "Protein", qty: 2, unit: "kg", lowAt: 1 },
  { id: "g2", name: "Eggs", category: "Protein", qty: 12, unit: "ct", lowAt: 6 },
  { id: "g3", name: "Whey Protein", category: "Supplements", qty: 1, unit: "tub", lowAt: 1 },
  { id: "g4", name: "Rice", category: "Pantry", qty: 5, unit: "kg", lowAt: 1 },
  { id: "g5", name: "Oats", category: "Pantry", qty: 1, unit: "kg", lowAt: 0.5 },
  { id: "g6", name: "Milk", category: "Dairy", qty: 2, unit: "L", lowAt: 1 },
  { id: "g7", name: "Bananas", category: "Produce", qty: 6, unit: "ct", lowAt: 3 },
  { id: "g8", name: "Broccoli", category: "Produce", qty: 1, unit: "head", lowAt: 1 },
  { id: "g9", name: "Olive Oil", category: "Pantry", qty: 1, unit: "bottle", lowAt: 1 },
  { id: "g10", name: "Greek Yogurt", category: "Dairy", qty: 2, unit: "tub", lowAt: 1 },
];
