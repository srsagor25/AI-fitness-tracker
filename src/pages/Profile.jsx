import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { TEMPLATES } from "../store/profiles.js";
import { BUILTIN_PROGRAMS } from "../store/defaults.js";
import { bmr, tdee, dailyTarget, suggestedProtein } from "../lib/calories.js";
import { Lightbulb, Dumbbell } from "lucide-react";

export function Profile() {
  const {
    profile,
    updateProfile,
    selectProfileTemplate,
    activeProgramId,
    setActiveProgramId,
    customPrograms,
    dayTypes,
    showSnack,
  } = useApp();

  function update(patch) {
    updateProfile(patch);
  }
  function updateStats(patch) {
    updateProfile({ stats: { ...profile.stats, ...patch } });
  }

  return (
    <>
      <Card>
        <CardHeader
          kicker="Profile Templates"
          title="Load a starter"
          subtitle="Loading a template replaces your current profile, inventory, presets, and clears today's log."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(TEMPLATES).map((t) => (
            <div key={t.id} className="border-2 border-ink p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <h4 className="font-display text-xl font-bold">{t.name}</h4>
                  <p className="font-body text-sm italic text-ink-muted">{t.publicLabel}</p>
                </div>
                <Chip color={profile.id === t.id ? "#c44827" : "#6b5a3e"}>
                  {profile.id === t.id ? "Active" : t.id}
                </Chip>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted mt-2">
                {Object.keys(t.lunchPresets).length} lunch ·{" "}
                {Object.keys(t.shakePresets).length} shake ·{" "}
                {Object.keys(t.dinnerPresets).length} dinner ·{" "}
                {Object.keys(t.cheatPresets).length} cheat
              </div>
              <Button
                variant={profile.id === t.id ? "outline" : "primary"}
                size="sm"
                className="mt-2"
                onClick={() => {
                  if (
                    confirm(
                      `Load the "${t.name}" template? This replaces your current profile, inventory, and clears today's log.`,
                    )
                  ) {
                    selectProfileTemplate(t.id);
                  }
                }}
              >
                {profile.id === t.id ? "Reload" : "Load"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          kicker="You"
          title="Personal Details"
          subtitle="Used by both Diet and Workout to compute targets."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name">
            <TextInput value={profile.name} onChange={(e) => update({ name: e.target.value })} />
          </Field>
          <Field label="Goal description">
            <TextInput value={profile.goal} onChange={(e) => update({ goal: e.target.value })} />
          </Field>
          <Field
            label="Eating window start"
            hint="Used for the live IF timer on Today and as fallback for meal slot times."
          >
            <TextInput
              type="time"
              value={profile.windowStart || ""}
              onChange={(e) => update({ windowStart: e.target.value })}
            />
          </Field>
          <Field label="Eating window end">
            <TextInput
              type="time"
              value={profile.windowEnd || ""}
              onChange={(e) => update({ windowEnd: e.target.value })}
            />
          </Field>
          <Field label="Water target (cups/day)">
            <TextInput
              type="number"
              min="0"
              value={profile.waterTarget ?? 8}
              onChange={(e) => update({ waterTarget: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Lunch time">
            <TextInput
              type="time"
              value={profile.mealTimes?.lunch || ""}
              onChange={(e) => update({ mealTimes: { ...(profile.mealTimes || {}), lunch: e.target.value } })}
            />
          </Field>
          <Field label="Shake time">
            <TextInput
              type="time"
              value={profile.mealTimes?.shake || ""}
              onChange={(e) => update({ mealTimes: { ...(profile.mealTimes || {}), shake: e.target.value } })}
            />
          </Field>
          <Field label="Dinner time">
            <TextInput
              type="time"
              value={profile.mealTimes?.dinner || ""}
              onChange={(e) => update({ mealTimes: { ...(profile.mealTimes || {}), dinner: e.target.value } })}
            />
          </Field>
          <Field label="Workout time (optional)">
            <TextInput
              type="time"
              value={profile.workoutTime || ""}
              onChange={(e) => update({ workoutTime: e.target.value })}
            />
          </Field>
          <Field
            label="Restock alert (days before empty)"
            hint="Auto-shopping list surfaces items projected to run out within this many days based on usage."
          >
            <TextInput
              type="number"
              min="0"
              max="30"
              value={profile.groceryBufferDays ?? 3}
              onChange={(e) => update({ groceryBufferDays: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>
          <Field label="Public label">
            <TextInput value={profile.publicLabel} onChange={(e) => update({ publicLabel: e.target.value })} />
          </Field>
          <Field label="Age">
            <TextInput type="number" value={profile.stats?.age || ""} onChange={(e) => updateStats({ age: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Sex">
            <Select value={profile.stats?.sex || "male"} onChange={(e) => updateStats({ sex: e.target.value })}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
          </Field>
          <Field label="Height (cm)">
            <TextInput type="number" value={profile.stats?.heightCm || ""} onChange={(e) => updateStats({ heightCm: Number(e.target.value) || 0 })} />
          </Field>
          <Field
            label="Weight (kg)"
            hint="Synced from your latest weigh-in on the Progress tab — log new entries there."
          >
            <TextInput
              type="number"
              step="0.1"
              value={profile.stats?.weightKg || ""}
              readOnly
              className="!bg-ink/5 !cursor-default"
            />
          </Field>
          <Field
            label="Target weight (kg)"
            hint="Used by the Physique tab to estimate how long until you reach the goal."
          >
            <TextInput
              type="number"
              step="0.1"
              value={profile.targetWeightKg || ""}
              onChange={(e) => update({ targetWeightKg: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="e.g. 80"
            />
          </Field>
          <Field label="Activity">
            <Select value={profile.activity || "moderate"} onChange={(e) => update({ activity: e.target.value })}>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="athlete">Athlete</option>
            </Select>
          </Field>
          <Field label="Goal direction">
            <Select value={profile.goalKey || "maintain"} onChange={(e) => update({ goalKey: e.target.value })}>
              <option value="cut">Cut (−500 kcal · keep protein high)</option>
              <option value="maintain">Maintain</option>
              <option value="bulk">Bulk (+300 kcal)</option>
              <option value="muscle_build">Muscle build (+400 kcal · higher protein)</option>
            </Select>
          </Field>
          <Field label="Protein target (g/day)">
            <TextInput type="number" value={profile.proteinTarget} onChange={(e) => update({ proteinTarget: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Cheat baseline (kcal)">
            <TextInput type="number" value={profile.cheatBaselineKcal} onChange={(e) => update({ cheatBaselineKcal: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Workout app URL">
            <TextInput value={profile.workoutAppUrl || ""} onChange={(e) => update({ workoutAppUrl: e.target.value })} placeholder="https://..." />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader kicker="BMR / TDEE" title="Computed Energy Targets" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Stat label="BMR" value={bmr(profile)} suffix="kcal" />
          <Stat label="TDEE" value={tdee(profile)} suffix="kcal" accent="#3b6aa3" />
          <Stat
            label="Reference target"
            value={dailyTarget(profile)}
            suffix="kcal"
            accent="#c44827"
          />
        </div>
        <p className="font-body italic text-ink-muted text-sm mt-3">
          Diet uses your <strong>day-type</strong> target (rest/push/pull/etc.) plus step
          adjustment plus workout calories burned. The TDEE figure here is a reference for
          when you don't have a day-type set up.
        </p>
      </Card>

      <GoalSuggestion
        profile={profile}
        activeProgramId={activeProgramId}
        setActiveProgramId={setActiveProgramId}
        customPrograms={customPrograms}
        onUpdate={update}
        showSnack={showSnack}
      />


      <DayTypesCard profile={profile} dayTypes={dayTypes} update={update} />

      {profile.fastFoodTips && profile.fastFoodTips.length > 0 && (
        <Card>
          <CardHeader
            kicker="Cravings → Smart Swaps"
            title="Fast-food tips"
            subtitle="When the urge hits, here's the higher-protein lower-kcal version."
          />
          <ul className="space-y-2">
            {profile.fastFoodTips.map((tip, i) => (
              <li key={i} className="border-2 border-ink p-3">
                <div className="flex items-baseline gap-2">
                  <Lightbulb size={14} className="text-accent shrink-0 mt-1" />
                  <div>
                    <div className="font-display text-lg font-bold">
                      {tip.craving} → {tip.swap}
                    </div>
                    <p className="font-body text-sm italic text-ink-muted">{tip.why}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function GoalSuggestion({ profile, activeProgramId, setActiveProgramId, customPrograms, onUpdate, showSnack }) {
  const goalKey = profile.goalKey || "maintain";
  const tdeeVal = tdee(profile);
  const target = dailyTarget(profile);
  const protein = suggestedProtein(profile);
  const allPrograms = [...Object.values(BUILTIN_PROGRAMS), ...(customPrograms || [])];

  const recommendedId =
    goalKey === "muscle_build" || goalKey === "bulk"
      ? "ppl"
      : goalKey === "cut"
        ? "full_body_4day"
        : "full_body_4day";
  const rec = allPrograms.find((p) => p.id === recommendedId) || allPrograms[0];

  const goalCopy = {
    cut: {
      title: "Cut",
      detail: "Lose fat while preserving muscle. Aggressive deficit + high protein.",
      cal: `${target} kcal/day (TDEE ${tdeeVal} − 500)`,
      pro: `${protein} g protein/day (~2.2 g/kg)`,
      workout: "Full Body 4-Day works well — keeps strength while in deficit.",
    },
    maintain: {
      title: "Maintain",
      detail: "Hold weight steady. Eat at TDEE, train 3–5 sessions/week.",
      cal: `${target} kcal/day (= TDEE)`,
      pro: `${protein} g protein/day (~1.6 g/kg)`,
      workout: "Any program works — pick what you'll actually do.",
    },
    bulk: {
      title: "Bulk",
      detail: "Add weight (mostly muscle) with a moderate surplus.",
      cal: `${target} kcal/day (TDEE + 300)`,
      pro: `${protein} g protein/day (~1.8 g/kg)`,
      workout: "PPL hits each muscle group 2x per week — ideal for surplus training.",
    },
    muscle_build: {
      title: "Muscle build",
      detail: "Bigger surplus, higher protein, hypertrophy-focused split.",
      cal: `${target} kcal/day (TDEE + 400)`,
      pro: `${protein} g protein/day (~2.0 g/kg)`,
      workout: "Push/Pull/Legs (PPL) is the recommended split — 6 sessions/week.",
    },
  }[goalKey];

  function applyTargets() {
    onUpdate({ proteinTarget: protein });
    showSnack && showSnack(`Protein target set to ${protein} g/day`);
  }

  return (
    <Card>
      <CardHeader
        kicker={`Goal · ${goalCopy.title}`}
        title="Suggestions"
        subtitle={goalCopy.detail}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div className="border-2 border-ink p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">Calories</div>
          <div className="font-display text-xl font-bold mt-1">{goalCopy.cal}</div>
        </div>
        <div className="border-2 border-ink p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">Protein</div>
          <div className="font-display text-xl font-bold mt-1">{goalCopy.pro}</div>
          {profile.proteinTarget !== protein && (
            <Button variant="outline" size="sm" className="mt-2" onClick={applyTargets}>
              Apply {protein} g
            </Button>
          )}
        </div>
        <div className="border-2 border-ink p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">Workout</div>
          <div className="font-body text-base mt-1 italic">{goalCopy.workout}</div>
        </div>
      </div>

      <div className="border-2 border-ink p-3 flex items-center gap-3 flex-wrap">
        <Dumbbell size={18} className="text-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
            Recommended program
          </div>
          <div className="font-display text-xl font-bold">{rec?.name || "—"}</div>
          {rec?.subtitle && (
            <div className="font-body text-sm italic text-ink-muted">{rec.subtitle}</div>
          )}
        </div>
        {rec && activeProgramId !== rec.id && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setActiveProgramId(rec.id);
              showSnack && showSnack(`Activated ${rec.name}`);
            }}
          >
            Use this
          </Button>
        )}
        {rec && activeProgramId === rec.id && <Chip color="#4a6b3e">Active</Chip>}
      </div>

      <p className="font-body text-sm italic text-ink-muted mt-3">
        Want a custom split instead? Build one on the <strong>Programs</strong> tab —
        it'll appear next to the built-ins.
      </p>
    </Card>
  );
}

// Day types are just Rest and Workout. Workout = rest + 300 kcal, with the
// surplus expected to come from an extra shake/snack. Sports/steps already
// feed kcal independently via the Activity tab, so we don't need extras.
function DayTypesCard({ profile, dayTypes, update }) {
  const rest = dayTypes.find((d) => d.id === "rest") || { target: 2200 };
  const workout = dayTypes.find((d) => d.id === "workout") || { target: rest.target + 300 };

  function setRestTarget(v) {
    const t = Math.max(1200, Math.round(Number(v) || 0));
    update({
      restDayType: {
        ...(profile.restDayType || {}),
        id: "rest",
        label: "Rest Day",
        icon: "🛏️",
        color: "#6b5a3e",
        target: t,
      },
    });
  }

  return (
    <Card>
      <CardHeader
        kicker="Day Types"
        title="Rest vs Workout target"
        subtitle="Workout day eats 300 kcal more than rest — covered by an extra shake/snack. Sports & steps add kcal on top automatically."
      />
      <ul className="divide-y divide-ink/30 border-y border-ink/30 mb-4">
        {dayTypes.map((dt) => (
          <li key={dt.id} className="py-2 flex items-center gap-3">
            <span className="text-2xl shrink-0">{dt.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-body text-base break-words">{dt.label}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Target {dt.target} kcal
                {dt.id === "workout" ? " · rest +300" : ""}
              </div>
            </div>
            <Chip color={dt.color}>{dt.id}</Chip>
          </li>
        ))}
      </ul>

      <Field label="Rest-day kcal target" hint={`Workout day will be ${rest.target + 300} kcal.`}>
        <TextInput
          type="number"
          value={rest.target}
          onChange={(e) => setRestTarget(e.target.value)}
        />
      </Field>
    </Card>
  );
}
