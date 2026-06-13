// Model fallback chain — tries each in order if the previous is unavailable
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

function getApiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const PAYMENT_SYSTEM_PROMPT = `You are a financial fraud detection AI. Analyze the payment note and context below for signs of: smishing, social engineering, urgency manipulation, impersonation, prize/lottery scams, fake emergency requests, or unusual payment requests.

Respond ONLY in valid JSON with this exact shape:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "risk_score": <integer 0-100>,
  "fraud_type": "<short label or 'None'>",
  "explanation": "<2-3 sentence plain-language explanation>",
  "recommendation": "<1 sentence action for the user>"
}`;

const SCANNER_SYSTEM_PROMPT = `You are analyzing a suspicious message received by a user, not a payment they are making. Analyze for signs of: smishing, social engineering, urgency manipulation, impersonation, prize/lottery scams, fake emergency requests, phishing, OTP fraud, or unusual requests.

Respond ONLY in valid JSON with this exact shape:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "risk_score": <integer 0-100>,
  "fraud_type": "<short label or 'None'>",
  "explanation": "<2-3 sentence plain-language explanation>",
  "recommendation": "<1 sentence action for the user>",
  "red_flags": ["<flag1>", "<flag2>", "..."]
}`;

export async function analyzePayment(recipient, amount, note, apiKey) {
  const userMessage = `Payment Details:
- Recipient: ${recipient}
- Amount: ₹${amount}
- Payment Note: "${note}"

Analyze this payment for fraud risk.`;

  return callGeminiWithFallback(PAYMENT_SYSTEM_PROMPT, userMessage, apiKey);
}

export async function scanMessage(message, apiKey) {
  const userMessage = `Suspicious message received by user:
"${message}"

Analyze this message for fraud indicators and red flags.`;

  return callGeminiWithFallback(SCANNER_SYSTEM_PROMPT, userMessage, apiKey);
}

async function callGeminiWithFallback(systemPrompt, userMessage, apiKey) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    console.log(`Trying model: ${model}...`);
    const result = await callGemini(model, systemPrompt, userMessage, apiKey);

    if (result.success) {
      return result;
    }

    // If it's a retryable error (503/429), try the next model
    if (result.retryable) {
      console.log(`${model} unavailable, trying next model...`);
      lastError = result.error;
      continue;
    }

    // Non-retryable error (auth, bad request, etc.) — stop immediately
    return result;
  }

  return {
    success: false,
    error: lastError || "All models are currently unavailable. Please try again in a minute.",
  };
}

async function callGemini(model, systemPrompt, userMessage, apiKey, retries = 1) {
  try {
    const response = await fetch(`${getApiUrl(model)}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
          responseMimeType: "application/json",
        },
      }),
    });

    // Auto-retry on 429/503 with backoff
    if ((response.status === 429 || response.status === 503) && retries > 0) {
      const waitMs = response.status === 429 ? 12000 : 5000;
      console.log(`Got ${response.status} from ${model}, retrying in ${waitMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, waitMs));
      return callGemini(model, systemPrompt, userMessage, apiKey, retries - 1);
    }

    // Retryable failure — signal to try next model
    if (response.status === 429 || response.status === 503) {
      const errBody = await response.text();
      return {
        success: false,
        retryable: true,
        error: `${model} is currently unavailable (${response.status}). ${
          response.status === 503
            ? "High demand — please try again shortly."
            : "Rate limit exceeded."
        }`,
      };
    }

    if (!response.ok) {
      const errBody = await response.text();
      return {
        success: false,
        retryable: false,
        error: `API error ${response.status}: ${errBody}`,
      };
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const parsed = robustParseJson(text);
    console.log(`✅ Success with model: ${model}`);
    return { success: true, data: parsed };
  } catch (error) {
    console.error(`Gemini API error (${model}):`, error);
    return {
      success: false,
      retryable: false,
      error: error.message || "Failed to analyze. Please try again.",
    };
  }
}

function robustParseJson(rawText) {
  let cleanStr = rawText.trim();
  
  // Remove markdown code fences
  if (cleanStr.startsWith("```json")) {
    cleanStr = cleanStr.slice(7);
  } else if (cleanStr.startsWith("```")) {
    cleanStr = cleanStr.slice(3);
  }
  if (cleanStr.endsWith("```")) {
    cleanStr = cleanStr.slice(0, -3);
  }
  cleanStr = cleanStr.trim();

  // Escape unescaped control characters inside JSON strings
  let processed = "";
  let inString = false;
  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    // Check for unescaped double quotes to toggle inString
    if (char === '"' && cleanStr[i - 1] !== '\\') {
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

  return JSON.parse(processed);
}
