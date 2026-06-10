# UI Design System

## Brief

A desktop POS and inventory management system for a single-branch hardware store in Kenya. The primary user is the business owner, working at a counter or desk on a Windows computer. The interface handles fast-paced sales transactions, stock management, supplier records, and end-of-day reporting.

The design must feel **capable and trustworthy, not playful**. This is a working tool, not a consumer app. Every pixel should reduce friction and increase confidence — the owner should feel like an operator, not a user.

---

## Design Philosophy

Hardware stores deal in physical, industrial things: iron, concrete, cut metal, raw pipe. The UI should carry a trace of that material world — weight, precision, legibility — without cosplaying a construction site.

The guiding tension: **professional density vs. scannable clarity**. A POS screen needs a lot of information visible at once. The solution is not to minimize content but to organize it with enough visual hierarchy that the eye always knows where to go.

**Single aesthetic risk:** A persistent left sidebar with large, icon-only navigation using a charcoal-on-off-white treatment — but the active route uses a full-width accent bar on the left edge, like a physical folder tab pulled forward. This gives the nav a tactile, material quality without being decorative.

---

## Token System

### Color Palette

```
--color-bg-base:       #F7F6F4   /* Warm off-white. Not pure white — reduces eye fatigue over long sessions */
--color-bg-surface:    #FFFFFF   /* Cards, modals, table rows */
--color-bg-sunken:     #EEECE8   /* Input backgrounds, disabled states, alternate table rows */
--color-bg-sidebar:    #1C1F24   /* Near-black sidebar — anchors the layout */

--color-accent:        #D97706   /* Amber. Warm, not tropical. Echoes oxidized iron, paint caps, warning labels */
--color-accent-hover:  #B45309   /* Darker amber for hover states */
--color-accent-subtle: #FEF3C7   /* For accent-tinted backgrounds (badges, highlights) */

--color-text-primary:  #111827   /* Near-black for headings and important data */
--color-text-secondary:#4B5563   /* Body text, labels, secondary data */
--color-text-muted:    #9CA3AF   /* Placeholders, disabled text, timestamps */
--color-text-inverse:  #F9FAFB   /* Text on dark backgrounds (sidebar) */

--color-border:        #E5E1DA   /* Warm-tinted borders — not cold gray */
--color-border-strong: #C9C4BB   /* Dividers, active input borders */

--color-success:       #16A34A   /* Paid status, stock sufficient */
--color-success-bg:    #DCFCE7
--color-warning:       #D97706   /* Partial payment, low stock */
--color-warning-bg:    #FEF3C7
--color-danger:        #DC2626   /* Unpaid, out of stock, destructive actions */
--color-danger-bg:     #FEE2E2
--color-info:          #2563EB
--color-info-bg:       #DBEAFE
```

**Why amber, not blue or green:** Blue is the default SaaS color — it would make this feel like any other dashboard. Green reads as financial/banking. Amber is the color of warning lights, construction equipment, and the warm edge of a welding flame. It's industrial without being aggressive, and it's genuinely unusual for business software.

---

### Typography

```
Display face:  "DM Serif Display" — used only for large numbers and page titles.
               Gives financial figures (KES 84,500) a sense of weight and authority.
               Import from Google Fonts.

Body face:     "Inter" — clean, highly legible at small sizes, excellent tabular numbers.
               The workhorse for all labels, tables, forms, and body copy.

Mono face:     "JetBrains Mono" — for M-Pesa receipt numbers, product IDs, stock counts.
               Makes machine-generated strings scannable and distinguishable from prose.
```

**Type Scale:**
```
--text-xs:    11px / 1.4  — timestamps, fine print
--text-sm:    13px / 1.5  — table cells, secondary labels
--text-base:  15px / 1.6  — body text, form labels
--text-lg:    18px / 1.5  — section headings, card titles
--text-xl:    24px / 1.3  — page headings
--text-2xl:   32px / 1.2  — stat figures (Daily Revenue, Stock Count)
--text-3xl:   48px / 1.1  — hero numbers on the dashboard

Font weights in use: 400 (body), 500 (labels, nav items), 600 (headings), 700 (stat figures)
```

---

### Spacing

8px base grid. All spacing values are multiples of 4.

```
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   20px
--space-6:   24px
--space-8:   32px
--space-10:  40px
--space-12:  48px
--space-16:  64px
```

---

### Border Radius

```
--radius-sm:   4px   /* Input fields, table cells */
--radius-md:   8px   /* Cards, modals, dropdowns */
--radius-lg:   12px  /* Larger cards, panels */
--radius-full: 9999px /* Badges, pill tags */
```

---

### Shadows

```
--shadow-sm:  0 1px 2px rgba(0,0,0,0.06)
--shadow-md:  0 4px 12px rgba(0,0,0,0.08)
--shadow-lg:  0 8px 24px rgba(0,0,0,0.12)
--shadow-modal: 0 20px 60px rgba(0,0,0,0.18)
```

---

## Layout System

### Application Shell

```
┌──────────────────────────────────────────────────────────┐
│ Sidebar (64px wide, collapsed)  │  Main Content Area      │
│                                  │                         │
│  ▐ [Logo mark]                  │  [Top Bar]              │
│                                  │  Page title + actions   │
│  ▐ [Dashboard icon]             │─────────────────────────│
│  ▐ [POS icon]        ◄active    │                         │
│  ▐ [Inventory icon]             │  [Page Content]         │
│  ▐ [Products icon]              │                         │
│  ▐ [Purchases icon]             │                         │
│  ▐ [Customers icon]             │                         │
│  ▐ [Suppliers icon]             │                         │
│  ▐ [Reports icon]               │                         │
│                                  │                         │
│  ─────────                      │                         │
│  ▐ [Settings icon]              │                         │
└──────────────────────────────────────────────────────────┘
```

The `▐` represents the active route indicator — a 3px amber left border that spans the full height of the nav item. When hovering a non-active item, a 1px version appears to hint the interaction.

The sidebar never expands to show labels. Labels appear as tooltips on hover. This keeps the content area wide — critical for the POS view and data tables.

---

### Top Bar (per page)

```
┌──────────────────────────────────────────────────────────┐
│  Point of Sale              [Wed 10 Jun]  [Notifications] │
└──────────────────────────────────────────────────────────┘
```

- Page title: `text-xl`, `font-semibold`, `color-text-primary`
- Right side: current date, notification bell (badge when unread), no user avatar (single user, no confusion)
- 64px height, `border-bottom: 1px solid var(--color-border)`
- Background: `--color-bg-surface`

---

## Page Designs

### Dashboard

The dashboard is a one-glance health check. The owner opens the app in the morning and in 5 seconds should know: how did yesterday go, what's low in stock, who owes money.

```
┌─────────────────────────────────────────────────────────────┐
│  Today's Overview                     [Export Report ↓]     │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Revenue     │  Cash        │  M-Pesa      │  Transactions  │
│  KES 84,500  │  KES 51,200  │  KES 33,300  │  47            │
│  ▲ vs yest.  │              │              │                │
├──────────────┴──────────────┴──────────────┴────────────────┤
│  Low Stock (6 items)                      [View all →]      │
│  ┌─────────────────┬──────────┬───────────────────────┐    │
│  │ Portland Cement │  8 bags  │ ████░░░░ threshold: 20│    │
│  │ Gauge 30 Wire   │  2 rolls │ █░░░░░░░ threshold: 5 │    │
│  └─────────────────┴──────────┴───────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Outstanding Balances                                        │
│  Customers owe  KES 23,400  │  You owe suppliers  KES 8,750 │
└─────────────────────────────────────────────────────────────┘
```

**Stat cards:**
- Large figures use `DM Serif Display`, `text-3xl`, `color-text-primary`
- Label above figure: `text-xs`, `font-medium`, `color-text-muted`, uppercase, letter-spacing: 0.08em
- Trend indicator: small colored arrow + percentage, `text-sm`
- Card: white background, `shadow-sm`, `radius-md`, `padding: space-6`

**Low stock progress bars:**
- Track: `--color-bg-sunken`, 8px height, `radius-full`
- Fill: amber (`--color-accent`) when below threshold, green when sufficient
- Bar fills left-to-right proportional to `current / threshold`. If over threshold it's green and full.

---

### Point of Sale (POS)

The most-used screen. Optimized for keyboard-driven, fast operation.

```
┌───────────────────────────────────┬─────────────────────────┐
│  PRODUCTS                         │  CURRENT SALE           │
│                                   │                         │
│  [🔍 Search products...      ]    │  Customer: [Walk-in  ▼] │
│                                   │                         │
│  ┌─────────┐ ┌─────────┐          │  Portland Cement × 3    │
│  │[img]    │ │[img]    │          │  Bag · KES 700    2,100 │
│  │Cement   │ │Wire     │          │                         │
│  │KES 700  │ │KES 55/m │          │  Gauge 30 Wire × 10     │
│  │Bag      │ │Meter    │          │  Meter · KES 55     550 │
│  └─────────┘ └─────────┘          │  ─────────────────────  │
│  ┌─────────┐ ┌─────────┐          │  Subtotal       2,650   │
│  │[img]    │ │[img]    │          │  Discount           -0  │
│  │Nails    │ │PVC Pipe │          │  ─────────────────────  │
│  │KES 120  │ │KES 380  │          │  TOTAL          2,650   │
│  │Kg       │ │Length   │          │                         │
│  └─────────┘ └─────────┘          │  [  Cash  ] [ M-Pesa ] │
│                                   │  [   Checkout →       ] │
└───────────────────────────────────┴─────────────────────────┘
```

**Left panel (product grid):**
- 2-column grid of product cards. Each card: white, `radius-md`, `shadow-sm`, 12px padding
- Product image: 56×56px, `radius-sm`, `object-fit: cover`
- Name: `text-sm`, `font-medium`. Price: `text-sm`, `color-accent`, `font-semibold`
- Unit label: `text-xs`, `color-text-muted`
- Hover: subtle `shadow-md` lift, `border: 1px solid var(--color-accent)`
- Clicking adds to cart with a brief scale animation (scale 0.96 → 1)

**Right panel (cart):**
- Sticky, fixed height, scrollable item list
- Each line item: product name + unit, quantity control (−/+), line total right-aligned
- Quantity uses `font-mono` (`JetBrains Mono`)
- Totals section: clean right-aligned column with `border-top`
- TOTAL: `text-xl`, `DM Serif Display`, amber color
- Checkout button: full-width, amber background, `color-text-inverse`, `font-semibold`, 48px height

**Payment modal (triggered by Checkout):**
```
┌────────────────────────────────┐
│  Payment                    ✕  │
│                                │
│  Total due:  KES 2,650         │
│                                │
│  [Cash] [M-Pesa] [Split]       │
│                                │
│  Cash amount:  [________]      │
│                                │
│        [Confirm Sale]          │
└────────────────────────────────┘
```
- Tab switcher: pill-style, `--color-bg-sunken` background, amber active tab
- For M-Pesa: phone number field + "Send STK Push" button → shows spinner → confirmation state
- For Split: two amount fields that must sum to total (real-time validation)

---

### Products / Catalog

Standard data management view. Prioritizes scannability.

```
┌─────────────────────────────────────────────────────────────┐
│  Products                              [+ Add Product]      │
├─────────────────────────────────────────────────────────────┤
│  [🔍 Search...]  [Category: All ▼]  [Status: Active ▼]     │
├───────┬──────────────────┬──────┬──────────┬───────────────┤
│ Image │ Name             │ Cat. │ Stock    │ Actions       │
├───────┼──────────────────┼──────┼──────────┼───────────────┤
│ [img] │ Portland Cement  │ Cem. │ 42 bags  │ [Edit][⋯]    │
│       │ KES 550 cost     │      │ ✓ Good   │               │
├───────┼──────────────────┼──────┼──────────┼───────────────┤
│ [img] │ Gauge 30 Wire    │ Elec.│ 2 rolls  │ [Edit][⋯]    │
│       │ KES 1,800 cost   │      │ ⚠ Low    │               │
└───────┴──────────────────┴──────┴──────────┴───────────────┘
```

**Table design:**
- Alternating row backgrounds: `--color-bg-surface` and `--color-bg-sunken`
- `border-bottom: 1px solid var(--color-border)` on each row
- Stock status badges: pill shape, colored background. Green = good, amber = low, red = out
- Text in badge: `text-xs`, `font-medium`
- Action column: "Edit" text button (amber), `⋯` opens dropdown (View history, Adjust stock, Deactivate)
- Hover state on row: `background: var(--color-bg-sunken)` transition 100ms

---

### Inventory / Stock Movements

```
┌─────────────────────────────────────────────────────────────┐
│  Stock History — Portland Cement              [+ Adjust]    │
├──────────┬───────────┬───────────┬────────────┬────────────┤
│ Date     │ Type      │ Change    │ Balance    │ Reference  │
├──────────┼───────────┼───────────┼────────────┼────────────┤
│ 10 Jun   │ SALE      │ −3 bags   │ 42 bags    │ Sale #1842 │
│ 09 Jun   │ PURCHASE  │ +50 bags  │ 45 bags    │ PO #0091   │
│ 08 Jun   │ DAMAGE    │ −2 bags   │ −5 bags    │ —          │
└──────────┴───────────┴───────────┴────────────┴────────────┘
```

**Movement type chips:**
- PURCHASE: blue bg (`--color-info-bg`), blue text
- SALE: dark text on `--color-bg-sunken`
- REFUND: green bg
- DAMAGE: red bg
- ADJUSTMENT: amber bg

**Change column:**
- Positive values: green, prefixed `+`
- Negative values: red, prefixed `−`
- Font: `JetBrains Mono`, `text-sm`

---

### Customers / Suppliers

```
┌─────────────────────────────────────────────────────────────┐
│  Customers                             [+ Add Customer]     │
├─────────────────────────────────────────────────────────────┤
│  [🔍 Search...]              [Owing balance only  ☐]       │
├──────────────────┬──────────┬────────────┬─────────────────┤
│ Name             │ Phone    │ Balance    │ Last Purchase   │
├──────────────────┼──────────┼────────────┼─────────────────┤
│ John Kamau       │ 0712 ... │ KES 4,200  │ 2 days ago      │
│                  │          │ ⚠ Owes     │                 │
├──────────────────┼──────────┼────────────┼─────────────────┤
│ Wanjiku Hardware │ 0722 ... │ KES 0      │ 1 week ago      │
│                  │          │ ✓ Clear    │                 │
└──────────────────┴──────────┴────────────┴─────────────────┘
```

Clicking a row opens a right-side **slide-over panel** (not a full page navigation) showing:
- Customer name + phone (editable inline)
- Balance with "Record Payment" button
- Statement table: date, description, debit, credit, running balance

---

### Reports

```
┌─────────────────────────────────────────────────────────────┐
│  Reports           [Daily] [Monthly] [Inventory] [Custom]   │
├─────────────────────────────────────────────────────────────┤
│  June 2025                                [Export PDF ↓]    │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │                Revenue vs Profit                  │      │
│  │  KES ▲                                            │      │
│  │  90k │         ██                                 │      │
│  │  60k │    ██   ██   ██                            │      │
│  │  30k │ ██ ██   ██   ██   ██                       │      │
│  │    0 └──────────────────────────── months         │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  Revenue:     KES 84,500    ┊  Cost of Goods:  KES 51,200  │
│  Gross Profit: KES 33,300   ┊  Damages:        KES  2,100  │
└─────────────────────────────────────────────────────────────┘
```

**Chart treatment (using Recharts):**
- Revenue bars: `--color-accent` (amber)
- Profit line overlay: `--color-text-primary` dashed line
- Grid lines: `--color-border`, subtle
- Axis labels: `text-xs`, `color-text-muted`, `Inter`
- Tooltip: white card with `shadow-md`, amber left border

**Summary stat row:**
- 4 stats in a row, separated by a 1px `--color-border` vertical divider (not cards)
- Labels: uppercase, `text-xs`, letter-spacing 0.08em, `color-text-muted`
- Values: `DM Serif Display`, `text-2xl`, `color-text-primary`

---

## Component Patterns

### Buttons

```
Primary:    amber bg (#D97706), white text, font-semibold, 40px height, radius-md
            hover: #B45309, transition 150ms

Secondary:  white bg, border: 1px solid --color-border, text-primary
            hover: --color-bg-sunken background

Danger:     red bg (#DC2626), white text
            Used for: Deactivate product, Delete (confirm required)

Ghost:      no bg, no border, accent-colored text
            Used for: table row actions, "View all →" links

Icon-only:  32px × 32px, radius-sm, ghost treatment
```

All buttons: `cursor-pointer`, `select-none`, `transition: background 150ms ease`

Disabled state: 40% opacity, `cursor-not-allowed`

### Form Inputs

```
Height:           40px
Background:       --color-bg-sunken
Border:           1px solid --color-border
Border (focus):   1px solid --color-accent, box-shadow: 0 0 0 3px var(--color-accent-subtle)
Radius:           --radius-sm (4px)
Font:             Inter, text-base
Color:            --color-text-primary
Placeholder:      --color-text-muted
```

Labels sit above inputs, `text-sm`, `font-medium`, `color-text-secondary`, `margin-bottom: space-2`.

Error state: border turns `--color-danger`, error message below in `text-sm`, `color-danger`.

### Badges / Status Pills

```
Paid / Success:   --color-success-bg bg, --color-success text
Partial / Warning: --color-warning-bg bg, --color-warning text
Unpaid / Danger:  --color-danger-bg bg, --color-danger text
Neutral:          --color-bg-sunken bg, --color-text-secondary text
```

All badges: `radius-full`, `padding: 2px 8px`, `text-xs`, `font-medium`, `white-space: nowrap`.

### Modals

- Backdrop: `rgba(0,0,0,0.4)`, backdrop-filter: blur(2px)
- Modal card: white, `radius-lg`, `shadow-modal`, max-width: 480px (standard), 640px (large)
- Header: title `text-lg font-semibold` + close `✕` button top-right
- Footer: right-aligned button group (Cancel ghost, Confirm primary)
- Animation: scale from 0.96 → 1 + fade in, 150ms ease-out

### Empty States

Every empty table or list has:
- A centered icon (48px, `color-text-muted`)
- A heading: `text-lg`, `font-semibold`, `color-text-secondary`
- A one-line description in `text-sm`, `color-text-muted`
- A CTA button (primary) when an action can resolve the emptiness

Example: Products page with no products:
> Icon: box outline
> Heading: "No products yet"
> Body: "Add your first product to start tracking inventory."
> Button: "+ Add Product"

### Loading States

- Tables: skeleton rows — 3 placeholder rows with pulsing `--color-bg-sunken` blocks
- Stat cards: shimmer effect on the number area
- Buttons during async actions: spinner replaces label, button disabled
- Never show a full-page spinner. Skeleton UI is always preferred.

### Toast Notifications

- Bottom-right, stacked (max 3 visible)
- 4px left border indicating type (green = success, red = error, amber = warning)
- Dismiss after 4 seconds (errors stay until dismissed)
- `text-sm`, max-width: 360px

---

## Responsive Behavior

The application is designed primarily for desktop (1280px+). On smaller screens:

- Sidebar collapses to a hamburger menu overlay at < 1024px
- POS splits to a stacked layout (cart below products) at < 900px
- Tables become horizontally scrollable at < 768px
- This is a desktop-first tool; mobile is not a primary use case but the layout should not break

---

## Accessibility Baseline

- All interactive elements have visible `focus` states (amber ring: `outline: 2px solid var(--color-accent); outline-offset: 2px`)
- Color is never the only signal — badges also have a text label
- All icons that carry meaning have an `aria-label`
- Table headers use `<th scope="col">` properly
- Modal traps focus while open and returns focus on close
- `prefers-reduced-motion` respected — all transitions disabled when set

---

## Tailwind Configuration

```javascript
// tailwind.config.ts
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#F7F6F4',
          surface: '#FFFFFF',
          sunken: '#EEECE8',
          sidebar: '#1C1F24',
        },
        accent: {
          DEFAULT: '#D97706',
          hover: '#B45309',
          subtle: '#FEF3C7',
        },
        border: {
          DEFAULT: '#E5E1DA',
          strong: '#C9C4BB',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        modal: '0 20px 60px rgba(0,0,0,0.18)',
      },
    },
  },
}
```

Google Fonts import (in `app/globals.css`):
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

---

## Page-by-Page Checklist

Before marking any page complete, verify:

- [ ] Empty state is designed and implemented
- [ ] Loading skeleton is implemented
- [ ] Error state (failed API call) shows a meaningful message with a retry action
- [ ] All monetary values are formatted with `formatCurrency()` (e.g., `KES 1,200` not `1200`)
- [ ] All dates use relative format where appropriate ("2 days ago") and absolute on hover
- [ ] Destructive actions (delete, deactivate) require a confirmation modal
- [ ] All form inputs show validation errors inline, not in an alert
- [ ] Keyboard navigation works through forms and tables
