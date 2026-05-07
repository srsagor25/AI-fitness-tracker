import { useState } from "react";
import { useApp } from "../store/AppContext.jsx";
import { Card, CardHeader, Stat } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Field, TextInput, Select, Chip } from "../components/ui/Field.jsx";
import { TEMPLATES } from "../store/profiles.js";
import { bmr, tdee, dailyTarget } from "../lib/calories.js";
import { Eye, EyeOff, Lightbulb } from "lucide-react";

export function Profile() {
  const { profile, updateProfile, selectProfileTemplate, apiKey, setApiKey } = useApp();
  const [showKey, setShowKey] = useState(false);

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
          <Field label="Eating window (label)">
            <TextInput value={profile.eatingWindow || ""} onChange={(e) => update({ eatingWindow: e.target.value })} placeholder="e.g. 1 PM – 9 PM (16:8)" />
          </Field>
          <Field label="Window start (HH:MM)">
            <TextInput
              type="time"
              value={profile.windowStart || ""}
              onChange={(e) => update({ windowStart: e.target.value })}
            />
          </Field>
          <Field label="Window end (HH:MM)">
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
          <Field label="Weight (kg)">
            <TextInput type="number" step="0.1" value={profile.stats?.weightKg || ""} onChange={(e) => updateStats({ weightKg: Number(e.target.value) || 0 })} />
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
              <option value="cut">Cut (−500 kcal)</option>
              <option value="maintain">Maintain</option>
              <option value="bulk">Bulk (+300 kcal)</option>
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

      <Card>
        <CardHeader
          kicker="API"
          title="Anthropic API Key"
          subtitle="Required for photo macros and eat-out suggestions. Stored only in your browser."
        />
        <Field label="API key">
          <div className="flex gap-2">
            <TextInput
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
            />
            <Button variant="outline" onClick={() => setShowKey((v) => !v)}>
              {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
              {showKey ? "Hide" : "Show"}
            </Button>
          </div>
        </Field>
        <p className="font-body italic text-ink-muted text-sm mt-2">
          Key never leaves your browser — Diet calls Anthropic directly with the
          dangerous-direct-browser-access header. Fine for personal use, not for public
          deploys.
        </p>
      </Card>

      <Card>
        <CardHeader kicker="Day Types" title="Your day-type targets" />
        <ul className="divide-y divide-ink/30 border-y border-ink/30">
          {profile.dayTypes.map((dt) => (
            <li key={dt.id} className="py-2 flex items-center gap-3">
              <span className="text-2xl">{dt.icon}</span>
              <div className="flex-1">
                <div className="font-body text-base">{dt.label}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  Target {dt.target} kcal
                  {dt.suggestShake && ` · suggested shake: ${dt.suggestShake}`}
                </div>
              </div>
              <Chip color={dt.color}>{dt.id}</Chip>
            </li>
          ))}
        </ul>
      </Card>

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
