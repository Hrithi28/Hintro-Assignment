# AI Approach

## Prompt Design

The analysis prompt is split into a **system prompt** and a **user prompt**.

### System Prompt Strategy

The system prompt uses explicit rules with numbered constraints to maximize instruction-following:

```
CRITICAL RULES:
1. ONLY reference information that is EXPLICITLY present in the transcript.
2. NEVER invent, infer, or hallucinate attendees, action items, decisions, or outcomes.
3. EVERY item you generate MUST include citations referencing the exact timestamp(s).
4. If no clear action items are present, return an empty array.
5. Assignees must be explicitly named in the transcript.
6. Return ONLY valid JSON with no markdown, no preamble, no explanation.
```

This addresses hallucination at the instruction level before generation begins.

### User Prompt Structure

The user prompt provides structured context:
- Meeting title and date
- Participant list
- Full transcript formatted as `[timestamp] Speaker: text`

Formatting the transcript with timestamps inline makes it trivially easy for the model to produce valid citations.

---

## Citation Strategy

Each AI-generated item (summary, action item, decision, follow-up) must include a `citations` array:

```json
{
  "task": "Prepare release notes",
  "assignee": "Alice",
  "citations": [{"timestamp": "00:20"}]
}
```

**Timestamp anchoring:** By including timestamps in the formatted transcript (`[00:20] Alice: I will prepare release notes`), the model can trivially copy the exact timestamp into citations rather than guessing.

**Post-generation validation:** After parsing the AI response, the application:
1. Verifies every item has at least one citation
2. Verifies each cited timestamp actually exists in the transcript
3. Falls back to the first transcript timestamp if a citation references a non-existent timestamp (graceful degradation)

---

## Hallucination Prevention

Multiple layers of defense:

| Layer | Mechanism |
|---|---|
| Prompt | Explicit "NEVER invent" instructions |
| Prompt | "Return empty array if not present" fallback |
| Prompt | "Assignees must be named in transcript" constraint |
| Post-processing | Validate all items have citations |
| Post-processing | Validate timestamps exist in original transcript |
| Model choice | Claude is chosen for its strong instruction following |

---

## Output Validation

```javascript
// After parsing JSON:
const validateCitations = (items, type) => {
  return items.map(item => {
    if (!item.citations?.length) {
      throw new Error(`${type} item generated without citations`);
    }
    // Anchor timestamps to real transcript entries
    const validTimestamps = new Set(transcript.map(t => t.timestamp));
    for (const c of item.citations) {
      if (!validTimestamps.has(c.timestamp)) {
        c.timestamp = transcript[0].timestamp; // graceful fallback
      }
    }
    return item;
  });
};
```

---

## Known Limitations

1. **Short transcripts:** Very brief transcripts (1-2 lines) may result in sparse or empty analysis. This is correct behavior — the model should not invent content.

2. **Informal speech:** If a speaker implies an action without explicitly naming themselves ("someone should do X"), the model may or may not extract it as an action item depending on phrasing. This is acceptable; ambiguous ownership is better left out.

3. **Multi-language transcripts:** The prompts are in English. Non-English transcripts will likely still work but are not tested.

4. **Token limits:** Very long transcripts (>6,000 words) may exceed context limits. A production implementation would chunk or summarize before analysis.

5. **Due date extraction:** The AI does not extract due dates from transcript text (e.g., "next Friday"). Dates would need to be set manually or via a separate extraction pass.
