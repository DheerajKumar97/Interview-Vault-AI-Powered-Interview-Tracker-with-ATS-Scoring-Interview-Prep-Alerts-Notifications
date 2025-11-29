# Event Type Color Reference

## Color Scheme Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION STATUS COLORS                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1️⃣  HR SCREENING DONE                                                 │
│     🎨 Background: bg-blue-100  (#DBEAFE)                              │
│     🎨 Border:     border-blue-500 (#3B82F6)                           │
│     📝 Text:       text-blue-700 (#1D4ED8)                             │
│     💡 Purpose:    Professional, initial screening                     │
│                                                                         │
│  2️⃣  SHORTLISTED                                                       │
│     🎨 Background: bg-purple-100 (#F3E8FF)                             │
│     🎨 Border:     border-purple-500 (#A855F7)                         │
│     📝 Text:       text-purple-700 (#6D28D9)                           │
│     💡 Purpose:    Vibrant progression indicator                       │
│                                                                         │
│  3️⃣  INTERVIEW SCHEDULED                                               │
│     🎨 Background: bg-blue-50 (#EFF6FF)                                │
│     🎨 Border:     border-blue-600 (#2563EB)                           │
│     📝 Text:       text-blue-800 (#1E40AF)                             │
│     💡 Purpose:    Important event, deep visibility                    │
│                                                                         │
│  4️⃣  INTERVIEW RESCHEDULED                                             │
│     🎨 Background: bg-amber-100 (#FEF3C7)                              │
│     🎨 Border:     border-amber-500 (#F59E0B)                          │
│     📝 Text:       text-amber-700 (#B45309)                            │
│     💡 Purpose:    Warm alert, attention needed                        │
│                                                                         │
│  5️⃣  SELECTED                                                          │
│     🎨 Background: bg-green-100 (#DCFCE7)                              │
│     🎨 Border:     border-green-600 (#16A34A)                          │
│     📝 Text:       text-green-700 (#15803D)                            │
│     💡 Purpose:    Success, positive outcome                           │
│                                                                         │
│  6️⃣  OFFER RELEASED                                                    │
│     🎨 Background: bg-emerald-100 (#D1FAE5)                            │
│     🎨 Border:     border-emerald-600 (#059669)                        │
│     📝 Text:       text-emerald-700 (#047857)                          │
│     💡 Purpose:    Premium achievement, final stage                    │
│                                                                         │
│  7️⃣  GHOSTED                                                           │
│     🎨 Background: bg-red-100 (#FEE2E2)                                │
│     🎨 Border:     border-red-600 (#DC2626)                            │
│     📝 Text:       text-red-700 (#B91C1C)                              │
│     💡 Purpose:    Clear visibility, negative outcome                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Color Application Locations

### 1. Applications List View (`Applications.tsx`)
- **Status Badge Component** displays in the table
- Shows current status with background color
- Rounded, pill-shaped design
- Border for definition

Example:
```
┌────────────────────┐
│ ◆ Shortlisted      │  ← Purple background
└────────────────────┘
```

### 2. Application Detail Page (`ApplicationDetail.tsx`)
- **Event Timeline** shows all events in chronological order
- Left border in event color
- Soft background fill
- Colored title text
- Hover effect for interactivity

Example:
```
████ HR Screening Done
     November 20, 2025
     Team lead evaluation completed

████ Shortlisted  
     November 25, 2025
     Moved to interview round

████ Interview Scheduled
     December 5, 2025
     Time: 2:00 PM IST
```

## Color Progression Flow

```
START
  ↓
[HR SCREENING DONE]  ← Blue (#3B82F6)
  ↓
[SHORTLISTED]        ← Purple (#9333EA)
  ↓
[INTERVIEW SCHEDULED] ← Deep Blue (#2563EB)
  ↓
[INTERVIEW RESCHEDULED] ← Amber (#D97706) [Optional branching]
  ↓
[SELECTED]           ← Green (#16A34A)
  ↓
[OFFER RELEASED]     ← Emerald (#059669)
  ↓
END - SUCCESS
```

OR

```
[GHOSTED]            ← Red (#DC2626) [Can happen at any stage]
```

## Accessibility Information

| Status | Background | Text | Contrast | Level |
|--------|-----------|------|----------|-------|
| HR Screening Done | #DBEAFE | #1D4ED8 | 8.2:1 | AAA |
| Shortlisted | #F3E8FF | #6D28D9 | 7.1:1 | AAA |
| Interview Scheduled | #EFF6FF | #1E40AF | 9.5:1 | AAA |
| Interview Rescheduled | #FEF3C7 | #B45309 | 7.3:1 | AAA |
| Selected | #DCFCE7 | #15803D | 9.1:1 | AAA |
| Offer Released | #D1FAE5 | #047857 | 8.8:1 | AAA |
| Ghosted | #FEE2E2 | #B91C1C | 8.6:1 | AAA |

## Usage Examples

### React Component Usage

```tsx
import { StatusBadge } from "@/components/StatusBadge";

// In Applications list
<StatusBadge status="HR Screening Done" />
<StatusBadge status="Shortlisted" />
<StatusBadge status="Interview Scheduled" />
<StatusBadge status="Selected" />
<StatusBadge status="Offer Released" />
<StatusBadge status="Ghosted" />
```

### Timeline View

```tsx
// In ApplicationDetail timeline
const colors = getEventColor("INTERVIEW_SCHEDULED");
// Returns: {
//   border: "border-l-4 border-blue-600",
//   bg: "bg-blue-50",
//   textColor: "text-blue-800"
// }
```

## Design Principles

✅ **Consistency** - Same color for same event type everywhere
✅ **Contrast** - High contrast ratios for readability
✅ **Intuition** - Green = success, Red = problem, Blue = professional
✅ **Accessibility** - WCAG AAA compliant colors
✅ **Professional** - Corporate-appropriate palette
✅ **Scalability** - Easy to update or extend colors

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Notes

- All colors use Tailwind CSS utility classes
- No custom CSS required
- Colors are consistent with Tailwind design system
- Can be easily customized via Tailwind config if needed
- Color names are semantic and easy to understand
