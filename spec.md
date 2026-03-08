# L5-S1 Rehab Protocol

## Current State
New project — no existing code.

## Requested Changes (Diff)

### Add
- Full L5–S1 lumbar disc herniation rehabilitation tracking app converted from a provided HTML prototype into a Caffeine full-stack app
- 4-phase rehab protocol: Acute (1–3 wks), Stabilize (3–6 wks), Movement Reintro (6–12 wks), Athletic Return (ongoing)
- Phase selector strip with 4 colored phase cards (red, orange, blue, green gradients)
- Per-phase hero banner with phase name, duration badge, and goal text
- Per-phase tabbed interface with tabs: Exercises, Exit Criteria, Daily Log (Phase 4 has Progression + Daily Log)
- Exercises tab: checklist of allowed exercises (togglable done state) and list of movements to avoid
- Exit criteria tab: checklist of criteria with progress bar showing X/4 met
- Daily Log tab: 0–10 pain scale selector, "Log Day" button, 14-day bar chart of pain trend, notes textarea with save
- Global red-flag card (always visible): "Drop back one phase if..." with pill tags for warning signs
- Toast notifications for log/save actions
- Persistent state stored in backend (pain logs per phase, exit criteria per phase, notes per phase, selected pain per phase, current phase)
- iOS-style segmented control tabs, card-based layout, clean minimalist design matching the provided HTML prototype

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan
1. Backend: store per-user rehab state — currentPhase, painLogs (phase → [{date, pain}]), exitCriteria (phase → [bool]), notes (phase → text), selectedPain (phase → int). Expose CRUD endpoints for all state fields.
2. Frontend: faithfully recreate the HTML prototype as a React app with:
   - Phase strip component
   - Per-phase view with hero banner and tab switcher
   - ExerciseList, AvoidList, ExitCriteria, DailyLog components
   - PainScaleSelector (0–10 buttons)
   - PainTrendChart (14-day bar chart)
   - Notes textarea
   - Global RedFlagCard
   - Toast feedback
   - All state persisted to backend
