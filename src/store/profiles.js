// Ported from Diet & Grocery Manager. FOODS, Saidur/Blank profile templates.

// Per-unit macros. fat & carbs use USDA-style reference values so meal totals
// reflect full macros out of the box. Users can still override per-food on
// the Foods tab; those overrides take precedence at calc time.
export const FOODS = {
  chicken_thigh:      { key: "chicken_thigh",      display: "Chicken Thigh (skinless)",  unit: "g",     kcal: 1.45, protein: 0.21,  fat: 0.090,  carbs: 0,     groceryKey: "chicken_thigh" },
  chicken_legs:       { key: "chicken_legs",       display: "Chicken Legs (skinless)",   unit: "g",     kcal: 1.20, protein: 0.20,  fat: 0.050,  carbs: 0,     groceryKey: "chicken_legs" },
  chicken_breast:     { key: "chicken_breast",     display: "Chicken Breast",            unit: "g",     kcal: 1.65, protein: 0.31,  fat: 0.036,  carbs: 0,     groceryKey: "chicken_breast" },
  beef_lean:          { key: "beef_lean",          display: "Lean Beef (pur cut)",       unit: "g",     kcal: 1.70, protein: 0.21,  fat: 0.100,  carbs: 0,     groceryKey: "beef" },
  fish:               { key: "fish",               display: "Fish (Tilapia/Rui)",        unit: "g",     kcal: 0.96, protein: 0.20,  fat: 0.020,  carbs: 0,     groceryKey: "fish" },
  egg:                { key: "egg",                display: "Egg (large)",               unit: "pc",    kcal: 72,   protein: 6.3,   fat: 4.8,    carbs: 0.4,   groceryKey: "egg" },
  rice:               { key: "rice",               display: "Steamed Rice (cooked)",     unit: "g",     kcal: 1.30, protein: 0.027, fat: 0.003,  carbs: 0.280, groceryKey: "rice" },
  khichuri_mix:       { key: "khichuri_mix",       display: "Khichuri (cooked)",         unit: "g",     kcal: 1.30, protein: 0.040, fat: 0.025,  carbs: 0.210, groceryKey: null },
  tehari_rice:        { key: "tehari_rice",        display: "Tehari Rice",               unit: "g",     kcal: 1.50, protein: 0.030, fat: 0.050,  carbs: 0.270, groceryKey: null },
  pizza_regular:      { key: "pizza_regular",      display: "Pizza Slice (regular)",     unit: "slice", kcal: 250,  protein: 10,    fat: 10,     carbs: 30,    groceryKey: null },
  pizza_chicken_thin: { key: "pizza_chicken_thin", display: "Pizza Slice (chicken thin)", unit: "slice",kcal: 183,  protein: 13,    fat: 6,      carbs: 20,    groceryKey: null },
  cucumber:           { key: "cucumber",           display: "Cucumber",                  unit: "g",     kcal: 0.15, protein: 0.007, fat: 0.001,  carbs: 0.036, groceryKey: "cucumber" },
  bhuna_oil:          { key: "bhuna_oil",          display: "Bhuna Oil (cooking)",       unit: "tbsp",  kcal: 120,  protein: 0,     fat: 13.5,   carbs: 0,     groceryKey: "oil" },
  ghee:               { key: "ghee",               display: "Ghee",                      unit: "tbsp",  kcal: 120,  protein: 0,     fat: 13,     carbs: 0,     groceryKey: "ghee" },
  oil_spray:          { key: "oil_spray",          display: "Oil Spray (air fry)",       unit: "tsp",   kcal: 40,   protein: 0,     fat: 4.5,    carbs: 0,     groceryKey: "oil_spray" },
  fruit_mixed:        { key: "fruit_mixed",        display: "Mixed Fruits",              unit: "g",     kcal: 0.60, protein: 0.008, fat: 0.003,  carbs: 0.150, groceryKey: "fruits" },
  milk:               { key: "milk",               display: "Milk",                      unit: "ml",    kcal: 0.60, protein: 0.033, fat: 0.034,  carbs: 0.048, groceryKey: "milk" },
  cashew:             { key: "cashew",             display: "Cashew (Kaju)",             unit: "g",     kcal: 5.53, protein: 0.18,  fat: 0.440,  carbs: 0.300, groceryKey: "cashew" },
  dates:              { key: "dates",              display: "Dates (Khejur)",            unit: "g",     kcal: 2.77, protein: 0.018, fat: 0.0015, carbs: 0.750, groceryKey: "dates" },
  peanut:             { key: "peanut",             display: "Peanut/Mixed Nuts",         unit: "g",     kcal: 5.85, protein: 0.26,  fat: 0.490,  carbs: 0.160, groceryKey: "peanut" },
  sauce:              { key: "sauce",              display: "Sauce",                     unit: "cup",   kcal: 48,   protein: 2,     fat: 3,      carbs: 10,    groceryKey: "sauce" },
};

export const GROCERY_CATEGORIES = ["Protein", "Dairy & Shake", "Aromatics", "Moshla", "Fresh", "Pantry"];

// Diet uses just two day types: Rest and Workout. Workout day = rest +
// WORKOUT_DAY_BONUS_KCAL — covered by an extra shake/snack. Sports are
// already counted via the Activity tab, so we don't need separate types
// for football/cricket/etc.
const SAIDUR_REST_DAY = {
  id: "rest", label: "Rest Day", icon: "🛏️", color: "#6b5a3e", target: 2400, suggestShake: "shake_standard",
};

const SAIDUR_LUNCH_PRESETS = {
  lunch_chicken_thigh: { key: "lunch_chicken_thigh", name: "Chicken Thigh Bhuna + Rice", icon: "🍗",
    items: [{ food: "chicken_thigh", amount: 333 }, { food: "rice", amount: 200 }, { food: "egg", amount: 2 }, { food: "cucumber", amount: 200 }, { food: "bhuna_oil", amount: 2 }] },
  lunch_chicken_legs: { key: "lunch_chicken_legs", name: "Air-Fried Chicken Legs", icon: "🍗", note: "No rice — air fry only",
    items: [{ food: "chicken_legs", amount: 500 }, { food: "cucumber", amount: 200 }, { food: "oil_spray", amount: 1 }] },
  lunch_fish: { key: "lunch_fish", name: "Fish Bhuna + Rice", icon: "🐟",
    items: [{ food: "fish", amount: 333 }, { food: "rice", amount: 200 }, { food: "egg", amount: 2 }, { food: "cucumber", amount: 200 }, { food: "bhuna_oil", amount: 2 }] },
  lunch_beef: { key: "lunch_beef", name: "Beef Bhuna + Rice", icon: "🥩", note: "Pair with light fish dinner",
    items: [{ food: "beef_lean", amount: 250 }, { food: "rice", amount: 200 }, { food: "egg", amount: 2 }, { food: "cucumber", amount: 200 }, { food: "bhuna_oil", amount: 2 }] },
};

const SAIDUR_CHEAT_PRESETS = {
  cheat_khichuri: { key: "cheat_khichuri", name: "Beef Khichuri", icon: "🍲",
    versions: {
      original: { label: "Original", items: [{ food: "khichuri_mix", amount: 300 }, { food: "beef_lean", amount: 150 }, { food: "bhuna_oil", amount: 2 }] },
      healthy:  { label: "Healthy", note: "More beef, less oil, +eggs", items: [{ food: "khichuri_mix", amount: 250 }, { food: "beef_lean", amount: 250 }, { food: "bhuna_oil", amount: 1 }, { food: "egg", amount: 2 }] },
    },
  },
  cheat_tehari: { key: "cheat_tehari", name: "Tehari (Beef)", icon: "🍛",
    versions: {
      original: { label: "Original", items: [{ food: "tehari_rice", amount: 350 }, { food: "beef_lean", amount: 150 }, { food: "ghee", amount: 2 }] },
      healthy:  { label: "Healthy", note: "More beef, less rice, +eggs", items: [{ food: "tehari_rice", amount: 200 }, { food: "beef_lean", amount: 300 }, { food: "ghee", amount: 1 }, { food: "egg", amount: 2 }] },
    },
  },
  cheat_pizza: { key: "cheat_pizza", name: "Pizza", icon: "🍕",
    versions: {
      original: { label: "Original (3 slices regular)", items: [{ food: "pizza_regular", amount: 3 }] },
      healthy:  { label: "Healthy (3 slices chicken thin)", note: "Higher protein, lower fat", items: [{ food: "pizza_chicken_thin", amount: 3 }] },
    },
  },
  cheat_family_big_lunch: { key: "cheat_family_big_lunch", name: "Family Big Lunch", icon: "👨‍👩‍👧‍👦", note: "Auto-suggests light fish dinner.",
    versions: {
      original: { label: "As served", items: [{ food: "chicken_thigh", amount: 200 }, { food: "beef_lean", amount: 150 }, { food: "rice", amount: 200 }, { food: "egg", amount: 1 }, { food: "bhuna_oil", amount: 2 }] },
      healthy:  { label: "Lighter portions", items: [{ food: "chicken_thigh", amount: 200 }, { food: "beef_lean", amount: 100 }, { food: "rice", amount: 150 }, { food: "egg", amount: 1 }, { food: "bhuna_oil", amount: 1 }] },
    },
  },
};

const SAIDUR_SHAKE_PRESETS = {
  shake_standard: { key: "shake_standard", name: "Standard Shake", icon: "🥤",
    items: [{ food: "milk", amount: 250 }, { food: "cashew", amount: 15 }, { food: "dates", amount: 30 }] },
  shake_power: { key: "shake_power", name: "Power Shake", icon: "💪", note: "Auto-suggested on training days",
    items: [{ food: "milk", amount: 250 }, { food: "cashew", amount: 30 }, { food: "dates", amount: 30 }, { food: "peanut", amount: 30 }] },
};

const SAIDUR_DINNER_PRESETS = {
  dinner_fish: { key: "dinner_fish", name: "Fish Dinner", icon: "🐟",
    items: [{ food: "fish", amount: 333 }, { food: "egg", amount: 2 }, { food: "fruit_mixed", amount: 250 }, { food: "oil_spray", amount: 1 }, { food: "sauce", amount: 1 }] },
  dinner_beef: { key: "dinner_beef", name: "Beef Dinner", icon: "🥩",
    items: [{ food: "beef_lean", amount: 250 }, { food: "egg", amount: 2 }, { food: "fruit_mixed", amount: 250 }, { food: "oil_spray", amount: 1 }, { food: "sauce", amount: 1 }] },
  dinner_fish_light: { key: "dinner_fish_light", name: "Fish Light", icon: "🐟", note: "Auto-suggested after beef/cheat/family lunch",
    items: [{ food: "fish", amount: 333 }, { food: "egg", amount: 2 }, { food: "oil_spray", amount: 1 }, { food: "sauce", amount: 1 }] },
};

const SAIDUR_GROCERY_TEMPLATE = [
  { key: "chicken_thigh",  name: "Chicken Thigh (skinless)", category: "Protein",       unit: "g",      initialQty: 1000, packetSize: 333,  lowThreshold: 333, icon: "🍗" },
  { key: "chicken_legs",   name: "Chicken Legs (skinless)",  category: "Protein",       unit: "g",      initialQty: 1000, packetSize: 500,  lowThreshold: 500, icon: "🍗" },
  { key: "chicken_breast", name: "Chicken Breast",           category: "Protein",       unit: "g",      initialQty: 0,    packetSize: 333,  lowThreshold: 333, icon: "🍗", optional: true },
  { key: "beef",           name: "Lean Beef (pur cut)",      category: "Protein",       unit: "g",      initialQty: 3000, packetSize: 250,  lowThreshold: 500, icon: "🥩" },
  { key: "fish",           name: "Fish (Tilapia/Rui)",       category: "Protein",       unit: "g",      initialQty: 1000, packetSize: 333,  lowThreshold: 333, icon: "🐟" },
  { key: "egg",            name: "Eggs",                     category: "Protein",       unit: "pc",     initialQty: 30,   packetSize: 12,   lowThreshold: 6,   icon: "🥚" },
  { key: "milk",           name: "Milk",                     category: "Dairy & Shake", unit: "ml",     initialQty: 1000, packetSize: 1000, lowThreshold: 250, icon: "🥛" },
  { key: "cashew",         name: "Cashew (Kaju)",            category: "Dairy & Shake", unit: "g",      initialQty: 250,  packetSize: 250,  lowThreshold: 50,  icon: "🥜" },
  { key: "dates",          name: "Dates (Khejur)",           category: "Dairy & Shake", unit: "g",      initialQty: 250,  packetSize: 250,  lowThreshold: 60,  icon: "🌴" },
  { key: "peanut",         name: "Peanut/Mixed Nuts",        category: "Dairy & Shake", unit: "g",      initialQty: 250,  packetSize: 250,  lowThreshold: 60,  icon: "🥜" },
  { key: "onion",          name: "Onion (Peyaj)",            category: "Aromatics",     unit: "g",      initialQty: 1000, packetSize: 1000, lowThreshold: 200, icon: "🧅" },
  { key: "garlic",         name: "Garlic (Roshun)",          category: "Aromatics",     unit: "g",      initialQty: 250,  packetSize: 250,  lowThreshold: 50,  icon: "🧄" },
  { key: "ginger",         name: "Ginger (Ada)",             category: "Aromatics",     unit: "g",      initialQty: 200,  packetSize: 200,  lowThreshold: 50,  icon: "🫚" },
  { key: "holoud",         name: "Holoud (Turmeric)",        category: "Moshla",        unit: "g",      initialQty: 100,  packetSize: 100,  lowThreshold: 20,  icon: "🌶️" },
  { key: "morich",         name: "Morich (Chili)",           category: "Moshla",        unit: "g",      initialQty: 100,  packetSize: 100,  lowThreshold: 20,  icon: "🌶️" },
  { key: "zira",           name: "Zira (Cumin)",             category: "Moshla",        unit: "g",      initialQty: 100,  packetSize: 100,  lowThreshold: 20,  icon: "🌿" },
  { key: "dhonia",         name: "Dhonia (Coriander)",       category: "Moshla",        unit: "g",      initialQty: 100,  packetSize: 100,  lowThreshold: 20,  icon: "🌿" },
  { key: "gorom_moshla",   name: "Gorom Moshla",             category: "Moshla",        unit: "g",      initialQty: 50,   packetSize: 50,   lowThreshold: 15,  icon: "✨" },
  { key: "cucumber",       name: "Cucumber",                 category: "Fresh",         unit: "g",      initialQty: 1000, packetSize: 200,  lowThreshold: 400, icon: "🥒", perishable: true, maxDays: 7 },
  { key: "fruits",         name: "Mixed Fruits",             category: "Fresh",         unit: "g",      initialQty: 1500, packetSize: 250,  lowThreshold: 500, icon: "🍎", perishable: true, maxDays: 7 },
  { key: "rice",           name: "Rice (raw)",               category: "Pantry",        unit: "g",      initialQty: 5000, packetSize: 1000, lowThreshold: 1000,icon: "🍚" },
  { key: "dal",            name: "Dal/Lentils",              category: "Pantry",        unit: "g",      initialQty: 1000, packetSize: 500,  lowThreshold: 250, icon: "🥣" },
  { key: "oil",            name: "Cooking Oil",              category: "Pantry",        unit: "ml",     initialQty: 1000, packetSize: 500,  lowThreshold: 200, icon: "🫗" },
  { key: "ghee",           name: "Ghee",                     category: "Pantry",        unit: "g",      initialQty: 250,  packetSize: 250,  lowThreshold: 50,  icon: "🧈" },
  { key: "oil_spray",      name: "Oil Spray",                category: "Pantry",        unit: "bottle", initialQty: 1,    packetSize: 1,    lowThreshold: 1,   icon: "🫧" },
  { key: "sauce",          name: "Sauce",                    category: "Pantry",        unit: "cup",    initialQty: 14,   packetSize: 14,   lowThreshold: 4,   icon: "🌶️" },
];

const SAIDUR_COFFEE_SCHEDULE = [
  { time: "9:00 AM",      label: "1st cup" },
  { time: "11:00 AM",     label: "2nd cup" },
  { time: "2:00 PM",      label: "3rd cup" },
  { time: "4:00 PM",      label: "4th cup" },
  { time: "5:30–6:00 PM", label: "Last cup", note: "After this: tea without sugar only" },
];

const SAIDUR_FAST_FOOD_TIPS = [
  { craving: "Pizza",    swap: "Thin crust, chicken topping, no extra cheese",       why: "Saves ~200 kcal, +9g protein per 3 slices" },
  { craving: "Pasta",    swap: "Whole grain pasta + grilled chicken + tomato sauce", why: "Complex carbs, lean protein, ~600 kcal" },
  { craving: "Burger",   swap: "Grilled chicken burger, no mayo, lettuce wrap",      why: "Saves 250 kcal, doubles protein ratio" },
  { craving: "Soup",     swap: "Clear chicken/beef broth with vegetables, no cream", why: "High volume, 25g protein, ~250 kcal" },
  { craving: "Khichuri", swap: "More beef + dal, less oil, add eggs",                why: "Doubles protein" },
  { craving: "Tehari",   swap: "Less rice, more beef, less ghee",                    why: "Hits 80g protein vs 43g original" },
];

export const SAIDUR_PROFILE = {
  id: "saidur",
  name: "Saidur",
  publicLabel: "Saidur — recomp / IF / PPL",
  stats: { heightDisplay: "5'11\"", heightCm: 180, weightKg: 86, sex: "male", age: 28 },
  goal: "Body recomposition (muscle gain + fat loss)",
  goalKey: "maintain",
  activity: "active",
  eatingWindow: "1 PM – 9 PM (16:8)",
  windowStart: "13:00",
  windowEnd: "21:00",
  waterTarget: 8,
  mealTimes: { lunch: "13:30", shake: "16:30", dinner: "19:30" },
  workoutTime: "18:00",
  groceryBufferDays: 3,
  workoutAppUrl: "https://workout-cyan-tau.vercel.app/",
  proteinTarget: 180,
  cheatBaselineKcal: 1019,
  stepAdjust: { lowThreshold: 8000, highThreshold: 12000, lowDelta: -100, highDelta: 100, baseline: 10000 },
  restDayType: SAIDUR_REST_DAY,
  lunchPresets: SAIDUR_LUNCH_PRESETS,
  shakePresets: SAIDUR_SHAKE_PRESETS,
  dinnerPresets: SAIDUR_DINNER_PRESETS,
  cheatPresets: SAIDUR_CHEAT_PRESETS,
  groceryTemplate: SAIDUR_GROCERY_TEMPLATE,
  coffeeSchedule: SAIDUR_COFFEE_SCHEDULE,
  fastFoodTips: SAIDUR_FAST_FOOD_TIPS,
  lightDinnerTriggers: ["lunch_beef", "cheat_family_big_lunch"],
  lightDinnerKey: "dinner_fish_light",
};

const BLANK_REST_DAY = {
  id: "rest", label: "Rest Day", icon: "🛏️", color: "#6b5a3e", target: 2000, suggestShake: null,
};

export const BLANK_PROFILE = {
  id: "blank",
  name: "New User",
  publicLabel: "Blank — start from scratch",
  stats: { heightDisplay: "", heightCm: 175, weightKg: 75, sex: "male", age: 30 },
  goal: "",
  goalKey: "maintain",
  activity: "moderate",
  eatingWindow: "",
  windowStart: "",
  windowEnd: "",
  waterTarget: 8,
  mealTimes: { lunch: "13:00", shake: "16:00", dinner: "19:00" },
  workoutTime: "",
  groceryBufferDays: 3,
  workoutAppUrl: "",
  proteinTarget: 150,
  cheatBaselineKcal: 1000,
  stepAdjust: { lowThreshold: 8000, highThreshold: 12000, lowDelta: -100, highDelta: 100, baseline: 10000 },
  restDayType: BLANK_REST_DAY,
  lunchPresets: { lunch_simple: { key: "lunch_simple", name: "Simple Lunch", icon: "🍽️",
    items: [{ food: "chicken_breast", amount: 200 }, { food: "rice", amount: 150 }, { food: "cucumber", amount: 100 }] } },
  shakePresets: { shake_simple: { key: "shake_simple", name: "Simple Shake", icon: "🥤",
    items: [{ food: "milk", amount: 250 }] } },
  dinnerPresets: { dinner_simple: { key: "dinner_simple", name: "Simple Dinner", icon: "🐟",
    items: [{ food: "fish", amount: 200 }, { food: "fruit_mixed", amount: 150 }] } },
  cheatPresets: {},
  groceryTemplate: [
    { key: "chicken_breast", name: "Chicken Breast", category: "Protein",       unit: "g",  initialQty: 500,  packetSize: 250,  lowThreshold: 250, icon: "🍗" },
    { key: "fish",           name: "Fish",           category: "Protein",       unit: "g",  initialQty: 500,  packetSize: 250,  lowThreshold: 250, icon: "🐟" },
    { key: "egg",            name: "Eggs",           category: "Protein",       unit: "pc", initialQty: 12,   packetSize: 12,   lowThreshold: 6,   icon: "🥚" },
    { key: "milk",           name: "Milk",           category: "Dairy & Shake", unit: "ml", initialQty: 1000, packetSize: 1000, lowThreshold: 250, icon: "🥛" },
    { key: "rice",           name: "Rice (raw)",     category: "Pantry",        unit: "g",  initialQty: 1000, packetSize: 1000, lowThreshold: 500, icon: "🍚" },
    { key: "cucumber",       name: "Cucumber",       category: "Fresh",         unit: "g",  initialQty: 500,  packetSize: 200,  lowThreshold: 200, icon: "🥒", perishable: true, maxDays: 7 },
    { key: "fruits",         name: "Mixed Fruits",   category: "Fresh",         unit: "g",  initialQty: 500,  packetSize: 250,  lowThreshold: 250, icon: "🍎", perishable: true, maxDays: 7 },
  ],
  coffeeSchedule: [],
  fastFoodTips: [],
  lightDinnerTriggers: [],
  lightDinnerKey: null,
};

export const TEMPLATES = { saidur: SAIDUR_PROFILE, blank: BLANK_PROFILE };

export function cloneTemplate(template) {
  return JSON.parse(JSON.stringify(template));
}

// Diet uses two day types: Rest and Workout. A workout day eats this much
// more than rest; the surplus is meant to be covered by an extra shake or
// snack. Sports/steps still feed kcal independently via the Activity tab.
export const WORKOUT_DAY_BONUS_KCAL = 300;

// Build the day-type chip list. Always exactly two entries: Rest (from
// profile.restDayType) and Workout (rest target + WORKOUT_DAY_BONUS_KCAL).
// activeProgram is accepted for API symmetry but no longer affects targets.
export function composeDayTypes(_activeProgram, profile = {}) {
  const rest =
    profile.restDayType ||
    { id: "rest", label: "Rest Day", icon: "🛏️", color: "#6b5a3e", target: 2200, suggestShake: null };
  const workout = {
    id: "workout",
    label: "Workout Day",
    icon: "💪",
    color: "#c44827",
    target: (Number(rest.target) || 2200) + WORKOUT_DAY_BONUS_KCAL,
    suggestShake: "shake_power",
  };
  return [rest, workout];
}

// Look up a food by key, merging the base FOODS entry with any user override.
// If a key is not in FOODS but exists in overrides with a `display` field, it
// is treated as an entirely user-added food. Returns null for unknown keys.
export function getFood(key, overrides = {}) {
  const base = FOODS[key];
  const ovr = overrides[key];
  if (base && ovr) return { ...base, ...ovr, key };
  if (base) return { ...base, key };
  if (ovr && ovr.display) return { key, ...ovr };
  return null;
}

// Returns the merged list of all foods (base + user-added), suitable for pickers.
export function getAllFoods(overrides = {}) {
  const out = Object.values(FOODS).map((f) => ({ ...f }));
  const seen = new Set(Object.keys(FOODS));
  for (const k of Object.keys(overrides)) {
    if (!seen.has(k) && overrides[k]?.display) {
      out.push({ key: k, ...overrides[k] });
    }
  }
  return out;
}

// Compute a meal's macros from its items array (food key + amount).
// `overrides` is the customFoods map: it can hold partial overrides for base
// foods OR complete entries for entirely user-added foods. Direct items embed
// their own macros and ignore overrides.
export function calcMeal(items, overrides = {}) {
  const out = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  if (!items) return out;
  for (const it of items) {
    if (it.direct) {
      const a = Number(it.amount) || 1;
      out.kcal += (Number(it.kcal) || 0) * a;
      out.protein += (Number(it.protein) || 0) * a;
      out.fat += (Number(it.fat) || 0) * a;
      out.carbs += (Number(it.carbs) || 0) * a;
      continue;
    }
    const f = getFood(it.food, overrides);
    if (!f) continue;
    const amt = Number(it.amount) || 0;
    out.kcal += (Number(f.kcal) || 0) * amt;
    out.protein += (Number(f.protein) || 0) * amt;
    out.fat += (Number(f.fat) || 0) * amt;
    out.carbs += (Number(f.carbs) || 0) * amt;
  }
  return out;
}

// Decompose a meal into ingredient deltas, keyed by groceryKey.
export function ingredientDeltas(items) {
  const out = {};
  if (!items) return out;
  for (const it of items) {
    if (it.direct) continue;
    const f = FOODS[it.food];
    if (!f || !f.groceryKey) continue;
    out[f.groceryKey] = (out[f.groceryKey] || 0) + (Number(it.amount) || 0);
  }
  return out;
}
