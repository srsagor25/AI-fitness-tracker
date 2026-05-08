import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { load, save, listKeys, remove } from "./storage.js";
import { BUILTIN_PROGRAMS } from "./defaults.js";
import { TEMPLATES, cloneTemplate, calcMeal, ingredientDeltas, FOODS } from "./profiles.js";
import { DEFAULT_SPORTS, estimateSportKcal } from "./sports.js";
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
  // (BYOK removed — AI calls now go through /api/* serverless routes that
  // hold the provider key in Vercel env vars. Nothing here in the browser.)

  // ----- Per-day data -----
  const [meals, setMeals] = useState(() => load(`meals:${dateKey}`, blankMeals()));
  const [cheats, setCheats] = useState(() => load(`cheats:${dateKey}`, []));
  // Coffee: legacy was a boolean[] aligned with profile.coffeeSchedule. Now
  // it's an array of entries { id, scheduleIdx?, qty, unit, ts? }. Booleans
  // migrate to one entry per checked slot.
  const [coffeeLog, setCoffeeLog] = useState(() => {
    const stored = load(`coffee:${dateKey}`, null);
    if (Array.isArray(stored) && stored.length > 0 && typeof stored[0] === "object") {
      return stored;
    }
    if (Array.isArray(stored)) {
      return stored.flatMap((checked, i) =>
        checked ? [{ id: uid("c"), scheduleIdx: i, qty: 1, unit: "cup" }] : [],
      );
    }
    return [];
  });
  const [steps, setSteps] = useState(() => load(`steps:${dateKey}`, 0));
  // Water: array of entries { id, qty, unit, ts? } — qty defaults to 1 cup.
  // Legacy: number value migrates to N entries on first load.
  const [waterLog, setWaterLog] = useState(() => {
    const stored = load(`water:${dateKey}`, null);
    if (Array.isArray(stored)) return stored;
    if (typeof stored === "number" && stored > 0) {
      return Array.from({ length: stored }, (_, i) => ({
        id: uid("w"),
        qty: 1,
        unit: "cup",
      }));
    }
    return [];
  });
  const [dayTypeId, setDayTypeId] = useState(() => load(`dayType:${dateKey}`, profile.dayTypes[0]?.id || "rest"));
  const [medsTakenToday, setMedsTakenToday] = useState(() => load(`meds:taken:${dateKey}`, []));
  // Sleep: { hours, bedTime?, wakeTime?, quality? } stored per day.
  const [sleep, setSleep] = useState(() => load(`sleep:${dateKey}`, null));

  // ----- Cross-day logs -----
  const [weightLog, setWeightLog] = useState(() => load("weight:log", []));
  const [bodyPhotos, setBodyPhotos] = useState(() => load("body:photos", []));
  const [meds, setMeds] = useState(() => load("meds:list", []));
  const [customFoods, setCustomFoods] = useState(() => load("foods:custom", {}));

  // ----- Live clock for IF timer -----
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30 * 1000); // 30s
    return () => clearInterval(t);
  }, []);

  // ----- Workout state -----
  const [customPrograms, setCustomPrograms] = useState(() => load("workout:custom-programs", []));
  const [activeProgramId, setActiveProgramId] = useState(() => load("workout:active-program", "full_body_4day"));
  const [weeks, setWeeks] = useState(() => load("workout:weeks", {}));
  const [history, setHistory] = useState(() => load("workout:history", []));
  const [currentSession, setCurrentSession] = useState(() => load("workout:current", null));

  // ----- Sports -----
  // Library of sports the user can log (defaults seeded; user can add more).
  // Each session is logged with sportId, durationMin, kcal (auto from MET ×
  // weight × hours, or manual override), intensity, notes, date.
  const [sportsList, setSportsList] = useState(() => load("sports:list", DEFAULT_SPORTS));
  const [sportsLog, setSportsLog] = useState(() => load("sports:log", []));

  // ----- Grocery -----
  const [grocery, setGrocery] = useState(() => {
    const stored = load("grocery:items", null);
    if (stored) return stored;
    return cloneTemplate(TEMPLATES.saidur).groceryTemplate.map((it) => ({ ...it, qty: it.initialQty }));
  });
  const [manualShopping, setManualShopping] = useState(() => load("shopping:manual", []));
  const [groceryActivity, setGroceryActivity] = useState(() => load("grocery:activity", []));

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
  useEffect(() => save(`meals:${dateKey}`, meals), [meals, dateKey]);
  useEffect(() => save(`cheats:${dateKey}`, cheats), [cheats, dateKey]);
  useEffect(() => save(`coffee:${dateKey}`, coffeeLog), [coffeeLog, dateKey]);
  useEffect(() => save(`steps:${dateKey}`, steps), [steps, dateKey]);
  useEffect(() => save(`water:${dateKey}`, waterLog), [waterLog, dateKey]);
  useEffect(() => save(`dayType:${dateKey}`, dayTypeId), [dayTypeId, dateKey]);
  useEffect(() => save(`meds:taken:${dateKey}`, medsTakenToday), [medsTakenToday, dateKey]);
  useEffect(() => {
    if (sleep) save(`sleep:${dateKey}`, sleep);
    else save(`sleep:${dateKey}`, null);
  }, [sleep, dateKey]);
  useEffect(() => save("weight:log", weightLog), [weightLog]);
  useEffect(() => save("body:photos", bodyPhotos), [bodyPhotos]);
  useEffect(() => save("meds:list", meds), [meds]);
  useEffect(() => save("foods:custom", customFoods), [customFoods]);
  useEffect(() => save("workout:custom-programs", customPrograms), [customPrograms]);
  useEffect(() => save("workout:active-program", activeProgramId), [activeProgramId]);
  useEffect(() => save("workout:weeks", weeks), [weeks]);
  useEffect(() => save("workout:history", history), [history]);
  useEffect(() => save("workout:current", currentSession), [currentSession]);
  useEffect(() => save("sports:list", sportsList), [sportsList]);
  useEffect(() => save("sports:log", sportsLog), [sportsLog]);
  useEffect(() => save("grocery:items", grocery), [grocery]);
  useEffect(() => save("shopping:manual", manualShopping), [manualShopping]);
  useEffect(() => save("grocery:activity", groceryActivity), [groceryActivity]);
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

  const todaysSportsKcal = useMemo(() => {
    return sportsLog
      .filter((s) => todayKey(new Date(s.date)) === dateKey)
      .reduce((sum, s) => sum + (Number(s.kcal) || 0), 0);
  }, [sportsLog, dateKey]);

  // Combined activity kcal — used by Today's Burning panel and the daily
  // eating target adjustment so that an evening football game lifts your
  // calorie budget the same way a workout would.
  const todaysActivityKcal = todaysWorkoutKcal + todaysSportsKcal;

  // ----- Diet totals (using customFoods overrides) -----
  const calc = useCallback((items) => calcMeal(items, customFoods), [customFoods]);

  const dayTotals = useMemo(() => {
    const out = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
    const allMeals = [...meals.lunch, ...meals.shake, ...meals.dinner, ...meals.snack, ...cheats];
    for (const m of allMeals) {
      const t = calcMeal(m.items, customFoods);
      out.kcal += t.kcal;
      out.protein += t.protein;
      out.fat += t.fat || 0;
      out.carbs += t.carbs || 0;
    }
    return out;
  }, [meals, cheats, customFoods]);

  const cheatSurplus = useMemo(() => {
    const baseline = profile.cheatBaselineKcal || 1000;
    return cheats.reduce(
      (s, c) => s + Math.max(0, calcMeal(c.items, customFoods).kcal - baseline),
      0,
    );
  }, [cheats, profile.cheatBaselineKcal, customFoods]);

  // ----- Streak: count back from today, day counts if total kcal > 100 -----
  const streak = useMemo(() => {
    const todayCalc = (() => {
      let kcal = 0;
      for (const slot of SLOTS) {
        for (const m of meals[slot] || []) kcal += calcMeal(m.items, customFoods).kcal;
      }
      for (const c of cheats) kcal += calcMeal(c.items, customFoods).kcal;
      return kcal;
    })();
    let count = 0;
    if (todayCalc > 100) count = 1;
    else return 0;
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    for (let i = 1; i < 365; i++) {
      const d = new Date(day);
      d.setDate(d.getDate() - i);
      const k = todayKey(d);
      const m = load(`meals:${k}`, null);
      const ch = load(`cheats:${k}`, null);
      if (!m && !ch) break;
      let kcal = 0;
      if (m) {
        for (const slot of SLOTS) {
          for (const meal of m[slot] || []) kcal += calcMeal(meal.items, customFoods).kcal;
        }
      }
      if (ch) {
        for (const c of ch) kcal += calcMeal(c.items, customFoods).kcal;
      }
      if (kcal <= 100) break;
      count++;
    }
    return count;
  }, [meals, cheats, customFoods]);

  // ----- IF timer status -----
  const ifStatus = useMemo(() => {
    const ws = profile.windowStart;
    const we = profile.windowEnd;
    if (!ws || !we) return null;
    const [sh, sm] = ws.split(":").map(Number);
    const [eh, em] = we.split(":").map(Number);
    if (Number.isNaN(sh) || Number.isNaN(eh)) return null;
    const nowDate = new Date(now);
    const start = new Date(nowDate);
    start.setHours(sh, sm || 0, 0, 0);
    const end = new Date(nowDate);
    end.setHours(eh, em || 0, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1);
    const windowMs = end - start;
    if (nowDate >= start && nowDate < end) {
      return {
        state: "open",
        msLeft: end - nowDate,
        windowMs,
        nextLabel: "until window closes",
      };
    }
    let nextStart = start;
    if (nowDate >= end) {
      nextStart = new Date(start);
      nextStart.setDate(nextStart.getDate() + 1);
    }
    return {
      state: "closed",
      msLeft: nextStart - nowDate,
      windowMs,
      nextLabel: "until window opens",
    };
  }, [profile.windowStart, profile.windowEnd, now]);

  // ----- Diet target = day-type target + step adjustment + workout kcal bonus -----
  const dailyTargetKcal = useMemo(
    () =>
      Math.max(1200, (dayType?.target || 2000) + stepAdjustKcal + todaysActivityKcal),
    [dayType, stepAdjustKcal, todaysActivityKcal],
  );

  // ----- Diet mutators -----
  function logGroceryActivity(entries) {
    if (!entries || entries.length === 0) return;
    setGroceryActivity((prev) => [
      ...entries.map((e) => ({ id: uid("act"), ts: Date.now(), ...e })),
      ...prev,
    ].slice(0, 500)); // cap to last 500 events
  }

  function addMealToSlot(slot, meal) {
    if (!SLOTS.includes(slot)) slot = "snack";
    const fullMeal = { id: uid("m"), at: Date.now(), ...meal };
    setMeals((prev) => ({ ...prev, [slot]: [...prev[slot], fullMeal] }));
    // Decrement inventory
    const deltas = ingredientDeltas(meal.items);
    if (Object.keys(deltas).length) {
      const activityEntries = [];
      setGrocery((prev) =>
        prev.map((it) => {
          if (deltas[it.key] != null) {
            const newQty = Math.max(0, it.qty - deltas[it.key]);
            const realDelta = newQty - it.qty;
            if (realDelta !== 0) {
              activityEntries.push({
                key: it.key,
                name: it.name,
                unit: it.unit,
                delta: realDelta,
                reason: "consumed",
                source: meal.name,
              });
            }
            return { ...it, qty: newQty };
          }
          return it;
        }),
      );
      logGroceryActivity(activityEntries);
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
    setCoffeeLog([]);
    setSteps(0);
    setWaterLog([]);
    setMedsTakenToday([]);
    showSnack("Day cleared");
  }

  // ----- Sleep -----
  // Compute hours from bedTime (yesterday) → wakeTime (today) when both
  // provided; else accept hours directly.
  function setSleepEntry({ hours, bedTime, wakeTime, quality, note } = {}) {
    let h = hours != null ? Number(hours) : null;
    if ((h == null || isNaN(h)) && bedTime && wakeTime) {
      const [bh, bm] = bedTime.split(":").map(Number);
      const [wh, wm] = wakeTime.split(":").map(Number);
      let mins = (wh * 60 + wm) - (bh * 60 + bm);
      if (mins <= 0) mins += 24 * 60; // overnight
      h = +(mins / 60).toFixed(2);
    }
    setSleep({
      hours: h,
      bedTime: bedTime || null,
      wakeTime: wakeTime || null,
      quality: quality != null && quality !== "" ? Number(quality) : null,
      note: (note || "").trim() || null,
    });
    showSnack(h != null ? `Sleep logged: ${h.toFixed(1)} h` : "Sleep logged");
  }
  function clearSleep() {
    setSleep(null);
  }

  // ----- Water entries -----
  function addWaterEntry({ qty = 1, unit = "cup", time } = {}) {
    setWaterLog((prev) => [
      ...prev,
      { id: uid("w"), qty: Number(qty) || 1, unit, time: time || null, ts: Date.now() },
    ]);
  }
  function removeWaterEntry(id) {
    setWaterLog((prev) => prev.filter((e) => e.id !== id));
  }

  // ----- Coffee entries -----
  function addCoffeeEntry({ qty = 1, unit = "cup", time, scheduleIdx } = {}) {
    setCoffeeLog((prev) => [
      ...prev,
      {
        id: uid("c"),
        qty: Number(qty) || 1,
        unit,
        time: time || null,
        scheduleIdx: scheduleIdx ?? null,
        ts: Date.now(),
      },
    ]);
  }
  function removeCoffeeEntry(id) {
    setCoffeeLog((prev) => prev.filter((e) => e.id !== id));
  }
  function toggleCoffeeSchedule(idx) {
    // Used by the schedule chips: if any entry exists for this idx, remove
    // them all; otherwise add one matching the schedule slot.
    setCoffeeLog((prev) => {
      const matches = prev.filter((e) => e.scheduleIdx === idx);
      if (matches.length > 0) {
        const matchIds = new Set(matches.map((m) => m.id));
        return prev.filter((e) => !matchIds.has(e.id));
      }
      return [
        ...prev,
        { id: uid("c"), qty: 1, unit: "cup", scheduleIdx: idx, ts: Date.now() },
      ];
    });
  }

  // ----- Weight log -----
  function addWeightEntry(weightKg, note = "") {
    const w = Number(weightKg);
    if (!w) return;
    setWeightLog((prev) => [
      ...prev,
      { id: uid("w"), date: Date.now(), weightKg: w, note: note.trim() },
    ]);
    // Mirror latest weight into the profile so calorie calcs stay accurate
    setProfile((p) => ({ ...p, stats: { ...p.stats, weightKg: w } }));
    showSnack(`Logged ${w} kg`);
  }
  function removeWeightEntry(id) {
    setWeightLog((prev) => prev.filter((e) => e.id !== id));
  }
  const latestWeight = weightLog.length ? weightLog[weightLog.length - 1] : null;

  // ----- Measurements (extends the weight log with body measurements + tags) -----
  // Shape: { id, date, weightKg, neckCm?, chestCm?, pelvicCm?, hipCm?,
  //          bicepCm?, thighCm?, bodyFatPct?, bmr?, note, tags: string[] }
  // Existing weight-only entries continue to work because the optional
  // measurement fields default to null.
  function addMeasurement(payload) {
    const w = Number(payload.weightKg);
    if (!w && !payload.allowEmptyWeight) {
      // weight is the canonical anchor; require it unless the caller opts out
      return;
    }
    const entry = {
      id: uid("m"),
      date: payload.date || Date.now(),
      weightKg: w || null,
      neckCm: payload.neckCm != null && payload.neckCm !== "" ? Number(payload.neckCm) : null,
      chestCm: payload.chestCm != null && payload.chestCm !== "" ? Number(payload.chestCm) : null,
      pelvicCm: payload.pelvicCm != null && payload.pelvicCm !== "" ? Number(payload.pelvicCm) : null,
      hipCm: payload.hipCm != null && payload.hipCm !== "" ? Number(payload.hipCm) : null,
      bicepCm: payload.bicepCm != null && payload.bicepCm !== "" ? Number(payload.bicepCm) : null,
      thighCm: payload.thighCm != null && payload.thighCm !== "" ? Number(payload.thighCm) : null,
      bodyFatPct:
        payload.bodyFatPct != null && payload.bodyFatPct !== "" ? Number(payload.bodyFatPct) : null,
      bmr: payload.bmr != null && payload.bmr !== "" ? Number(payload.bmr) : null,
      note: (payload.note || "").trim(),
      tags: Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : [],
    };
    setWeightLog((prev) => [...prev, entry]);
    // Mirror latest weight into the profile
    if (w) setProfile((p) => ({ ...p, stats: { ...p.stats, weightKg: w } }));
    showSnack(
      w
        ? `Logged ${w} kg measurement`
        : "Measurement logged",
    );
  }

  // ----- Body photos -----
  function addBodyPhoto(payload) {
    const entry = {
      id: uid("ph"),
      date: payload.date || Date.now(),
      dataUrl: payload.dataUrl,
      mediaType: payload.mediaType || "image/jpeg",
      view: payload.view || "front",
      note: (payload.note || "").trim(),
      weightKg: payload.weightKg ? Number(payload.weightKg) : null,
      width: payload.width || null,
      height: payload.height || null,
    };
    setBodyPhotos((prev) => [...prev, entry]);
    showSnack("Progress photo saved");
  }
  function removeBodyPhoto(id) {
    setBodyPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  // ----- Custom foods (carbs/fat editor) -----
  function updateCustomFood(key, patch) {
    setCustomFoods((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));
  }
  function resetCustomFood(key) {
    setCustomFoods((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // ----- Medications -----
  function saveMedication(med) {
    setMeds((prev) => {
      const idx = prev.findIndex((m) => m.id === med.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = med;
        return next;
      }
      return [...prev, med];
    });
    showSnack(`Saved ${med.name}`);
  }
  function deleteMedication(id) {
    setMeds((prev) => prev.filter((m) => m.id !== id));
    setMedsTakenToday((prev) => prev.filter((d) => d.medId !== id));
  }
  function logDose(med, quantityOverride, note = "") {
    const qty = Number(quantityOverride ?? med.defaultQuantity) || 1;
    const entry = {
      id: uid("dose"),
      medId: med.id,
      medName: med.name,
      type: med.type,
      category: med.category || "med",
      quantity: qty,
      unit: med.unit || "",
      note,
      takenAt: Date.now(),
    };
    setMedsTakenToday((prev) => [...prev, entry]);
    showSnack(`Took ${qty} ${med.unit || ""} ${med.name}`.trim());
  }
  function unlogDose(doseId) {
    setMedsTakenToday((prev) => prev.filter((d) => d.id !== doseId));
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

  // ----- Sports mutators -----
  function addSportSession(payload) {
    const sport = sportsList.find((s) => s.id === payload.sportId);
    if (!sport) return;
    const durationMin = Number(payload.durationMin) || 0;
    if (durationMin <= 0) return;
    const intensity = payload.intensity || "moderate";
    const autoKcal = estimateSportKcal({
      met: sport.met,
      weightKg: profile.stats?.weightKg || 70,
      durationMin,
      intensity,
    });
    const kcal =
      payload.kcal != null && payload.kcal !== "" ? Math.max(0, Number(payload.kcal)) : autoKcal;
    const entry = {
      id: uid("sp"),
      date: payload.date || Date.now(),
      sportId: sport.id,
      sportName: sport.name,
      sportIcon: sport.icon,
      durationMin,
      kcal,
      autoKcal,
      intensity,
      notes: (payload.notes || "").trim(),
    };
    setSportsLog((prev) => [entry, ...prev]);
    showSnack(`Logged ${durationMin}m ${sport.name} · ${kcal} kcal`);
  }
  function removeSportSession(id) {
    setSportsLog((prev) => prev.filter((s) => s.id !== id));
  }
  function clearSportsLog() {
    setSportsLog([]);
  }
  function saveSport(sport) {
    setSportsList((prev) => {
      const idx = prev.findIndex((s) => s.id === sport.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = sport;
        return next;
      }
      return [...prev, sport];
    });
    showSnack(`Saved sport "${sport.name}"`);
  }
  function deleteSport(id) {
    setSportsList((prev) => prev.filter((s) => s.id !== id));
  }

  // ----- Grocery mutators -----
  function adjustGrocery(key, delta) {
    setGrocery((prev) => {
      const it = prev.find((x) => x.key === key);
      if (!it) return prev;
      const newQty = Math.max(0, it.qty + delta);
      const realDelta = newQty - it.qty;
      if (realDelta !== 0) {
        logGroceryActivity([
          { key, name: it.name, unit: it.unit, delta: realDelta, reason: "manual" },
        ]);
      }
      return prev.map((x) => (x.key === key ? { ...x, qty: newQty } : x));
    });
  }
  function restockGrocery(key) {
    setGrocery((prev) => {
      const it = prev.find((x) => x.key === key);
      if (!it) return prev;
      const ps = it.packetSize || 1;
      logGroceryActivity([
        { key, name: it.name, unit: it.unit, delta: ps, reason: "restock" },
      ]);
      return prev.map((x) => (x.key === key ? { ...x, qty: x.qty + ps } : x));
    });
    showSnack("Restocked");
  }
  function setGroceryQty(key, qty) {
    setGrocery((prev) => {
      const it = prev.find((x) => x.key === key);
      if (!it) return prev;
      const target = Math.max(0, qty);
      const realDelta = target - it.qty;
      if (realDelta !== 0) {
        logGroceryActivity([
          { key, name: it.name, unit: it.unit, delta: realDelta, reason: "manual" },
        ]);
      }
      return prev.map((x) => (x.key === key ? { ...x, qty: target } : x));
    });
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
    logGroceryActivity([
      { key: "_all", name: "Inventory reset", unit: "", delta: 0, reason: "reset" },
    ]);
    setGrocery(profile.groceryTemplate.map((it) => ({ ...it, qty: it.initialQty })));
    showSnack("Inventory reset to template");
  }
  function clearGroceryActivity() {
    setGroceryActivity([]);
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
    // day data
    dateKey,
    meals, addMealToSlot, removeMealFromSlot,
    cheats, addCheat, removeCheat, cheatSurplus,
    coffeeLog, addCoffeeEntry, removeCoffeeEntry, toggleCoffeeSchedule,
    steps, setSteps, stepAdjustKcal,
    waterLog, addWaterEntry, removeWaterEntry,
    sleep, setSleepEntry, clearSleep,
    dayTypeId, setDayTypeId, dayType,
    clearDay,
    // totals + helpers
    dayTotals, dailyTargetKcal,
    calc, // calcMeal pre-bound with customFoods
    streak,
    ifStatus,
    now,
    // workout
    allPrograms, customPrograms, activeProgram, activeProgramId, setActiveProgramId,
    weeks, setProgramWeek, resetProgramWeek,
    saveCustomProgram, deleteCustomProgram,
    history, clearHistory,
    currentSession, startSession, pauseSession, resumeSession, logSet, unlogSet,
    finishSession, cancelSession,
    todaysDay, todaysDayId, todaysWorkoutKcal,
    // sports
    sportsList, sportsLog, addSportSession, removeSportSession, clearSportsLog,
    saveSport, deleteSport, todaysSportsKcal, todaysActivityKcal,
    // grocery
    grocery, adjustGrocery, restockGrocery, setGroceryQty,
    saveGroceryItem, removeGroceryItem, resetGroceryToTemplate,
    groceryActivity, clearGroceryActivity,
    manualShopping, addManualShopping, toggleManualShopping, removeManualShopping,
    // plan
    plan, setPlanForDate, clearPlan,
    // body
    weightLog, addWeightEntry, removeWeightEntry, latestWeight,
    addMeasurement,
    bodyPhotos, addBodyPhoto, removeBodyPhoto,
    // foods overrides
    customFoods, updateCustomFood, resetCustomFood,
    // medications
    meds, saveMedication, deleteMedication,
    medsTakenToday, logDose, unlogDose,
    // misc
    showSnack, snackbar,
    shouldSuggestLightDinner,
    uid,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
