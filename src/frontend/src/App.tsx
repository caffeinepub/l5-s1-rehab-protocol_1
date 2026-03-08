import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PainLogEntry {
  date: string; // "YYYY-MM-DD"
  pain: number;
}

interface RehabState {
  currentPhase: number;
  painLogs: Record<number, PainLogEntry[]>;
  exitCriteria: Record<number, boolean[]>;
  notes: Record<number, string>;
  selectedPain: Record<number, number>;
}

const DEFAULT_STATE: RehabState = {
  currentPhase: 1,
  painLogs: { 1: [], 2: [], 3: [], 4: [] },
  exitCriteria: {
    1: [false, false, false, false],
    2: [false, false, false, false],
    3: [false, false, false, false],
  },
  notes: { 1: "", 2: "", 3: "", 4: "" },
  selectedPain: { 1: 5, 2: 5, 3: 5, 4: 5 },
};

const STORAGE_KEY = "rehab-state";

const PAIN_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// ─── Data ─────────────────────────────────────────────────────────────────────

const PHASES = [
  {
    id: 1,
    icon: "🔥",
    name: "Acute",
    fullName: "Acute Nerve Irritation",
    duration: "1–3 weeks",
    goal: "Calm the nerve and reduce inflammation. Rest is work.",
    gradientClass: "phase-gradient-1",
    heroClass: "phase-hero-1",
  },
  {
    id: 2,
    icon: "🏗️",
    name: "Stabilize",
    fullName: "Spine Stabilization",
    duration: "3–6 weeks",
    goal: "Rebuild the muscles that protect the disc.",
    gradientClass: "phase-gradient-2",
    heroClass: "phase-hero-2",
  },
  {
    id: 3,
    icon: "🔄",
    name: "Reintro",
    fullName: "Movement Reintroduction",
    duration: "6–12 weeks",
    goal: "Restore movement patterns safely. Hinge from the hips.",
    gradientClass: "phase-gradient-3",
    heroClass: "phase-hero-3",
  },
  {
    id: 4,
    icon: "⚡",
    name: "Athletic",
    fullName: "Return to Athletic Training",
    duration: "Ongoing",
    goal: "Rebuild strength and conditioning. Burpees come last.",
    gradientClass: "phase-gradient-4",
    heroClass: "phase-hero-4",
  },
];

const PHASE_EXERCISES: Record<number, { label: string; items: string[] }[]> = {
  1: [
    {
      label: "Allowed today",
      items: [
        "Short walks (several times/day)",
        "Lying prone (on stomach)",
        "McKenzie press-ups",
        "Light glute activation",
        "Heat application",
      ],
    },
    {
      label: "Avoid completely",
      items: [
        "Push-ups",
        "Squats",
        "Lunges",
        "Burpees",
        "Sit-ups",
        "Heavy lifting",
        "Deep bending",
        "Twisting",
      ],
    },
  ],
  2: [
    {
      label: "Exercises",
      items: [
        "McGill curl-up",
        "Side plank",
        "Bird dog",
        "Glute bridges",
        "Walking hills",
        "Light resistance bands",
      ],
    },
    {
      label: "Still avoid",
      items: ["Jumping", "Heavy squats", "Burpees", "Explosive movements"],
    },
  ],
  3: [
    {
      label: "Exercises",
      items: [
        "Hip hinge drills",
        "Bodyweight squats",
        "Step-ups",
        "Goblet squats (light)",
        "Resistance band rows",
        "Core stabilization",
      ],
    },
    {
      label: "Rules",
      items: [
        "Spine neutral at all times",
        "Move from hips, not back",
        "Stop before fatigue breaks form",
      ],
    },
  ],
};

const PHASE2_FOCUS = [
  "Neutral spine always",
  "Slow, controlled movement",
  "Glutes doing the work",
];

const EXIT_CRITERIA: Record<number, string[]> = {
  1: [
    "Sneezing no longer causes sharp back pain",
    "Coughing no longer spikes pain",
    "Getting out of bed does not produce a sharp stab",
    "Pain is trending down week to week",
  ],
  2: [
    "Can walk 30–45 min without symptoms",
    "Bird dogs and side planks pain-free",
    "Sitting does not trigger nerve pain",
    "Straight-leg raise does not reproduce sciatic pain",
  ],
  3: [
    "Squats pain-free for several weeks",
    "Can hinge and lift light weight without symptoms",
    "No nerve symptoms during daily activity",
    "Sneezing and coughing completely normal",
  ],
};

const PHASE4_PROGRESSION = [
  "Goblet squats",
  "Lunges",
  "Push-ups",
  "Light kettlebell work",
  "Plyometrics",
  "Burpees — last for a reason",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

interface DayEntry {
  date: string;
  label: string;
}

function getLast14Days(): DayEntry[] {
  const days: DayEntry[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split("T")[0],
      label: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()] as string,
    });
  }
  return days;
}

function getPainColor(pain: number): string {
  if (pain <= 3) return "#34c759";
  if (pain <= 6) return "#ff9500";
  return "#ff3b30";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckCircle({ done }: { done: boolean }) {
  return (
    <span className={`check-circle ${done ? "done" : ""}`}>
      {done ? "✓" : ""}
    </span>
  );
}

function CriteriaCheck({ met }: { met: boolean }) {
  return (
    <span className={`criteria-check ${met ? "met" : ""}`}>
      {met ? "✓" : ""}
    </span>
  );
}

interface ExerciseListProps {
  phase: number;
  items: string[];
  cardIdx: number;
}

function ExerciseChecklist({ phase, items, cardIdx }: ExerciseListProps) {
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false));

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <button
          type="button"
          key={item}
          aria-pressed={checked[i]}
          onClick={() => toggle(i)}
          data-ocid={`phase${phase}.exercise.checkbox.${i + 1 + cardIdx * 10}`}
          className={`flex items-center gap-3 text-sm py-2.5 border-b cursor-pointer select-none transition-opacity w-full text-left ${
            i === items.length - 1 ? "border-b-0 pb-0" : ""
          } ${i === 0 ? "pt-0" : ""} ${checked[i] ? "opacity-40" : "opacity-100"}`}
          style={{
            borderColor: "var(--rehab-border)",
            color: "var(--rehab-text)",
            background: "none",
            border: "none",
            borderBottom:
              i === items.length - 1 ? "none" : "1px solid var(--rehab-border)",
            fontFamily: "inherit",
          }}
        >
          <CheckCircle done={checked[i]} />
          <span
            style={{ textDecoration: checked[i] ? "line-through" : "none" }}
          >
            {item}
          </span>
        </button>
      ))}
    </div>
  );
}

interface AvoidListProps {
  items: string[];
  isBlue?: boolean;
}

function AvoidList({ items, isBlue = false }: AvoidListProps) {
  return (
    <ul className="flex flex-col">
      {items.map((item, i) => (
        <li
          key={item}
          className="flex items-center gap-2 text-sm py-2 border-b"
          style={{
            borderColor: "var(--rehab-border)",
            color: isBlue ? "var(--rehab-blue)" : "var(--rehab-red)",
            borderBottomWidth: i === items.length - 1 ? 0 : 1,
          }}
        >
          {!isBlue && (
            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.6 }}>
              ✕
            </span>
          )}
          {item}
        </li>
      ))}
    </ul>
  );
}

interface ExitCriteriaTabProps {
  phase: number;
  criteria: string[];
  state: RehabState;
  onToggle: (phase: number, idx: number) => void;
}

function ExitCriteriaTab({
  phase,
  criteria,
  state,
  onToggle,
}: ExitCriteriaTabProps) {
  const exitState = state.exitCriteria[phase] || [];
  const metCount = exitState.filter(Boolean).length;
  const total = criteria.length;
  const pct = (metCount / total) * 100;

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{
        background: "var(--rehab-surface)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-wide mb-3"
        style={{ color: "var(--rehab-muted)", letterSpacing: "0.04em" }}
      >
        Exit criteria — all must be met
      </div>
      <div className="flex flex-col">
        {criteria.map((item, i) => {
          const met = exitState[i] || false;
          return (
            <button
              type="button"
              key={item}
              aria-pressed={met}
              onClick={() => onToggle(phase, i)}
              data-ocid={`phase${phase}.exit.checkbox.${i + 1}`}
              className="flex items-center gap-3 text-sm cursor-pointer select-none py-3 transition-colors w-full text-left"
              style={{
                background: "none",
                border: "none",
                borderBottom:
                  i === criteria.length - 1
                    ? "none"
                    : "1px solid var(--rehab-border)",
                color: met ? "var(--rehab-green)" : "var(--rehab-text)",
                fontWeight: 400,
                fontFamily: "inherit",
              }}
            >
              <CriteriaCheck met={met} />
              {item}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--rehab-border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-400"
            style={{ width: `${pct}%`, background: "var(--rehab-green)" }}
          />
        </div>
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--rehab-muted)", whiteSpace: "nowrap" }}
        >
          {metCount} / {total}
        </span>
      </div>
    </div>
  );
}

interface DailyLogTabProps {
  phase: number;
  state: RehabState;
  onLogDay: (phase: number) => void;
  onSelectPain: (phase: number, val: number) => void;
  onSaveNotes: (phase: number, val: string) => void;
}

function DailyLogTab({
  phase,
  state,
  onLogDay,
  onSelectPain,
  onSaveNotes,
}: DailyLogTabProps) {
  const [localNotes, setLocalNotes] = useState(state.notes[phase] || "");
  const selectedPain = state.selectedPain[phase] ?? 5;
  const days = getLast14Days();
  const logs = state.painLogs[phase] || [];

  // Sync notes from state
  useEffect(() => {
    setLocalNotes(state.notes[phase] || "");
  }, [state.notes, phase]);

  return (
    <div>
      {/* Pain scale */}
      <div className="mb-4">
        <div
          className="text-xs font-bold uppercase tracking-wide mb-3"
          style={{ color: "var(--rehab-muted)", letterSpacing: "0.04em" }}
        >
          Today's pain level (0–10)
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {PAIN_LEVELS.map((level) => (
              <button
                type="button"
                key={`pain-level-${level}`}
                className={`pain-btn ${selectedPain === level ? "selected" : ""}`}
                onClick={() => onSelectPain(phase, level)}
                aria-label={`Pain level ${level}`}
              >
                {level}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
            style={{
              background: "var(--rehab-blue)",
              boxShadow: "0 2px 8px rgba(0,122,255,0.3)",
              fontFamily: "inherit",
            }}
            onClick={() => onLogDay(phase)}
            data-ocid={`log.p${phase}.pain_scale.button`}
          >
            Log Day
          </button>
        </div>
      </div>

      {/* Chart */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{
          background: "var(--rehab-surface)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="text-xs font-bold uppercase tracking-wide mb-3"
          style={{ color: "var(--rehab-muted)", letterSpacing: "0.04em" }}
        >
          Pain trend — last 14 days
        </div>
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {days.map((day) => {
            const entry = logs.find((l) => l.date === day.date);
            const pct = entry ? (entry.pain / 10) * 100 : 0;
            const color = entry
              ? getPainColor(entry.pain)
              : "var(--rehab-border)";
            const opacity = entry ? 1 : 0.4;
            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center justify-end gap-1"
                style={{ height: "100%" }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(pct, 3)}%`,
                    background: color,
                    opacity,
                    borderRadius: "3px 3px 0 0",
                    transition: "height 0.35s ease",
                    minHeight: 3,
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: "var(--rehab-muted)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div
        className="text-xs font-bold uppercase tracking-wide mb-2"
        style={{ color: "var(--rehab-muted)", letterSpacing: "0.04em" }}
      >
        Notes
      </div>
      <textarea
        className="w-full rounded-2xl border-none outline-none text-sm resize-y"
        style={{
          background: "var(--rehab-surface)",
          color: "var(--rehab-text)",
          padding: "14px",
          minHeight: 90,
          fontFamily: "inherit",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          marginBottom: 10,
        }}
        placeholder="How are you feeling today? Any symptoms to note..."
        value={localNotes}
        onChange={(e) => setLocalNotes(e.target.value)}
        data-ocid={`log.p${phase}.textarea`}
      />
      <button
        type="button"
        className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
        style={{
          background: "var(--rehab-blue)",
          boxShadow: "0 2px 8px rgba(0,122,255,0.3)",
          fontFamily: "inherit",
        }}
        onClick={() => onSaveNotes(phase, localNotes)}
        data-ocid={`log.p${phase}.save_button`}
      >
        Save notes
      </button>
    </div>
  );
}

// ─── Phase 1 Content ──────────────────────────────────────────────────────────

function Phase1Content({
  state,
  onToggleExit,
  onLogDay,
  onSelectPain,
  onSaveNotes,
}: {
  state: RehabState;
  onToggleExit: (p: number, i: number) => void;
  onLogDay: (p: number) => void;
  onSelectPain: (p: number, v: number) => void;
  onSaveNotes: (p: number, v: string) => void;
}) {
  const [tab, setTab] = useState("exercises");

  return (
    <div>
      <div className="segmented-control mb-5">
        <button
          type="button"
          className={`segmented-tab ${tab === "exercises" ? "active" : ""}`}
          onClick={() => setTab("exercises")}
          data-ocid="phase1.exercises.tab"
        >
          Exercises
        </button>
        <button
          type="button"
          className={`segmented-tab ${tab === "exit" ? "active" : ""}`}
          onClick={() => setTab("exit")}
          data-ocid="phase1.exit.tab"
        >
          Exit Criteria
        </button>
        <button
          type="button"
          className={`segmented-tab ${tab === "log" ? "active" : ""}`}
          onClick={() => setTab("log")}
          data-ocid="phase1.log.tab"
        >
          Daily Log
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "exercises" && (
          <motion.div
            key="exercises"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <div
              className="grid grid-cols-2 gap-3 mb-4"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--rehab-surface)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wide mb-3"
                  style={{
                    color: "var(--rehab-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Allowed today
                </div>
                <ExerciseChecklist
                  phase={1}
                  items={PHASE_EXERCISES[1][0].items}
                  cardIdx={0}
                />
              </div>
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--rehab-surface)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wide mb-3"
                  style={{
                    color: "var(--rehab-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Avoid completely
                </div>
                <AvoidList items={PHASE_EXERCISES[1][1].items} />
              </div>
            </div>
          </motion.div>
        )}

        {tab === "exit" && (
          <motion.div
            key="exit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <ExitCriteriaTab
              phase={1}
              criteria={EXIT_CRITERIA[1]}
              state={state}
              onToggle={onToggleExit}
            />
          </motion.div>
        )}

        {tab === "log" && (
          <motion.div
            key="log"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <DailyLogTab
              phase={1}
              state={state}
              onLogDay={onLogDay}
              onSelectPain={onSelectPain}
              onSaveNotes={onSaveNotes}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Phase 2 Content ──────────────────────────────────────────────────────────

function Phase2Content({
  state,
  onToggleExit,
  onLogDay,
  onSelectPain,
  onSaveNotes,
}: {
  state: RehabState;
  onToggleExit: (p: number, i: number) => void;
  onLogDay: (p: number) => void;
  onSelectPain: (p: number, v: number) => void;
  onSaveNotes: (p: number, v: string) => void;
}) {
  const [tab, setTab] = useState("exercises");

  return (
    <div>
      <div className="segmented-control mb-5">
        <button
          type="button"
          className={`segmented-tab ${tab === "exercises" ? "active" : ""}`}
          onClick={() => setTab("exercises")}
          data-ocid="phase2.exercises.tab"
        >
          Exercises
        </button>
        <button
          type="button"
          className={`segmented-tab ${tab === "exit" ? "active" : ""}`}
          onClick={() => setTab("exit")}
          data-ocid="phase2.exit.tab"
        >
          Exit Criteria
        </button>
        <button
          type="button"
          className={`segmented-tab ${tab === "log" ? "active" : ""}`}
          onClick={() => setTab("log")}
          data-ocid="phase2.log.tab"
        >
          Daily Log
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "exercises" && (
          <motion.div
            key="exercises"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <div
              className="grid gap-3 mb-4"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--rehab-surface)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wide mb-3"
                  style={{
                    color: "var(--rehab-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Exercises
                </div>
                <ExerciseChecklist
                  phase={2}
                  items={PHASE_EXERCISES[2][0].items}
                  cardIdx={0}
                />
              </div>
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--rehab-surface)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wide mb-3"
                  style={{
                    color: "var(--rehab-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Still avoid
                </div>
                <AvoidList items={PHASE_EXERCISES[2][1].items} />
                <div
                  className="mt-3 pt-3"
                  style={{ borderTop: "1px solid var(--rehab-border)" }}
                >
                  <div
                    className="text-xs font-bold uppercase tracking-wide mb-2"
                    style={{
                      color: "var(--rehab-muted)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Focus on
                  </div>
                  <AvoidList items={PHASE2_FOCUS} isBlue />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "exit" && (
          <motion.div
            key="exit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <ExitCriteriaTab
              phase={2}
              criteria={EXIT_CRITERIA[2]}
              state={state}
              onToggle={onToggleExit}
            />
          </motion.div>
        )}

        {tab === "log" && (
          <motion.div
            key="log"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <DailyLogTab
              phase={2}
              state={state}
              onLogDay={onLogDay}
              onSelectPain={onSelectPain}
              onSaveNotes={onSaveNotes}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Phase 3 Content ──────────────────────────────────────────────────────────

function Phase3Content({
  state,
  onToggleExit,
  onLogDay,
  onSelectPain,
  onSaveNotes,
}: {
  state: RehabState;
  onToggleExit: (p: number, i: number) => void;
  onLogDay: (p: number) => void;
  onSelectPain: (p: number, v: number) => void;
  onSaveNotes: (p: number, v: string) => void;
}) {
  const [tab, setTab] = useState("exercises");

  return (
    <div>
      <div className="segmented-control mb-5">
        <button
          type="button"
          className={`segmented-tab ${tab === "exercises" ? "active" : ""}`}
          onClick={() => setTab("exercises")}
          data-ocid="phase3.exercises.tab"
        >
          Exercises
        </button>
        <button
          type="button"
          className={`segmented-tab ${tab === "exit" ? "active" : ""}`}
          onClick={() => setTab("exit")}
          data-ocid="phase3.exit.tab"
        >
          Exit Criteria
        </button>
        <button
          type="button"
          className={`segmented-tab ${tab === "log" ? "active" : ""}`}
          onClick={() => setTab("log")}
          data-ocid="phase3.log.tab"
        >
          Daily Log
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "exercises" && (
          <motion.div
            key="exercises"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <div
              className="grid gap-3 mb-4"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--rehab-surface)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wide mb-3"
                  style={{
                    color: "var(--rehab-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Exercises
                </div>
                <ExerciseChecklist
                  phase={3}
                  items={PHASE_EXERCISES[3][0].items}
                  cardIdx={0}
                />
              </div>
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--rehab-surface)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wide mb-3"
                  style={{
                    color: "var(--rehab-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Rules
                </div>
                <AvoidList items={PHASE_EXERCISES[3][1].items} isBlue />
              </div>
            </div>
          </motion.div>
        )}

        {tab === "exit" && (
          <motion.div
            key="exit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <ExitCriteriaTab
              phase={3}
              criteria={EXIT_CRITERIA[3]}
              state={state}
              onToggle={onToggleExit}
            />
          </motion.div>
        )}

        {tab === "log" && (
          <motion.div
            key="log"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <DailyLogTab
              phase={3}
              state={state}
              onLogDay={onLogDay}
              onSelectPain={onSelectPain}
              onSaveNotes={onSaveNotes}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Phase 4 Content ──────────────────────────────────────────────────────────

function Phase4Content({
  state,
  onLogDay,
  onSelectPain,
  onSaveNotes,
}: {
  state: RehabState;
  onLogDay: (p: number) => void;
  onSelectPain: (p: number, v: number) => void;
  onSaveNotes: (p: number, v: string) => void;
}) {
  const [tab, setTab] = useState("exercises");
  const [checked, setChecked] = useState<boolean[]>(
    PHASE4_PROGRESSION.map(() => false),
  );

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  return (
    <div>
      <div className="segmented-control mb-5">
        <button
          type="button"
          className={`segmented-tab ${tab === "exercises" ? "active" : ""}`}
          onClick={() => setTab("exercises")}
          data-ocid="phase4.exercises.tab"
        >
          Progression
        </button>
        <button
          type="button"
          className={`segmented-tab ${tab === "log" ? "active" : ""}`}
          onClick={() => setTab("log")}
          data-ocid="phase4.log.tab"
        >
          Daily Log
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "exercises" && (
          <motion.div
            key="exercises"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <div
              className="rounded-2xl p-4 mb-4"
              style={{
                background: "var(--rehab-surface)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="text-xs font-bold uppercase tracking-wide mb-3"
                style={{ color: "var(--rehab-muted)", letterSpacing: "0.04em" }}
              >
                Gradual progression order
              </div>
              <div className="flex flex-col">
                {PHASE4_PROGRESSION.map((item, i) => (
                  <button
                    type="button"
                    key={item}
                    aria-pressed={checked[i]}
                    onClick={() => toggle(i)}
                    data-ocid={`phase4.exercise.checkbox.${i + 1}`}
                    className="flex items-center gap-3 text-sm py-2.5 cursor-pointer select-none transition-opacity w-full text-left"
                    style={{
                      background: "none",
                      border: "none",
                      borderBottom:
                        i === PHASE4_PROGRESSION.length - 1
                          ? "none"
                          : "1px solid var(--rehab-border)",
                      color: "var(--rehab-text)",
                      opacity: checked[i] ? 0.4 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    <CheckCircle done={checked[i]} />
                    <span
                      style={{
                        fontFamily: "'Figtree', monospace",
                        fontSize: 10,
                        color: "var(--rehab-muted)",
                        marginRight: 2,
                        minWidth: 18,
                        textDecoration: checked[i] ? "line-through" : "none",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        textDecoration: checked[i] ? "line-through" : "none",
                      }}
                    >
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div
              className="rounded-2xl p-4 mb-4"
              style={{
                background: "#fff1f0",
                border: "1.5px solid #ffccc7",
              }}
            >
              <div
                className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5"
                style={{ color: "var(--rehab-red)", letterSpacing: "0.04em" }}
              >
                ⚠️ Burpees combine
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--rehab-muted)",
                  lineHeight: 1.5,
                }}
              >
                Flexion + compression + impact — all three stress L5–S1. This is
                why they come last, after everything else is well-established.
              </p>
            </div>
          </motion.div>
        )}

        {tab === "log" && (
          <motion.div
            key="log"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <DailyLogTab
              phase={4}
              state={state}
              onLogDay={onLogDay}
              onSelectPain={onSelectPain}
              onSaveNotes={onSaveNotes}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState {
  visible: boolean;
  message: string;
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [rehabState, setRehabState] = useState<RehabState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as RehabState;
        // Merge with defaults to handle schema evolution
        return {
          ...DEFAULT_STATE,
          ...parsed,
          painLogs: { ...DEFAULT_STATE.painLogs, ...parsed.painLogs },
          exitCriteria: {
            ...DEFAULT_STATE.exitCriteria,
            ...parsed.exitCriteria,
          },
          notes: { ...DEFAULT_STATE.notes, ...parsed.notes },
          selectedPain: {
            ...DEFAULT_STATE.selectedPain,
            ...parsed.selectedPain,
          },
        };
      }
    } catch (_) {
      // ignore
    }
    return DEFAULT_STATE;
  });

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback((nextState: RehabState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }, []);

  const updateState = useCallback(
    (updater: (prev: RehabState) => RehabState) => {
      setRehabState((prev) => {
        const next = updater(prev);
        save(next);
        return next;
      });
    },
    [save],
  );

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(() => {
      setToast({ visible: false, message: msg });
    }, 2200);
  }, []);

  const handleSwitchPhase = (p: number) => {
    updateState((prev) => ({ ...prev, currentPhase: p }));
  };

  const handleToggleExit = (phase: number, idx: number) => {
    updateState((prev) => {
      const newCriteria = { ...prev.exitCriteria };
      const arr = [...(newCriteria[phase] || [])];
      arr[idx] = !arr[idx];
      newCriteria[phase] = arr;
      return { ...prev, exitCriteria: newCriteria };
    });
  };

  const handleSelectPain = (phase: number, val: number) => {
    updateState((prev) => ({
      ...prev,
      selectedPain: { ...prev.selectedPain, [phase]: val },
    }));
  };

  const handleLogDay = (phase: number) => {
    const pain = rehabState.selectedPain[phase] ?? 5;
    const today = getToday();
    updateState((prev) => {
      const logs = [...(prev.painLogs[phase] || [])];
      const filtered = logs.filter((l) => l.date !== today);
      filtered.push({ date: today, pain });
      const trimmed = filtered.slice(-14);
      return {
        ...prev,
        painLogs: { ...prev.painLogs, [phase]: trimmed },
      };
    });
    showToast(`Day logged — pain ${pain}/10`);
  };

  const handleSaveNotes = (phase: number, val: string) => {
    updateState((prev) => ({
      ...prev,
      notes: { ...prev.notes, [phase]: val },
    }));
    showToast("Notes saved");
  };

  const currentPhase = rehabState.currentPhase;

  const phaseContentProps = {
    state: rehabState,
    onToggleExit: handleToggleExit,
    onLogDay: handleLogDay,
    onSelectPain: handleSelectPain,
    onSaveNotes: handleSaveNotes,
  };

  const currentYear = new Date().getFullYear();

  return (
    <div style={{ background: "var(--rehab-bg)", minHeight: "100vh" }}>
      <main
        className="mx-auto px-4"
        style={{ maxWidth: 780, paddingBottom: 80 }}
      >
        {/* Header */}
        <header style={{ paddingTop: 52, paddingBottom: 32, marginBottom: 8 }}>
          <div
            className="text-sm font-medium mb-1.5"
            style={{ color: "var(--rehab-blue)", letterSpacing: "-0.1px" }}
          >
            L5–S1 Rehab · Lumbar Disc Herniation
          </div>
          <h1
            className="font-bold mb-1.5"
            style={{
              fontSize: "clamp(28px, 5vw, 38px)",
              lineHeight: 1.1,
              color: "var(--rehab-text)",
              letterSpacing: "-0.8px",
            }}
          >
            Recovery Protocol
          </h1>
          <p
            style={{
              color: "var(--rehab-muted)",
              fontSize: 15,
              fontWeight: 400,
            }}
          >
            Track your progress. Trust the process.
          </p>
        </header>

        {/* Phase Strip */}
        <div
          className="grid gap-2.5 mb-7"
          style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
        >
          {PHASES.map((phase) => {
            const isActive = currentPhase === phase.id;
            return (
              <button
                type="button"
                key={phase.id}
                className={`phase-pill ${phase.gradientClass} text-left rounded-2xl text-white border-none cursor-pointer transition-all`}
                style={{
                  padding: "16px 12px 14px",
                  opacity: isActive ? 1 : 0.45,
                  boxShadow: isActive ? "0 4px 16px rgba(0,0,0,0.18)" : "none",
                  transform: isActive ? "translateY(-1px)" : "none",
                  transition:
                    "transform 0.15s, box-shadow 0.15s, opacity 0.15s",
                  position: "relative",
                  overflow: "hidden",
                }}
                onClick={() => handleSwitchPhase(phase.id)}
                data-ocid={`phase.phase${phase.id}.button`}
              >
                <span
                  style={{ fontSize: 20, marginBottom: 6, display: "block" }}
                >
                  {phase.icon}
                </span>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    opacity: 0.75,
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  Phase 0{phase.id}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "-0.2px",
                    lineHeight: 1.2,
                  }}
                >
                  {phase.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Phase View */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
          >
            {/* Phase Hero */}
            {(() => {
              const phase = PHASES[currentPhase - 1];
              return (
                <div
                  className={`${phase.heroClass} rounded-3xl mb-4`}
                  style={{
                    padding: "24px 24px 22px",
                    color: "white",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Decorative circle */}
                  <div
                    style={{
                      position: "absolute",
                      right: -20,
                      top: -20,
                      width: 120,
                      height: 120,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.08)",
                    }}
                  />
                  <div className="flex justify-between items-start mb-3">
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        opacity: 0.8,
                      }}
                    >
                      Phase 0{phase.id}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        background: "rgba(255,255,255,0.2)",
                        padding: "4px 10px",
                        borderRadius: 20,
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      {phase.duration}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: "-0.4px",
                      marginBottom: 5,
                    }}
                  >
                    {phase.fullName}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.4 }}>
                    {phase.goal}
                  </div>
                </div>
              );
            })()}

            {/* Phase Tab Content */}
            {currentPhase === 1 && <Phase1Content {...phaseContentProps} />}
            {currentPhase === 2 && <Phase2Content {...phaseContentProps} />}
            {currentPhase === 3 && <Phase3Content {...phaseContentProps} />}
            {currentPhase === 4 && (
              <Phase4Content
                state={rehabState}
                onLogDay={handleLogDay}
                onSelectPain={handleSelectPain}
                onSaveNotes={handleSaveNotes}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Global Red Flag Card */}
        <div
          className="rounded-2xl p-4 mt-8 mb-6"
          style={{
            background: "#fff1f0",
            border: "1.5px solid #ffccc7",
          }}
        >
          <div
            className="text-xs font-bold uppercase tracking-wide mb-2.5 flex items-center gap-1.5"
            style={{ color: "var(--rehab-red)", letterSpacing: "0.04em" }}
          >
            🚨 Red flag reset rule — drop back one phase immediately if
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Leg pain returning",
              "Increasing tingling",
              "New numbness",
              "Sneezing pain returns",
            ].map((flag) => (
              <span
                key={flag}
                className="text-xs font-medium rounded-full px-3 py-1"
                style={{
                  color: "var(--rehab-red)",
                  background: "rgba(255,59,48,0.08)",
                }}
              >
                {flag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4">
          <p style={{ fontSize: 12, color: "var(--rehab-muted)" }}>
            © {currentYear}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                window.location.hostname,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--rehab-blue)", textDecoration: "none" }}
            >
              Built with ♥ using caffeine.ai
            </a>
          </p>
        </footer>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
            transition={{ duration: 0.22 }}
            data-ocid="app.toast"
            style={{
              position: "fixed",
              bottom: 30,
              left: "50%",
              background: "rgba(28,28,30,0.88)",
              backdropFilter: "blur(12px)",
              borderRadius: 20,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 500,
              color: "white",
              zIndex: 9999,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
