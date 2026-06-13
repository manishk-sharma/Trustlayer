export async function analyzePayment(recipient, amount, note, apiKey, lang = "en") {
  const isDemo = localStorage.getItem("trustlayer_demo_mode") === "true";
  if (!apiKey && !isDemo) {
    throw new Error("⚙️ Please add your OpenRouter API key in Settings first.");
  }

  if (isDemo) {
    return simulateAnalyzePayment(recipient, amount, note);
  }

  const langInstruction = lang === "hi"
    ? `\nIMPORTANT: Write the "explanation", "recommendation", and "hinglish_warning" fields in simple Hindi (Devanagari script). Keep JSON keys in English.`
    : ``;

  const systemInstructions = `You are a financial fraud detection AI for Indian users.
Analyze the payment note and context for signs of:
smishing, social engineering, urgency manipulation, impersonation,
prize/lottery scams, fake emergency requests, fake refunds, or OTP theft.

Respond ONLY in this exact JSON format with no extra text:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "risk_score": <integer 0-100>,
  "fraud_type": "<short label or None>",
  "explanation": "<2-3 sentence explanation>",
  "recommendation": "<1 sentence action for the user>",
  "hinglish_warning": "<2 sentence warning, only if HIGH risk, else empty string>"
}${langInstruction}`;

  const fullPrompt = `
${systemInstructions}

---

Transaction Details:
Recipient: ${recipient}
Amount: ₹${amount}
Payment Note: "${note}"

Respond ONLY in valid JSON. No markdown, no backticks, no explanation.
`;

  return callOpenRouter("google/gemini-2.5-flash", fullPrompt, apiKey);
}

export async function scanMessage(message, apiKey, lang = "en") {
  const isDemo = localStorage.getItem("trustlayer_demo_mode") === "true";
  if (!apiKey && !isDemo) {
    throw new Error("⚙️ Please add your OpenRouter API key in Settings first.");
  }

  if (isDemo) {
    return simulateScanMessage(message);
  }

  const langInstruction = lang === "hi"
    ? `\nIMPORTANT: Write "explanation", "recommendation", "hinglish_warning", and "red_flags" in simple Hindi (Devanagari script). Keep JSON keys in English.`
    : ``;

  const systemInstructions = `You are a financial fraud detection AI for Indian users.
Analyze the message and context for signs of:
smishing, social engineering, urgency manipulation, impersonation,
prize/lottery scams, fake emergency requests, fake refunds, or OTP theft.

Respond ONLY in this exact JSON format with no extra text:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "risk_score": <integer 0-100>,
  "fraud_type": "<short label or None>",
  "explanation": "<2-3 sentence explanation>",
  "recommendation": "<1 sentence action for the user>",
  "hinglish_warning": "<2 sentence warning, only if HIGH risk, else empty string>",
  "red_flags": ["<flag 1>", "<flag 2>"]
}${langInstruction}`;

  const fullPrompt = `
${systemInstructions}

---

Transaction Details:
Message: "${message}"

Respond ONLY in valid JSON. No markdown, no backticks, no explanation.
`;

  return callOpenRouter("google/gemini-2.5-flash", fullPrompt, apiKey);
}

export async function fetchScamAlerts(apiKey) {
  const isDemo = localStorage.getItem("trustlayer_demo_mode") === "true";
  if (!apiKey && !isDemo) {
    throw new Error("⚙️ Please add your OpenRouter API key in Settings first.");
  }

  if (isDemo) {
    return simulateFetchScamAlerts();
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

  return callOpenRouter("google/gemini-2.5-flash:online", alertsPrompt, apiKey);
}

async function callOpenRouter(model, prompt, apiKey, retries = 2) {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:5173/",
          "X-Title": "TrustLayer"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: model.includes(":online") ? 0.2 : 0.3,
          max_tokens: model.includes(":online") ? 1500 : 1000
        })
      }
    );

    // Auto-retry on 429 / 503 errors
    if ((response.status === 429 || response.status === 503) && retries > 0) {
      const waitMs = response.status === 429 ? 4000 : 2000;
      console.log(`Rate limit hit (${response.status}), retrying in ${waitMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return callOpenRouter(model, prompt, apiKey, retries - 1);
    }

    if (!response.ok) {
      let message = "";
      try {
        const errJson = await response.json();
        if (errJson && errJson.error && errJson.error.message) {
          message = errJson.error.message;
        }
      } catch (e) {
        // failed to parse JSON
      }

      if (!message) {
        try {
          message = await response.text();
        } catch (e) {}
      }

      if (!message) {
        message = `API status ${response.status}`;
      }

      if (response.status === 403 || response.status === 401) {
        throw new Error(`Invalid API key — update in Settings ⚙️ (${message})`);
      }
      if (response.status === 429) {
        throw new Error(`Rate limit or quota exceeded. Please wait a moment, or enable "Demo Mode" in Settings ⚙️ to continue testing.`);
      }
      throw new Error(message);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Empty response from OpenRouter. Please try again.");
    }
    const text = data.choices[0].message.content;
    
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

// ==========================================
// LOCAL DEMO / SIMULATION FUNCTIONS
// ==========================================

function simulateAnalyzePayment(recipient, amount, note) {
  const noteLower = note.toLowerCase();
  let riskLevel = "LOW";
  let riskScore = 5;
  let fraudType = "None";
  let explanation = "This payment matches typical low-risk peer-to-peer transaction patterns.";
  let recommendation = "Safe to proceed with this payment.";
  let hinglishWarning = "";

  if (noteLower.includes("lottery") || noteLower.includes("kbc") || noteLower.includes("won") || noteLower.includes("prize")) {
    riskLevel = "HIGH";
    riskScore = 95;
    fraudType = "Prize Scam";
    explanation = "The payment note contains references to lottery winnings or prizes. Legitimate lotteries never request upfront payments or processing fees.";
    recommendation = "Do not proceed. This is a classic advance-fee prize scam.";
    hinglishWarning = "Yeh transaction mat karo! Prize ke naam par aapse paise thage ja rahe hain. Sabhi numbers block karein.";
  } else if (noteLower.includes("otp") || noteLower.includes("pin") || noteLower.includes("share") || noteLower.includes("card details")) {
    riskLevel = "HIGH";
    riskScore = 98;
    fraudType = "OTP Theft";
    explanation = "The transaction context or description requests OTP or sensitive banking PIN details. Banks never ask for OTPs or PINs to process payments.";
    recommendation = "Cancel this payment immediately. Do not share any security codes.";
    hinglishWarning = "Dhyan dein! Kisi ko bhi apna OTP ya bank PIN na batayein. Yeh ek fraud call ya fraud message ho sakta hai.";
  } else if (noteLower.includes("emergency") || noteLower.includes("hospital") || noteLower.includes("accident") || noteLower.includes("help")) {
    riskLevel = "HIGH";
    riskScore = 88;
    fraudType = "Fake Emergency";
    explanation = "High urgency tone requesting immediate funds for a medical or personal emergency. Scammers often impersonate friends or relatives.";
    recommendation = "Call the person directly on their known phone number to verify before sending any funds.";
    hinglishWarning = "Savdhan! Emergency ke message aane par sabse pehle us vyakti ko direct call karke verify karein. Kisi anjaan account par paise na bhejein.";
  } else if (noteLower.includes("refund") || noteLower.includes("cashback") || noteLower.includes("support")) {
    riskLevel = "MEDIUM";
    riskScore = 65;
    fraudType = "Refund Scam";
    explanation = "Payment description indicates a fee to process a refund or cashback. Official services do not charge fees to refund your money.";
    recommendation = "Verify the refund status via the merchant's official portal directly.";
  } else if (amount > 20000) {
    riskLevel = "MEDIUM";
    riskScore = 45;
    fraudType = "High Value Alert";
    explanation = "This transaction involves a relatively high amount. While the note is clean, high-value payments should be verified carefully.";
    recommendation = "Ensure you personally know the recipient before confirming this payment.";
  }

  return {
    success: true,
    data: {
      risk_level: riskLevel,
      risk_score: riskScore,
      fraud_type: fraudType,
      explanation,
      recommendation,
      hinglish_warning: hinglishWarning
    }
  };
}

function simulateScanMessage(message) {
  const msgLower = message.toLowerCase();
  let riskLevel = "LOW";
  let riskScore = 4;
  let fraudType = "None";
  let explanation = "The scanned message does not show obvious signs of social engineering or fraud indicators.";
  let recommendation = "Looks safe to read or reply to.";
  let hinglishWarning = "";
  let redFlags = [];

  if (msgLower.includes("lottery") || msgLower.includes("kbc") || msgLower.includes("won") || msgLower.includes("prize") || msgLower.includes("lakh")) {
    riskLevel = "HIGH";
    riskScore = 97;
    fraudType = "Prize Scam";
    explanation = "Message claims you won a lottery or lucky draw and requests payment or information to claim it. This is a common advance-fee fraud.";
    recommendation = "Do not click links or make any payments. Report and block the sender.";
    hinglishWarning = "Aapko lottery ke naam par fasaaya ja raha hai. Koi bhi payment na karein aur is number ko block karein.";
    redFlags = ["Lottery Claims", "Upfront Processing Fee", "Urgency"];
  } else if (msgLower.includes("otp") || msgLower.includes("pin") || msgLower.includes("secure") || msgLower.includes("compromised") || msgLower.includes("sbi") || msgLower.includes("bank")) {
    riskLevel = "HIGH";
    riskScore = 99;
    fraudType = "Bank Impersonation";
    explanation = "Message impersonates a bank, claiming account compromise, and asks for an OTP or PIN code. Banks never ask for credentials via text.";
    recommendation = "Do not share any OTP. Delete this message and contact your bank branch directly.";
    hinglishWarning = "Satark rahein! Bank kabhi bhi aapka OTP ya PIN nahi mangta. Kisi ke sath apni banking details share na karein.";
    redFlags = ["Bank Impersonation", "OTP / Credentials Request", "Urgent Threat"];
  } else if (msgLower.includes("part-time") || msgLower.includes("job") || msgLower.includes("earn") || msgLower.includes("telegram")) {
    riskLevel = "HIGH";
    riskScore = 85;
    fraudType = "Job Scam";
    explanation = "Offers high daily earnings for simple online tasks (like liking videos) and usually leads to demanding deposit money for higher tasks.";
    recommendation = "Avoid such high-yield part-time job offers. Legitimate employers never charge you money to work.";
    hinglishWarning = "Yeh ek part-time job scam hai. Shuruat me thoda profit dekar aapse badi rakam hadap li jayegi. Isse door rahein.";
    redFlags = ["Part-time Job Offer", "High Guaranteed Return", "Task-based Deposit"];
  } else if (msgLower.includes("link") || msgLower.includes("http") || msgLower.includes("click") || msgLower.includes("bit.ly")) {
    riskLevel = "MEDIUM";
    riskScore = 60;
    fraudType = "Suspicious Link";
    explanation = "The message contains an unverified shortened link or URL. Clicking unknown links may lead to credential harvesting or malware.";
    recommendation = "Do not click on links from unknown numbers. Check the sender's identity.";
    redFlags = ["Unverified URL Link"];
  }

  return {
    success: true,
    data: {
      risk_level: riskLevel,
      risk_score: riskScore,
      fraud_type: fraudType,
      explanation,
      recommendation,
      hinglish_warning: hinglishWarning,
      red_flags: redFlags
    }
  };
}

function simulateFetchScamAlerts() {
  const alerts = [
    {
      title: "Vigorous UPI Collect Request Fraud",
      category: "UPI",
      severity: "HIGH",
      summary: "Fraudsters are sending random UPI 'Collect' requests to users with names matching utility bills, hoping users will click authorize and enter their UPI PIN blindly.",
      tip: "Never enter your UPI PIN to receive money. PIN is only required to send or authorize payments."
    },
    {
      title: "Part-time Youtube Like Job Scams",
      category: "Job",
      severity: "HIGH",
      summary: "Scammers recruit people on WhatsApp/Telegram to like YouTube videos for small payouts (₹50-100), then coerce them into joining VIP groups and investing huge amounts.",
      tip: "Genuine jobs will never ask you to pay or deposit money to start earning."
    },
    {
      title: "Electricity Bill Verification Smishing",
      category: "SMS",
      severity: "MEDIUM",
      summary: "Fake SMS messages threatening immediate power disconnection due to pending bills are circulating. They instruct victims to call a fraud helpline number.",
      tip: "Utility companies do not send disconnection threats from normal mobile numbers. Contact the official electricity department."
    },
    {
      title: "RBI Fake Grant/Subsidy Call",
      category: "Banking",
      severity: "MEDIUM",
      summary: "Impersonators claiming to call from the RBI are offering direct subsidies and financial relief grants under mock government schemes to collect bank credentials.",
      tip: "The Reserve Bank of India never contacts individuals to offer grants, lottery funds, or personal accounts."
    },
    {
      title: "Fake FedEx Customs Courier Scam",
      category: "Investment",
      severity: "HIGH",
      summary: "Victims receive calls stating a parcel with illegal substances was sent in their name. Scammers posing as police force victims to transfer money for clearance.",
      tip: "No law enforcement agency or courier company will ask you to clear customs charges or police cases via bank transfer."
    }
  ];

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  return {
    success: true,
    data: {
      last_updated: dateStr,
      alerts
    }
  };
}

export async function callChatbot(chatHistory, newMessage, apiKey, lang = "en") {
  const isDemo = localStorage.getItem("trustlayer_demo_mode") === "true";
  if (!apiKey && !isDemo) {
    throw new Error("⚙️ Please add your OpenRouter API key in Settings first.");
  }

  // Special Intents (local checks, no API call needed)
  const inputLower = newMessage.toLowerCase().trim();
  let intentReply = null;

  if (inputLower.includes("help") || inputLower.includes("madad") || inputLower.includes("मदद")) {
    intentReply = lang === "hi"
      ? "🆘 आपातकालीन मदद: 1930 (राष्ट्रीय साइबर क्राइम हेल्पलाइन) पर कॉल करें या cybercrime.gov.in पर जाएं।"
      : "🆘 Emergency help: Call 1930 (National Cyber Crime Helpline) or visit cybercrime.gov.in to report fraud immediately.";
  } else if (inputLower.includes("1930") || inputLower.includes("cybercrime")) {
    intentReply = lang === "hi"
      ? "📞 राष्ट्रीय साइबर क्राइम हेल्पलाइन: 1930\n🌐 वेबसाइट: cybercrime.gov.in\n24/7 ऑनलाइन धोखाधड़ी रिपोर्ट के लिए उपलब्ध।"
      : "📞 National Cyber Crime Helpline: 1930\n🌐 Website: cybercrime.gov.in\nAvailable 24/7 for reporting online fraud.";
  } else if (inputLower.match(/otp|ओटीपी/i)) {
    intentReply = lang === "hi"
      ? "🚨 OTP अलर्ट: अपना OTP कभी शेयर मत करो — न बैंक को, न पुलिस को, न किसी ऐप को। OTP माँगना = स्कैम है।"
      : "🚨 OTP ALERT: Never share your OTP — not with banks, police, or any app. Asking for OTP = scam. Period.";
  }

  if (intentReply !== null) {
    return { success: true, reply: intentReply };
  }

  if (isDemo) {
    return simulateChatbotResponse(newMessage);
  }

  const systemInstructions = lang === "hi"
    ? `आप ट्रस्टगार्ड AI हैं — भारतीय उपयोगकर्ताओं के लिए एक हिंदी वित्तीय सुरक्षा सहायक।

आपका काम:
- स्कैम, फ़िशिंग SMS, फ़र्ज़ी UPI रिक्वेस्ट पहचानने में मदद करना
- सरल हिंदी में धोखाधड़ी के पैटर्न समझाना
- डिजिटल पेमेंट सुरक्षा के बारे में मार्गदर्शन करना
- RBI नियम, UPI सुरक्षा, OTP सुरक्षा के बारे में जवाब देना

व्यक्तित्व: दोस्ताना, जैसे एक जानकार दोस्त।
सरल हिंदी में जवाब दें। 4 वाक्यों से कम रखें।
Markdown स्वरूपण का उपयोग न करें — सिर्फ सादा टेक्स्ट।
जवाब की शुरुआत एक उपयुक्त इमोजी से करें।`
    : `You are TrustGuard AI, a friendly bilingual (Hindi + English) 
financial safety assistant built into TrustLayer app for Indian users.

Your job:
- Help users identify scams, phishing SMS, fake UPI requests
- Explain fraud patterns in simple Hinglish
- Guide users on safe digital payment practices
- Answer questions about RBI rules, UPI safety, OTP protection
- If user describes a suspicious message, give a risk verdict: 
  SAFE / SUSPICIOUS / DANGEROUS with explanation

Personality: Friendly, like a knowledgeable dost (friend).
Mix Hindi and English naturally. Use simple words.
Keep responses under 4 sentences unless user asks for detail.
Never use markdown formatting — plain text only.
Start responses with a relevant emoji.`;

  const messages = [
    {
      role: "system",
      content: systemInstructions
    },
    ...chatHistory.map(msg => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.text
    })),
    {
      role: "user",
      content: newMessage
    }
  ];

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:5173/",
          "X-Title": "TrustLayer"
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: messages,
          temperature: 0.7,
          max_tokens: 300
        })
      }
    );

    if (!response.ok) {
      let message = "";
      try {
        const errJson = await response.json();
        if (errJson && errJson.error && errJson.error.message) {
          message = errJson.error.message;
        }
      } catch (e) {}

      if (!message) {
        try {
          message = await response.text();
        } catch (e) {}
      }

      if (!message) {
        message = `API status ${response.status}`;
      }

      throw new Error(message);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Empty response from chatbot. Please try again.");
    }
    const reply = data.choices[0].message.content;
    return { success: true, reply };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function simulateChatbotResponse(newMessage) {
  const input = newMessage.toLowerCase();
  let reply = "👋 Dost, aapka message mila. Main abhi Demo Mode me hoon. Aap UPI safety, suspicious SMS, ya OTP security ke baare me pooch sakte hain.";

  if (input.includes("lottery") || input.includes("kbc") || input.includes("won") || input.includes("prize")) {
    reply = "🛑 DANGEROUS! Yeh ek lottery scam hai, dost. Koi bhi asli lottery aapse pehle paise nahi maangti. Is link par click mat karna aur sender ko block karo.";
  } else if (input.includes("upi") || input.includes("pay") || input.includes("request")) {
    reply = "💸 SUSPICIOUS! UPI request receive karte waqt dhyan dein. Paise receive karne ke liye kabhi bhi apna UPI PIN enter nahi karna hota. PIN sirf paise send karne ke liye hota hai.";
  } else if (input.includes("sms") || input.includes("message") || input.includes("link")) {
    reply = "🔍 SUSPICIOUS! Kisi bhi anjaan link par click na karein. SMS me aane wale updates bank ke official app me check karein.";
  }

  return { success: true, reply };
}

