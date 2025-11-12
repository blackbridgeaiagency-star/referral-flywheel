import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import logger from '../../lib/logger';


const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface UIAnalysis {
  improvements: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

export async function analyzeUIScreenshot(
  screenshotPath: string,
  iteration: number,
  previousImprovements: string[]
): Promise<UIAnalysis> {
  // Convert screenshot to base64
  const imageBuffer = fs.readFileSync(screenshotPath);
  const base64Image = imageBuffer.toString('base64');

  const previousContext = previousImprovements.length > 0
    ? `\n\nPrevious improvements applied:\n${previousImprovements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}`
    : '';

  const prompt = `You are a senior UI/UX designer analyzing a SaaS dashboard for a referral rewards platform.

This is iteration ${iteration} of UI refinement.${previousContext}

Analyze this screenshot and provide 2-3 SPECIFIC, ACTIONABLE improvements that will make this dashboard look more premium and professional.

Focus on:
1. Visual hierarchy and spacing
2. Color usage and gradients
3. Typography and readability
4. Micro-interactions and polish
5. Professional SaaS aesthetics

Requirements:
- Each improvement must be implementable in Tailwind CSS
- Be specific (exact class names, pixel values, colors)
- Prioritize high-impact, low-effort changes
- Don't repeat previous improvements
- Make it look like a $10k/month SaaS product

Format your response as JSON:
{
  "improvements": [
    "Specific improvement 1 with exact Tailwind classes",
    "Specific improvement 2 with exact Tailwind classes",
    "Specific improvement 3 with exact Tailwind classes"
  ],
  "priority": "high" | "medium" | "low",
  "estimatedImpact": "Brief description of expected visual impact"
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  // Parse JSON response
  const responseText = message.content[0].type === 'text'
    ? message.content[0].text
    : '';

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                    responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Failed to parse Claude API response');
  }

  const analysis: UIAnalysis = JSON.parse(jsonMatch[0].replace(/```json\n?|\n?```/g, ''));

  logger.debug(`🤖 Claude API analysis complete (iteration ${iteration})`);
  logger.debug(`   Priority: ${analysis.priority}`);
  logger.debug(`   Impact: ${analysis.estimatedImpact}`);
  logger.debug(`   Improvements: ${analysis.improvements.length}`);

  return analysis;
}
