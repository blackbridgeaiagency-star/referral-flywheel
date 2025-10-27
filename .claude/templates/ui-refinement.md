# Template: Automated UI Refinement

Use this template to iteratively refine any UI component.

---

## Prerequisites

- [ ] Target URL or component identified
- [ ] Playwright installed
- [ ] Claude API key set in .env.local
- [ ] Dev server running
- [ ] Conductor agent orchestration understood

---

## Configuration

Edit `scripts/ui-refinement/refine-ui.ts`:
```typescript
// Update target URL
const TARGET_URL = '/your/page/here';

// Update max iterations (3-5 recommended)
const MAX_ITERATIONS = 5;

// Update focus areas
const FOCUS_AREAS = [
  'Visual hierarchy',
  'Color usage',
  'Typography',
  'Spacing',
  'Micro-interactions'
];
```

---

## Execution

```bash
# 1. Start dev server
npm run dev

# 2. Run refinement
npm run refine-ui

# 3. During each iteration:
#    - Review Claude's suggestions
#    - Execute orchestration prompt via Conductor
#    - Press Enter to continue
```

---

## Expected Results

- **Iterations**: 3-5 cycles
- **Time**: 1-2 hours
- **Token usage**: 10-15K (via Conductor)
- **Savings**: 70-80% vs traditional approach
- **Output**: Before/after report with all improvements

---

## Token Efficiency Tips

1. ✅ Use Conductor for all implementations
2. ✅ Let designer agent handle simple CSS changes
3. ✅ Only involve builder if logic changes needed
4. ✅ Reuse outputs between iterations
5. ✅ Load minimal context per agent

---

## Success Criteria

- [ ] UI looks noticeably more premium
- [ ] All improvements documented
- [ ] Mobile responsive maintained
- [ ] No functionality broken
- [ ] Token usage < 20K
- [ ] Report generated
