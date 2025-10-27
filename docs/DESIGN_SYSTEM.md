# Design System

## Color Palette

### Primary Colors
- **Purple 600**: `#9333ea` - Primary actions, CTAs
- **Purple 700**: `#7c3aed` - Hover states
- **Purple 900**: `#581c87` - Dark backgrounds
- **Pink 400**: `#f472b6` - Gradients, accents

### Semantic Colors
- **Green 600**: `#10b981` - Success, earnings
- **Red 600**: `#dc2626` - Errors, destructive
- **Yellow 600**: `#eab308` - Warnings, highlights
- **Blue 600**: `#2563eb` - Information, links

### Neutral Colors
- **Background**: `#0F0F0F` - App background
- **Gray 900**: `#1A1A1A` - Card backgrounds
- **Gray 800**: `#2A2A2A` - Secondary backgrounds
- **Gray 700**: `#3A3A3A` - Borders
- **Gray 400**: `#9CA3AF` - Secondary text
- **White**: `#FFFFFF` - Primary text

## Typography

### Font Family
- **Primary**: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
- **Monospace**: Consolas, Monaco, Courier New (for codes)

### Font Scale
```css
h1: 3xl (1.875rem) - Page titles
h2: 2xl (1.5rem) - Section headings
h3: xl (1.25rem) - Card titles
h4: lg (1.125rem) - Subsection headings
body: base (1rem) - Body text
small: sm (0.875rem) - Helper text
tiny: xs (0.75rem) - Labels, badges
```

### Font Weights
- **Regular**: 400 - Body text
- **Medium**: 500 - Emphasis
- **Semibold**: 600 - Subheadings
- **Bold**: 700 - Headings, CTAs

### Line Heights
- **Tight**: 1.25 - Headings
- **Normal**: 1.5 - Body text
- **Relaxed**: 1.75 - Reading content

## Spacing System

Based on 4px grid:

```
1  = 4px   (0.25rem)
2  = 8px   (0.5rem)
3  = 12px  (0.75rem)
4  = 16px  (1rem)
6  = 24px  (1.5rem)
8  = 32px  (2rem)
12 = 48px  (3rem)
16 = 64px  (4rem)
20 = 80px  (5rem)
```

### Component Spacing
- **Card padding**: p-6 (24px)
- **Section spacing**: py-12 or py-20
- **Button padding**: px-4 py-2 (16px × 8px)
- **Input padding**: px-4 py-3 (16px × 12px)
- **Gap between cards**: gap-6 (24px)

## Components

### Buttons

**Primary Button**
```tsx
<Button className="bg-purple-600 hover:bg-purple-700 text-white">
  Label
</Button>
```

**Secondary Button**
```tsx
<Button variant="outline" className="border-gray-700 hover:bg-gray-800">
  Label
</Button>
```

**Ghost Button**
```tsx
<Button variant="ghost" className="hover:bg-white/5">
  Label
</Button>
```

### Cards

**Standard Card**
```tsx
<Card className="bg-gray-900 border-gray-700 p-6">
  Content
</Card>
```

**Hover Card**
```tsx
<Card className="bg-gray-900 border-gray-700 p-6 hover:border-purple-600 transition-all">
  Content
</Card>
```

### Badges

```tsx
<Badge className="bg-purple-600 text-white">Label</Badge>
<Badge className="bg-green-600 text-white">Success</Badge>
<Badge className="bg-yellow-600 text-black">Warning</Badge>
```

## Animations

### Transitions
- **Fast**: 150ms - Micro-interactions
- **Normal**: 200ms - Button hovers
- **Slow**: 300ms - Page transitions

### Animation Classes
```css
animate-fade-in      /* Fade in: 200ms */
animate-slide-up     /* Slide up: 300ms */
animate-pulse        /* Pulse: 2s infinite */
animate-spin         /* Spin: 1s infinite */
```

### Easing Functions
- **ease-out**: Default for most transitions
- **ease-in-out**: For smooth back-and-forth
- **linear**: For continuous animations (spin, progress)

## Layout

### Breakpoints
```
sm: 640px   - Mobile landscape
md: 768px   - Tablet
lg: 1024px  - Desktop
xl: 1280px  - Large desktop
2xl: 1536px - Extra large
```

### Container
- **Max width**: 1400px (2xl)
- **Padding**: 2rem (32px) on sides
- **Centered**: mx-auto

### Grid System
```tsx
// 3 column grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  ...
</div>

// Responsive cards
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  ...
</div>
```

## Best Practices

### Accessibility
- [ ] Minimum contrast ratio: 4.5:1
- [ ] Touch targets: Minimum 44×44px
- [ ] Focus indicators visible
- [ ] Semantic HTML elements
- [ ] ARIA labels where needed

### Performance
- [ ] Use Tailwind utilities (no custom CSS when possible)
- [ ] Avoid inline styles
- [ ] Lazy load images
- [ ] Minimize animation on mobile
- [ ] Use CSS transforms for animations

### Consistency
- [ ] Use spacing system (no arbitrary values)
- [ ] Follow color palette
- [ ] Consistent border radius (lg, md, sm)
- [ ] Standard shadow depths
- [ ] Uniform button sizing

## Dark Theme

All components are designed for dark mode by default:
- Background: `#0F0F0F`
- Cards: `#1A1A1A`
- Borders: `#2A2A2A` - `#3A3A3A`
- Text: White with varying opacity

## Icons

Using **Lucide React** icons:
- Size: w-4 h-4 (16px) or w-5 h-5 (20px)
- Color: Inherits from text color
- Stroke width: 2 (default)

Common icons:
- `Users` - Community/members
- `DollarSign` - Earnings
- `TrendingUp` - Growth
- `Link2` - Referral links
- `Trophy` - Leaderboard
- `Sparkles` - Rewards
- `Check` - Success
- `X` - Close/error

## Implementation Checklist

- [x] Color system defined
- [x] Typography scale configured
- [x] Spacing system established
- [x] Component library created
- [x] Animation library added
- [x] Responsive breakpoints set
- [x] Accessibility guidelines defined
- [x] Performance best practices documented

## Resources

- Tailwind Docs: https://tailwindcss.com
- Lucide Icons: https://lucide.dev
- shadcn/ui: https://ui.shadcn.com
- Color Contrast Checker: https://webaim.org/resources/contrastchecker/
