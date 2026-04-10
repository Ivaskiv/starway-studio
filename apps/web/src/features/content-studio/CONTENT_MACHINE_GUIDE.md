# Content Machine Guide

## Logic

Content Machine works as a dependent pipeline. Each step uses the output of the previous one, so the package stays coherent from the first prompt to the final publish flow.

1. **Контекст**
   - Define the product, audience, pain, platform, and AI insight.
   - This is the campaign frame for the whole package.

2. **Дія і шлях**
   - Generate the hook context here.
   - Choose the content formats here.
   - Set the action, where we lead the user, and how we lead them next.
   - This step connects the emotional entrance with the actual conversion path.

3. **Hook**
   - Lock the first-second entry angle: reframe, story, data, or curiosity.
   - Hook choice must follow the action context.

4. **Дослідження**
   - Review live research and validate the best-performing hook angles.
   - Use this to refine the chosen hook type before moving to formulas.

5. **Формула**
   - Pick the copy framework: PAS, AIDA, BAB, FAB, 4P, or STACK.
   - The formula should reflect the context, hook, and research-backed angle.

6. **API**
   - Configure OpenAI, ElevenLabs, and Telegram credentials.
   - Production should prefer saved labels and vault-backed values.

7. **Текст × 3**
   - Build three text variants from the selected formula and hook.
   - Each card can be edited, copied, regenerated, or approved.

8. **Банери × 3**
   - Generate six banner cards, one per formula.
   - Each card has its own prompt and image generation action via ChatGPT Images.

9. **Reels Engine**
   - Final pipeline view.
   - Shows the full flow, queue state, and publication readiness.

## Quick Steps

1. Fill in campaign context.
2. Generate hook context in the action step and set the conversion route.
3. Choose hook type.
4. Review research and lock the best hook angle.
5. Choose the copy formula.
6. Check API credentials.
7. Edit or regenerate the three text variants.
8. Generate six banner visuals.
9. Review the Reels pipeline and publish only when everything is ready.
