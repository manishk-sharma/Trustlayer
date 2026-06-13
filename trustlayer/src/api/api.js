export async function analyzePayment(recipient, amount, note, apiKey) {
  if (!apiKey) {
    throw new Error("⚙️ Please add your Gemini API key in Settings first.");
  }

  const systemInstructions = `You are a financial fraud detection AI for Indian users.
Analyze the payment note and context for signs of:
smishing, social engineering, urgency manipulation, impersonation,
prize/lottery scams, fake emergency requests, fake refunds, or OTP theft.

Respond ONLY in this exact JSON format with no extra text:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "risk_score": <integer 0-100>,
  "fraud_type": "<short label or None>",
  "explanation": "<2-3 sentence plain English explanation>",
  "recommendation": "<1 sentence action for the user>",
  "hinglish_warning": "<2 sentence Hinglish warning, only if HIGH risk, else empty string>"
}`;

  const fullPrompt = `
${systemInstructions}

---

Transaction Details:
Recipient: ${recipient}
Amount: ₹${amount}
Payment Note: "${note}"

Respond ONLY in valid JSON. No markdown, no backticks, no explanation.
`;

  return callGemini(fullPrompt, apiKey);
}

export async function scanMessage(message, apiKey) {
  if (!apiKey) {
    throw new Error("⚙️ Please add your Gemini API key in Settings first.");
  }

  const systemInstructions = `You are a financial fraud detection AI for Indian users.
Analyze the payment note and context for signs of:
smishing, social engineering, urgency manipulation, impersonation,
prize/lottery scams, fake emergency requests, fake refunds, or OTP theft.

Respond ONLY in this exact JSON format with no extra text:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "risk_score": <integer 0-100>,
  "fraud_type": "<short label or None>",
  "explanation": "<2-3 sentence plain English explanation>",
  "recommendation": "<1 sentence action for the user>",
  "hinglish_warning": "<2 sentence Hinglish warning, only if HIGH risk, else empty string>"
}`;

  const fullPrompt = `
${systemInstructions}

---

Transaction Details:
Message: "${message}"

Respond ONLY in valid JSON. No markdown, no backticks, no explanation.
`;

  return callGemini(fullPrompt, apiKey);
}

export async function fetchScamAlerts(apiKey) {
  if (!apiKey) {
    throw new Error("⚙️ Please add your Gemini API key in Settings first.");
  }

  const alertsPrompt = `Search for the latest active scam alerts, RBI warnings, or 
cybercrime advisories targeting Indian users in the past 7 days.

Respond ONLY in this exact JSON format with no markdown or backticks:
{
  "last_updated": "<today's date>",
  "alerts": [
    {
      "title": "<short scam name>",
      "category": "UPI" | "SMS" | "Job" | "Lottery" | "Banking" | "Investment",
      "severity": "HIGH" | "MEDIUM",
      "summary": "<2 sentence plain English summary>",
      "tip": "<1 sentence protection tip>"
    }
  ]
}
Return 4-6 alerts. No extra text. No markdown.`;

  return callGeminiSearch(alertsPrompt, apiKey);
}

async function callGemini(fullPrompt, apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: fullPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000
          }
        })
      }
    );

    if (response.status === 400) {
      throw new Error("Invalid request — check your prompt format");
    }
    if (response.status === 403) {
      throw new Error("Invalid API key — update in Settings ⚙️");
    }
    if (response.status === 429) {
      throw new Error("Rate limit hit — wait a moment and retry");
    }
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error("Empty response from Gemini. Please try again.");
    }
    const text = data.candidates[0].content.parts[0].text;
    
    return parseAndCleanJson(text);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function callGeminiSearch(alertsPrompt, apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: alertsPrompt }]
            }
          ],
          tools: [
            { google_search: {} }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1500
          }
        })
      }
    );

    if (response.status === 400) {
      throw new Error("Invalid request — check your prompt format");
    }
    if (response.status === 403) {
      throw new Error("Invalid API key — update in Settings ⚙️");
    }
    if (response.status === 429) {
      throw new Error("Rate limit hit — wait a moment and retry");
    }
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error("Empty response from Gemini. Please try again.");
    }
    const text = data.candidates[0].content.parts[0].text;
    
    return parseAndCleanJson(text);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function parseAndCleanJson(rawText) {
  let clean = rawText.replace(/```json|```/g, "").trim();
  
  // Escape unescaped control characters inside JSON strings
  let processed = "";
  let inString = false;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '"' && clean[i - 1] !== '\\') {
      inString = !inString;
    }
    
    if (inString) {
      if (char === '\n') {
        processed += '\\n';
      } else if (char === '\r') {
        processed += '\\r';
      } else if (char === '\t') {
        processed += '\\t';
      } else {
        processed += char;
      }
    } else {
      processed += char;
    }
  }

  // Remove trailing commas in objects and arrays
  processed = processed.replace(/,\s*([\]}])/g, '$1');

  try {
    const parsed = JSON.parse(processed);
    return { success: true, data: parsed };
  } catch (e) {
    throw new Error(`JSON parse fail. Raw response: ${rawText}`);
  }
}
