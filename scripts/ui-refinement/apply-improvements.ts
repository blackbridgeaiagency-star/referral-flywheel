import * as fs from 'fs';
import * as path from 'path';

interface Improvement {
  description: string;
  filesAffected: string[];
  implementation: string;
}

export async function orchestrateUIImprovement(
  improvements: string[],
  iteration: number
): Promise<void> {
  console.log(`\n🎭 Orchestrating improvements (Iteration ${iteration})...`);
  console.log(`   Using Conductor pattern for token efficiency`);

  // Create improvement prompt for Conductor
  const improvementList = improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n');

  const conductorPrompt = `
# UI IMPROVEMENT TASK (Iteration ${iteration})

@.claude/agents/conductor.md
@.claude/agents/designer.md
@.claude/agents/builder.md

**Task**: Apply these UI improvements to the member dashboard:

${improvementList}

**Files to modify**:
- @app/customer/[experienceId]/page.tsx
- @components/dashboard/ (if component changes needed)

**Instructions**:
1. Use Conductor to decide: Do we need designer only, or designer + builder?
2. Load MINIMAL context (target: < 5K tokens per agent)
3. Apply improvements using exact Tailwind classes specified
4. Ensure dark theme consistency (#0F0F0F background, #8B5CF6 purple accents)
5. Test changes don't break mobile responsiveness

**Expected outcome**: Improvements applied, dashboard looks more premium

Execute with token-efficient orchestration.
`;

  // Write prompt to file for manual execution
  const promptPath = path.join('./scripts/ui-refinement', `iteration-${iteration}-prompt.md`);
  fs.writeFileSync(promptPath, conductorPrompt);

  console.log(`✅ Orchestration prompt created: ${promptPath}`);
  console.log(`⏸️  PAUSE: Manual execution required`);
  console.log(`   Run this in Claude Code or Claude.ai:`);
  console.log(`   1. Copy contents of ${promptPath}`);
  console.log(`   2. Execute with Conductor agent`);
  console.log(`   3. Verify changes applied`);
  console.log(`   4. Press Enter to continue automation...`);

  // Wait for user confirmation
  await waitForUserInput();

  console.log(`✅ Improvements applied (Iteration ${iteration})`);
}

async function waitForUserInput(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

export function logTokenUsage(iteration: number, tokensUsed: number) {
  const logPath = './scripts/ui-refinement/token-usage.log';
  const logEntry = `Iteration ${iteration}: ${tokensUsed} tokens\n`;
  fs.appendFileSync(logPath, logEntry);
  console.log(`📊 Token usage logged: ${tokensUsed} tokens`);
}
