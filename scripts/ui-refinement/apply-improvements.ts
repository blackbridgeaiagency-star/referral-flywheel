import * as fs from 'fs';
import * as path from 'path';
import logger from '../../lib/logger';


interface Improvement {
  description: string;
  filesAffected: string[];
  implementation: string;
}

export async function orchestrateUIImprovement(
  improvements: string[],
  iteration: number
): Promise<void> {
  logger.debug(`\n🎭 Orchestrating improvements (Iteration ${iteration})...`);
  logger.debug(`   Using Conductor pattern for token efficiency`);

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

  logger.info('Orchestration prompt created: ${promptPath}');
  logger.debug(`⏸️  PAUSE: Manual execution required`);
  logger.debug(`   Run this in Claude Code or Claude.ai:`);
  logger.debug(`   1. Copy contents of ${promptPath}`);
  logger.debug(`   2. Execute with Conductor agent`);
  logger.debug(`   3. Verify changes applied`);
  logger.debug(`   4. Press Enter to continue automation...`);

  // Wait for user confirmation
  await waitForUserInput();

  logger.info('Improvements applied (Iteration ${iteration})');
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
  logger.info(' Token usage logged: ${tokensUsed} tokens');
}
