import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGroundedPunchlinePrompt } from '../src/lib/punchline-prompt';

test('commentator material is mandatory and prominent in every humor mode', () => {
  const bases = [
    'הומור ניטרלי',
    'סגנון הבית לחבורה אחרת',
    'פרשן הבית',
  ];

  for (const baseInstructions of bases) {
    const result = buildGroundedPunchlinePrompt({
      baseInstructions,
      facts: { scoreA: 3, scoreB: 1 },
      userContext: '  נדב דיבר לפני המשחק ואז החמיץ פנדל, תרד על נדב  ',
    });
    const payload = JSON.parse(result.prompt);

    assert.match(result.instructions, /בעל העדיפות הגבוהה ביותר/);
    assert.match(result.instructions, /חייב להתבסס/);
    assert.match(result.instructions, /צריך להיות יעד העקיצה/);
    assert.ok(result.instructions.startsWith(baseInstructions));
    assert.equal(payload.commentatorBrief.text, 'נדב דיבר לפני המשחק ואז החמיץ פנדל, תרד על נדב');
    assert.match(payload.commentatorBrief.requiredUsage, /חייב/);
  }
});

test('an empty brief does not add mandatory material or a prompt field', () => {
  const result = buildGroundedPunchlinePrompt({
    baseInstructions: 'פרשן הבית',
    facts: { scoreA: 1, scoreB: 0 },
    userContext: '   ',
  });
  const payload = JSON.parse(result.prompt);

  assert.equal(result.instructions, 'פרשן הבית');
  assert.equal(payload.commentatorBrief, undefined);
});
