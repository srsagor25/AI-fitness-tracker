// Browser notification helpers. Permission is opt-in (button), and we
// dedupe fired notifications per session via a Set so a reminder doesn't
// re-fire every 30s tick while it's still due.

const FIRED_KEY = "aift:notify:fired-today";

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadFired() {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return { day: todayStamp(), ids: [] };
    const parsed = JSON.parse(raw);
    if (parsed.day !== todayStamp()) return { day: todayStamp(), ids: [] };
    return parsed;
  } catch {
    return { day: todayStamp(), ids: [] };
  }
}

function saveFired(state) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(state));
  } catch {
    // ignore — quota etc.
  }
}

export function notifySupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission() {
  if (!notifySupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotifyPermission() {
  if (!notifySupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  const r = await Notification.requestPermission();
  return r;
}

export function fireNotification({ id, title, body, tag, icon }) {
  if (!notifySupported()) return false;
  if (Notification.permission !== "granted") return false;
  const fired = loadFired();
  if (id && fired.ids.includes(id)) return false;
  try {
    new Notification(title, { body, tag: tag || id, icon });
  } catch {
    return false;
  }
  if (id) {
    fired.ids.push(id);
    saveFired(fired);
  }
  return true;
}

// Fire once when a reminder transitions into "now"/"late" — i.e. it just
// became due. The dedupe set prevents re-fires across 30-second ticks.
export function notifyDueReminders(reminders) {
  if (!notifySupported() || Notification.permission !== "granted") return 0;
  let fired = 0;
  for (const r of reminders || []) {
    if (r.urgency !== "now" && r.urgency !== "late") continue;
    if (r.urgency === "done") continue;
    const id = `${todayStamp()}:${r.id}`;
    const ok = fireNotification({
      id,
      title: r.label,
      body: r.detail || "",
      tag: r.id,
    });
    if (ok) fired++;
  }
  return fired;
}
