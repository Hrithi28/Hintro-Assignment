const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function analyzeMeeting(meeting) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const transcriptText = meeting.transcript
    .map(t => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
    .join('\n');

  const participants = meeting.participants.join(', ');

  const systemPrompt = `You are a meeting intelligence assistant. Your task is to analyze meeting transcripts and extract structured insights.

CRITICAL RULES:
1. ONLY reference information that is EXPLICITLY present in the transcript.
2. NEVER invent, infer, or hallucinate attendees, action items, decisions, or outcomes.
3. EVERY item you generate MUST include citations referencing the exact timestamp(s) from the transcript.
4. If no clear action items are present, return an empty array.
5. Assignees must be explicitly named in the transcript.
6. Return ONLY valid JSON with no markdown, no preamble, no explanation.

Return this exact JSON structure:
{
  "summary": [
    { "text": "...", "citations": [{"timestamp": "00:00"}] }
  ],
  "actionItems": [
    { "task": "...", "assignee": "...", "assigneeEmail": null, "dueDate": null, "citations": [{"timestamp": "00:00"}] }
  ],
  "decisions": [
    { "text": "...", "citations": [{"timestamp": "00:00"}] }
  ],
  "followUps": [
    { "text": "...", "citations": [{"timestamp": "00:00"}] }
  ]
}`;

  const userPrompt = `Meeting Title: ${meeting.title}
Meeting Date: ${meeting.meetingDate}
Participants: ${participants}

Transcript:
${transcriptText}

Analyze this meeting strictly based on the transcript above. Return JSON only.`;

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const content = response.data.choices[0].message.content;

  let parsed;
  try {
    const clean = content.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  } catch (e) {
    throw new Error('AI returned invalid JSON: ' + content.substring(0, 200));
  }

  // Ensure all required keys exist
  const required = ['summary', 'actionItems', 'decisions', 'followUps'];
  for (const key of required) {
    if (!Array.isArray(parsed[key])) parsed[key] = [];
  }

  // Validate citations are present and timestamps are real
  const transcriptTimestamps = new Set(meeting.transcript.map(t => t.timestamp));
  const validateCitations = (items, type) => {
    return items.map(item => {
      if (!item.citations || !Array.isArray(item.citations) || item.citations.length === 0) {
        throw new Error(`AI generated a ${type} item without required citations: "${item.text || item.task}"`);
      }
      for (const c of item.citations) {
        if (!transcriptTimestamps.has(c.timestamp)) {
          c.timestamp = meeting.transcript[0]?.timestamp || c.timestamp;
        }
      }
      return item;
    });
  };

  parsed.summary = validateCitations(parsed.summary, 'summary');
  parsed.actionItems = validateCitations(parsed.actionItems, 'actionItem');
  parsed.decisions = validateCitations(parsed.decisions, 'decision');
  parsed.followUps = validateCitations(parsed.followUps, 'followUp');

  return parsed;
}

module.exports = { analyzeMeeting };
