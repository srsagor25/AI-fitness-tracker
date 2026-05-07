import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { load, save, listKeys, remove } from "./storage.js";
import { BUILTIN_PROGRAMS } from "./defaults.js";
import { TEMPLATES, cloneTemplate, calcMeal, ingredientDeltas, FOODS } from "./profiles.js";
import { todayKey, dayOfWeek } from "../lib/time.js";
import { estimateWorkoutKcal } from "../lib/calories.js";

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const SLOTS = ["lunch", "shake", "dinner", "snack"];

function blankMeals() {
  return { lunch: [], shake: [], dinner: [], snack: [] };
}

export function AppProvider({ children }) {
  const dateKey = todayKey();

  // ----- Profile -----
  const [profile, setProfile] = useState(() => load("profile:current", cloneTemplate(TEMPLATES.saidur)));
  const [apiKey, setApiKey] = useState(() => load("apiKey:anthropic", ""));

  // ----- Per-day data -----
  const [meals, setMeals] = useState(() => load(`meals:${dateKey}`, blankMeals()));
  const [cheats, setCheats] = useState(() => load(`cheats:${dateKey}`, []));
  const [coffee, setCoffee] = useState(() => load(`coffee:${dateKey}`, []));
  const [steps, setSteps] = useState(() => load(`steps:${dateKey}`, 0));
  const [dayTypeId, setDayTypeId] = useState(() => load(`dayType:${dateKey}`, profile.dayTypes[0]?.id || "rest"));

  // ----- Workout state -----
  const [customPrograms, setCustomPrograms] = useState(() => load("workout:custom-programs", []));
  const [activeProgramId, setActiveProgramId] = useState(() => load("workout:active-program", "full_body_4day"));
  const [weeks, setWeeks] = useState(() => load("workout:weeks", {}));
  const [history, setHistory] = useState(() => load("workout:history", []));
  const [currentSession, setCurrentSession] = useState(() => load("workout:current", null));

  // ----- Grocery -----
  const [grocery, setGrocery] = useState(() => {
    const stored = load("grocery:items", null);
    if (stored) return stored;
    return cloneTemplate(TEMPLATES.saidur).groceryTemplate.map((it) => ({ ...it, qty: it.initialQty }));
  });
  const [manualShopping, setManualShopping] = useState(() => load("shopping:manual", []));

  // ----- Plan -----
  const [plan, setPlan] = useState(() => load("plan:current_week", {}));

  // ----- Snackbar -----
  const [snackbar, setSnackbar] = useState(null);
  const showSnack = useCallback((msg) => {
    const id = uid("s");
    setSnackbar({ id, msg });
    setTimeout(() => {
      setSnackbar((s) => (s && s.id === id ? null : s));
    }, 2200);
  }, []);

  // One-time migration: merge perishable info from latest templates into
  // any pre-existing grocery items in localStorage.
  useEffect(() => {
    const perishableByKey = {};
    for (const t of Object.values(TEMPLATES)) {
      for (const it of t.groceryTemplate) {
        if (it.perishable) {
          perishableByKey[it.key] = { perishable: true, maxDays: it.maxDays || 7 };
        }
      }
    }
    setGrocery((prev) => {
      let changed = false;
      const next = prev.map((it) => {
        const p = perishableByKey[it.key];
        if (p && !it.perishable) {
          changed = true;
          return { ...it, ...p };
        }
        return it;
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  useEffect(() => save("profile:current", profile), [profile]);
  useEffect(() => save("apiKey:anthropic", apiKey), [apiKey]);
  useEffect(() => save(`meals:${dateKey}`, meals), [meals, dateKey]);
  useEffect(() => save(`cheats:${dateKey}`, cheats), [cheats, dateKey]);
  useEffect(() => save(`coffee:${dateKey}`, coffee), [coffee, dateKey]);
  useEffect(() => save(`steps:${dateKey}`, steps), [steps, dateKey]);
  useEffect(() => save(`dayType:${dateKey}`, dayTypeId), [dayTypeId, dateKey]);
  useEffect(() => save("workout:custom-programs", customPrograms), [customPrograms]);
  useEffect(() => save("workout:active-program", activeProgramId), [activeProgramId]);
  useEffect(() => save("workout:weeks", weeks), [weeks]);
  useEffect(() => save("workout:history", history), [history]);
  useEffect(() => save("workout:current", currentSession), [currentSession]);
  useEffect(() => save("grocery:items", grocery), [grocery]);
  useEffect(() => save("shopping:manual", manualShopping), [manualShopping]);
  useEffect(() => save("plan:current_week", plan), [plan]);

  // ----- Profile selection -----
  function selectProfileTemplate(templateId) {
    const tpl = TEMPLATES[templateId];
    if (!tpl) return;
    const fresh = cloneTemplate(tpl);
    setProfile(fresh);
    setGrocery(fresh.groceryTemplate.map((it) => ({ ...it, qty: it.initialQty })));
    setCoffee(new Array(fresh.coffeeSchedule.length).fill(false));
    setMeals(blankMeals());
    setCheats([]);
    setSteps(0);
    setDayTypeId(fresh.dayTypes[0]?.id || "rest");
    showSnack(`Loaded ${tpl.name} profile`);
  }

  function updateProfile(patch) {
    setProfile((p) => ({ ...p, ...patch, stats: { ...p.stats, ...(patch.stats || {}) } }));
  }

  // ----- Day type / target -----
  const dayType = useMemo(
    () => profile.dayTypes.find((d) => d.id === dayTypeId) || profile.dayTypes[0],
    [profile.dayTypes, dayTypeId],
  );

  const stepAdjustKcal = useMemo(() => {
    const sa = profile.stepAdjust || {};
    const { lowThreshold = 0, highThreshold = Infinity, lowDelta = 0, highDelta = 0 } = sa;
    if (steps < lowThreshold) return lowDelta;
    if (steps > highThreshold) return highDelta;
    return 0;
  }, [steps, profile.stepAdjust]);

  // ----- Workout day data -----
  const allPrograms = useMemo(
    () => [...Object.values(BUILTIN_PROGRAMS), ...customPrograms],
    [customPrograms],
  );
  const activeProgram = useMemo(
    () => allPrograms.find((p) => p.id === activeProgramId) || BUILTIN_PROGRAMS.full_body_4day,
    [allPrograms, activeProgramId],
  );
  useEffect(() => {
    if (!weeks[activeProgram.id]) {
      setWeeks((w) => ({ ...w, [activeProgram.id]: [...activeProgram.defaultWeek] }));
    }
  }, [activeProgram, weeks]);

  const todayWeekIndex = dayOfWeek();
  const todaysDayId = (weeks[activeProgram.id] || activeProgram.defaultWeek)[todayWeekIndex];
  const todaysDay = todaysDayId && todaysDayId !== "rest"
    ? activeProgram.days.find((d) => d.id === todaysDayId)
    : null;

  const todaysWorkoutKcal = useMemo(() => {
    const sessions = history.filter((h) => todayKey(new Date(h.date)) === dateKey);
    return sessions.reduce(
      (sum, s) =>
        sum +
        estimateWorkoutKcal({
          durationSec: s.durationSec,
          weightKg: profile.stats?.weightKg || 70,
          totalVolume: s.totalVolume,
        }),
      0,
    );
  }, [history, profile.stats?.weightKg, dateKey]);

  // ----- Diet totals -----
  const mealTotals = useCallback((items) => calcMeal(items), []);

  const dayTotals = useMemo(() => {
    const out = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
    const allMeals = [...meals.lunch, ...meals.shake, ...meals.dinner, ...meals.snack, ...cheats];
    for (const m of allMeals) {
      const t = calcMeal(m.items);
      out.kcal += t.kcal;
      out.protein += t.protein;
      out.fat += t.fat || 0;
      out.carbs += t.carbs || 0;
    }
    return out;
  }, [meals, cheats]);

  const cheatSurplus = useMemo(() => {
    const baseline = profile.cheatBaselineKcal || 1000;
    return cheats.reduce((s, c) => s + Math.max(0, calcMeal(c.items).kcal - baseline), 0);
  }, [cheats, profile.cheatBaselineKcal]);

  // ----- Diet target = day-type target + step adjustment + workout kcal bonus -----
  const dailyTargetKcal = useMemo(
    () => Math.max(1200, (dayType?.target || 2000) + stepAdjustKcal + todaysWorkoutKcal),
    [dayType, stepAdjustKcal, todaysWorkoutKcal],
  );

  // ----- Diet mutators -----
  function addMealToSlot(slot, meal) {
    if (!SLOTS.includes(slot)) slot = "snack";
    const fullMeal = { id: uid("m"), at: Date.now(), ...meal };
    setMeals((prev) => ({ ...prev, [slot]: [...prev[slot], fullMeal] }));
    // Decrement inventory
    const deltas = ingredientDeltas(meal.items);
    if (Object.keys(deltas).length) {
      setGrocery((prev) =>
        prev.map((it) =>
          deltas[it.key] != null
            ? { ...it, qty: Math.max(0, it.qty - deltas[it.key]) }
            : it,
        ),
      );
    }
    showSnack(`Logged ${meal.name} to ${slot}`);
  }

  function removeMealFromSlot(slot, id) {
    setMeals((prev) => ({ ...prev, [slot]: prev[slot].filter((m) => m.id !== id) }));
  }

  function addCheat(meal) {
    const fullMeal = { id: uid("c"), at: Date.now(), ...meal };
    setCheats((prev) => [...prev, fullMeal]);
    showSnack(`Logged cheat: ${meal.name}`);
  }
  function removeCheat(id) {
    setCheats((prev) => prev.filter((m) => m.id !== id));
  }

  function clearDay() {
    setMeals(blankMeals());
    setCheats([]);
    setCoffee(new Array(profile.coffeeSchedule.length).fill(false));
    setSteps(0);
    showSnack("Day cleared");
  }

  function toggleCoffee(idx) {
    setCoffee((prev) => {
      const next = [...prev];
      while (next.length <= idx) next.push(false);
      next[idx] = !next[idx];
      return next;
    });
  }

  // ----- Workout mutators (carried over from previous version) -----
  function setProgramWeek(programId, week) {
    setWeeks((w) => ({ ...w, [programId]: week }));
  }
  function resetProgramWeek(programId) {
    const p = allPrograms.find((x) => x.id === programId);
    if (!p) return;
    setWeeks((w) => ({ ...w, [programId]: [...p.defaultWeek] }));
  }
  function saveCustomProgram(program) {
    setCustomPrograms((prev) => {
      const existing = prev.findIndex((p) => p.id === program.id);
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = { ...program, builtin: false };
        return copy;
      }
      return [...prev, { ...program, builtin: false }];
    });
    showSnack(`Saved program "${program.name}"`);
  }
  function deleteCustomProgram(id) {
    setCustomPrograms((prev) => prev.filter((p) => p.id !== id));
    if (activeProgramId === id) setActiveProgramId("full_body_4day");
  }

  function startSession(programId, dayId) {
    setCurrentSession({
      id: uid("s"),
      programId,
      dayId,
      startedAt: Date.now(),
      resumedAt: Date.now(),
      accumSec: 0,
      paused: false,
      log: {},
    });
    showSnack("Workout started");
  }
  function pauseSession() {
    setCurrentSession((s) => {
      if (!s || s.paused) return s;
      const elapsed = (Date.now() - s.resumedAt) / 1000;
      return { ...s, paused: true, accumSec: s.accumSec + elapsed };
    });
  }
  function resumeSession() {
    setCurrentSession((s) => (!s || !s.paused ? s : { ...s, paused: false, resumedAt: Date.now() }));
  }
  function logSet(exerciseId, setIndex, data) {
    setCurrentSession((s) => {
      if (!s) return s;
      const prev = s.log[exerciseId] || [];
      const next = [...prev];
      next[setIndex] = { ...data, ts: Date.now() };
      return { ...s, log: { ...s.log, [exerciseId]: next } };
    });
    showSnack(`Set ${setIndex + 1}: ${data.weight}kg × ${data.reps}`);
  }
  function unlogSet(exerciseId, setIndex) {
    setCurrentSession((s) => {
      if (!s) return s;
      const prev = s.log[exerciseId] || [];
      const next = [...prev];
      next[setIndex] = undefined;
      return { ...s, log: { ...s.log, [exerciseId]: next } };
    });
  }
  function finishSession() {
    setCurrentSession((s) => {
      if (!s) return null;
      const program = allPrograms.find((p) => p.id === s.programId);
      const day = program?.days.find((d) => d.id === s.dayId);
      const elapsed = s.paused ? s.accumSec : s.accumSec + (Date.now() - s.resumedAt) / 1000;
      let totalSets = 0, totalReps = 0, totalVolume = 0;
      const exercises = (day?.exercises || []).map((ex) => {
        const sets = (s.log[ex.id] || []).filter(Boolean);
        totalSets += sets.length;
        for (const set of sets) {
          totalReps += Number(set.reps) || 0;
          totalVolume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
        }
        return { id: ex.id, name: ex.name, sets };
      });
      const entry = {
        id: s.id,
        date: Date.now(),
        programId: s.programId,
        programName: program?.name || "—",
        dayId: s.dayId,
        dayName: day?.name || "—",
        durationSec: Math.round(elapsed),
        totalSets,
        totalReps,
        totalVolume: Math.round(totalVolume),
        exercises,
      };
      setHistory((h) => [entry, ...h]);
      showSnack("Workout saved to history");
      return null;
    });
  }
  function cancelSession() {
    setCurrentSession(null);
    showSnack("Workout cancelled");
  }
  function clearHistory() {
    setHistory([]);
  }

  // ----- Grocery mutators -----
  function adjustGrocery(key, delta) {
    setGrocery((prev) => prev.map((it) => (it.key === key ? { ...it, qty: Math.max(0, it.qty + delta) } : it)));
  }
  function restockGrocery(key) {
    setGrocery((prev) =>
      prev.map((it) => (it.key === key ? { ...it, qty: it.qty + (it.packetSize || 1) } : it)),
    );
    showSnack("Restocked");
  }
  function setGroceryQty(key, qty) {
    setGrocery((prev) => prev.map((it) => (it.key === key ? { ...it, qty: Math.max(0, qty) } : it)));
  }
  function saveGroceryItem(item) {
    setGrocery((prev) => {
      const idx = prev.findIndex((it) => it.key === item.key);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = item;
        return copy;
      }
      return [...prev, item];
    });
  }
  function removeGroceryItem(key) {
    setGrocery((prev) => prev.filter((it) => it.key !== key));
  }
  function resetGroceryToTemplate() {
    setGrocery(profile.groceryTemplate.map((it) => ({ ...it, qty: it.initialQty })));
    showSnack("Inventory reset to template");
  }

  // ----- Shopping list -----
  function addManualShopping(text) {
    const t = text.trim();
    if (!t) return;
    setManualShopping((prev) => [...prev, { id: uid("ms"), text: t, done: false }]);
  }
  function toggleManualShopping(id) {
    setManualShopping((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }
  function removeManualShopping(id) {
    setManualShopping((prev) => prev.filter((it) => it.id !== id));
  }

  // ----- Plan -----
  function setPlanForDate(date, slot, mealKey) {
    setPlan((prev) => ({ ...prev, [date]: { ...(prev[date] || {}), [slot]: mealKey } }));
  }
  function clearPlan() {
    setPlan({});
  }

  // Light dinner suggestion
  const shouldSuggestLightDinner = useMemo(() => {
    const triggers = profile.lightDinnerTriggers || [];
    const target = profile.lightDinnerKey;
    if (!triggers.length || !target) return null;
    const lunchHasTrigger = meals.lunch.some((m) => triggers.includes(m.presetKey));
    const cheatHasTrigger = cheats.some((m) => triggers.includes(m.presetKey));
    const dinnerLogged = meals.dinner.length > 0;
    if ((lunchHasTrigger || cheatHasTrigger) && !dinnerLogged) return target;
    return null;
  }, [meals.lunch, meals.dinner, cheats, profile.lightDinnerTriggers, profile.lightDinnerKey]);

  const value = {
    // profile
    profile, setProfile, updateProfile, selectProfileTemplate,
    apiKey, setApiKey,
    // day data
    dateKey,
    meals, addMealToSlot, removeMealFromSlot,
    cheats, addCheat, removeCheat, cheatSurplus,
    coffee, toggleCoffee,
    steps, setSteps, stepAdjustKcal,
    dayTypeId, setDayTypeId, dayType,
    clearDay,
    // totals
    dayTotals, dailyTargetKcal,
    // workout
    allPrograms, customPrograms, activeProgram, activeProgramId, setActiveProgramId,
    weeks, setProgramWeek, resetProgramWeek,
    saveCustomProgram, deleteCustomProgram,
    history, clearHistory,
    currentSession, startSession, pauseSession, resumeSession, logSet, unlogSet,
    finishSession, cancelSession,
    todaysDay, todaysDayId, todaysWorkoutKcal,
    // grocery
    grocery, adjustGrocery, restockGrocery, setGroceryQty,
    saveGroceryItem, removeGroceryItem, resetGroceryToTemplate,
    manualShopping, addManualShopping, toggleManualShopping, removeManualShopping,
    // plan
    plan, setPlanForDate, clearPlan,
    // misc
    showSnack, snackbar,
    shouldSuggestLightDinner,
    uid,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
