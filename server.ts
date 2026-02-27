import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Trust proxy for express-rate-limit to work correctly behind AI Studio's proxy
app.set('trust proxy', 1);

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." }
});

app.use("/api/", limiter);

// Supabase client (Server-side for history saving if needed, but client-side is also fine)
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Risk Analysis Logic
function analyzeRisk(whoisData: any, isRdap: boolean = false) {
  let score = 0;
  const factors = [];

  if (!whoisData) return { score: 0, level: "Low", factors: ["No data available for analysis"] };

  let createdDate: string | undefined;
  let country: string | undefined;
  let registrar: string | undefined;
  let registrantName = "";
  let registrantOrg = "";

  if (isRdap) {
    // RDAP normalization
    createdDate = whoisData.events?.find((e: any) => e.action === "registration")?.eventDate;
    country = whoisData.entities?.[0]?.vcardArray?.[1]?.find((item: any) => item[0] === "adr")?.[3]?.[6];
    registrar = whoisData.entities?.find((e: any) => e.roles?.includes("registrar"))?.vcardArray?.[1]?.find((item: any) => item[0] === "fn")?.[3];
    const registrantEntity = whoisData.entities?.find((e: any) => e.roles?.includes("registrant"));
    registrantName = registrantEntity?.vcardArray?.[1]?.find((item: any) => item[0] === "fn")?.[3] || "";
    registrantOrg = registrantEntity?.vcardArray?.[1]?.find((item: any) => item[0] === "org")?.[3] || "";
  } else {
    // WhoisXML normalization
    const record = whoisData.WhoisRecord || whoisData;
    createdDate = record.createdDate;
    country = record.registrant?.countryCode || record.registrant?.country;
    registrar = record.registrarName;
    registrantName = record.registrant?.name || "";
    registrantOrg = record.registrant?.organization || "";
  }

  // 1. Domain Age
  if (createdDate) {
    const ageInDays = (new Date().getTime() - new Date(createdDate).getTime()) / (1000 * 3600 * 24);
    if (ageInDays < 30) {
      score += 40;
      factors.push("Domain is very new (less than 30 days)");
    } else if (ageInDays < 180) {
      score += 20;
      factors.push("Domain is relatively new (less than 6 months)");
    }
  } else {
    score += 10;
    factors.push("Registration date not clearly found");
  }

  // 2. Country Risk
  const highRiskCountries = ["RU", "CN", "KP", "IR"];
  if (country && highRiskCountries.includes(country)) {
    score += 30;
    factors.push(`High-risk jurisdiction detected: ${country}`);
  }

  // 3. Privacy Protection
  const isPrivacy = [registrantName, registrantOrg].some(s => 
    s.toLowerCase().includes("privacy") || 
    s.toLowerCase().includes("proxy") || 
    s.toLowerCase().includes("protected") ||
    s.toLowerCase().includes("redacted")
  ) || (whoisData.WhoisRecord?.dataError === "MASKED_WHOIS_DATA") || (whoisData.dataError === "MASKED_WHOIS_DATA");

  // We still track it but don't penalize or flag it as a risk factor per user request
  if (isPrivacy) {
    // score += 15;
    // factors.push("Privacy protection or masked data detected (GDPR/Redacted)");
  }

  // 4. Registrar Reputation
  const suspiciousRegistrars = ["Namecheap", "Freenom", "PublicDomainRegistry"];
  if (registrar && suspiciousRegistrars.some(r => registrar.includes(r))) {
    score += 10;
    factors.push(`Registrar (${registrar}) is frequently used for low-cost/disposable domains`);
  }

  let level = "Low";
  if (score >= 60) level = "High";
  else if (score >= 30) level = "Medium";

  // Activity check
  let isActive = false;
  if (isRdap) {
    isActive = whoisData.nameservers && whoisData.nameservers.length > 0;
  } else {
    const record = whoisData.WhoisRecord || whoisData;
    isActive = record.nameServers && record.nameServers.hostNames && record.nameServers.hostNames.length > 0;
    if (record.status && record.status.toLowerCase().includes("inactive")) isActive = false;
  }

  return { score, level, factors, isActive };
}

// API Routes
app.get("/api/whois/:domain", async (req, res) => {
  const { domain } = req.params;
  const apiKey = process.env.WHOIS_API_KEY;
  
  const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return res.status(400).json({ error: "Invalid domain format. Please enter a valid domain (e.g., example.com)." });
  }

  const cleanDomain = domain.toLowerCase().trim();

  try {
    // Attempt WhoisXML API first if key is present
    if (apiKey && apiKey !== "your_whoisxmlapi_key_here") {
      try {
        console.log(`Fetching WHOIS data for: ${cleanDomain} via WhoisXML API`);
        const response = await axios.get(`https://www.whoisxmlapi.com/whoisserver/WhoisService`, {
          params: { apiKey, domainName: cleanDomain, outputFormat: 'JSON' },
          timeout: 20000
        });

        console.log(`WhoisXML API Response for ${cleanDomain}:`, JSON.stringify(response.data, null, 2));

        if (response.data && !response.data.ErrorMessage) {
          const record = response.data.WhoisRecord;
          // Even if there's a dataError like MASKED_WHOIS_DATA, if we have a record, it's a valid result
          if (record) {
            // Ensure domainName is present for the UI
            if (!record.domainName) record.domainName = cleanDomain;
            
            const risk = analyzeRisk(response.data, false);
            return res.json({ raw: record, analysis: risk, source: 'WhoisXML' });
          }
        }
        console.warn(`WhoisXML API returned no data for ${cleanDomain}, falling back to RDAP`);
      } catch (apiErr: any) {
        console.warn(`WhoisXML API failed for ${cleanDomain} (${apiErr.message}), falling back to RDAP`);
      }
    }

    // Fallback: RDAP (Free ICANN Protocol)
    console.log(`Attempting RDAP lookup for: ${cleanDomain}`);
    const axiosConfig = {
      timeout: 15000,
      headers: { 
        'Accept': 'application/rdap+json, application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.iana.org/'
      }
    };

    const redirectors = [
      `https://rdap.iana.org/domain/${cleanDomain}`,
      `https://rdap.org/domain/${cleanDomain}`,
      `https://rdap.verisign.com/com/v1/domain/${cleanDomain}`
    ];

    let lastError = null;
    let rdapResponse = null;

    for (const url of redirectors) {
      if (url.includes('verisign') && !cleanDomain.endsWith('.com') && !cleanDomain.endsWith('.net')) continue;
      try {
        const resp = await axios.get(url, axiosConfig);
        if (resp.status === 200 && resp.data) {
          rdapResponse = resp.data;
          break;
        }
      } catch (err: any) {
        lastError = err;
        if (err.response?.status === 404) break;
      }
    }

      if (rdapResponse) {
        const registrarEntity = rdapResponse.entities?.find((e: any) => e.roles?.includes("registrar"));
        const registrarName = registrarEntity?.vcardArray?.[1]?.find((item: any) => item[0] === "fn")?.[3];
        const registrarIANAID = registrarEntity?.publicIds?.find((id: any) => id.type === "iana id")?.identifier;
        const registrarURL = registrarEntity?.vcardArray?.[1]?.find((item: any) => item[0] === "url")?.[3];
        const registrarAbuseContactEmail = registrarEntity?.entities?.find((e: any) => e.roles?.includes("abuse"))?.vcardArray?.[1]?.find((item: any) => item[0] === "email")?.[3];

        const createdDate = rdapResponse.events?.find((e: any) => e.action === "registration")?.eventDate;
        const nameServers = rdapResponse.nameservers?.map((ns: any) => ns.ldhName);

        // Normalize RDAP to match frontend expectations (WhoisXML-like)
        const normalizedData = {
          domainName: rdapResponse.ldhName,
          registrarName,
          registrarIANAID,
          registrarURL,
          registrarAbuseContactEmail,
          createdDate,
          expiresDate: rdapResponse.events?.find((e: any) => e.action === "expiration")?.eventDate,
          updatedDate: rdapResponse.events?.find((e: any) => e.action === "last changed")?.eventDate,
          status: rdapResponse.status?.join(' '),
          nameServers: { hostNames: nameServers },
          registrant: {
            organization: rdapResponse.entities?.find((e: any) => e.roles?.includes("registrant"))?.vcardArray?.[1]?.find((item: any) => item[0] === "org")?.[3],
            country: rdapResponse.entities?.[0]?.vcardArray?.[1]?.find((item: any) => item[0] === "adr")?.[3]?.[6]
          },
          rawText: JSON.stringify(rdapResponse, null, 2)
        };

        const risk = analyzeRisk(rdapResponse, true);
        return res.json({ raw: normalizedData, analysis: risk, source: 'RDAP' });
      }

    // If we reach here, both WhoisXML and RDAP failed to find a valid record
    const notFoundError = new Error("The domain is not present.");
    (notFoundError as any).response = { status: 404 };
    throw notFoundError;
  } catch (error: any) {
    const status = error.response?.status || 500;
    
    let errorMessage = error.message || "Failed to perform WHOIS lookup.";
    if (status === 404) {
      errorMessage = "The domain is not present.";
      console.log(`WHOIS Lookup: ${cleanDomain} not found (404)`);
    } else {
      console.error(`WHOIS Lookup Error for ${cleanDomain}:`, error.message);
      if (status === 401) {
        errorMessage = "Invalid WHOIS_API_KEY. Please check your WhoisXML API key.";
      } else if (status === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      }
    }

    res.status(status).json({ error: errorMessage });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
