import { useState } from 'react';
import { Search, ShieldAlert, ShieldCheck, Globe, Calendar, Server, Building2, Copy, Download, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import RiskBadge from '../components/RiskBadge';
import { motion, AnimatePresence } from 'motion/react';

export default function Lookup({ user }: { user: User | null }) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Frontend validation
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain.trim())) {
      setError('Invalid domain format. Please enter a valid domain (e.g., example.com).');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.get(`/api/whois/${domain.trim()}`);
      setResult(response.data);

      // Save to history if user is logged in
      if (user && response.data?.analysis) {
        const registrar = response.data.raw?.registrarName;
        const country = response.data.raw?.registrant?.countryCode || response.data.raw?.registrant?.country;
        
        await supabase.from('whois_queries').insert({
          user_id: user.id,
          domain: domain.toLowerCase(),
          registrar: registrar || 'Unknown',
          country: country || 'Unknown',
          threat_score: response.data.analysis.level || 'Low'
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to perform lookup. Please check the domain name.');
    } finally {
      setLoading(false);
    }
  };

  const copyRawData = () => {
    if (result) {
      navigator.clipboard.writeText(result.raw?.rawText || JSON.stringify(result.raw, null, 2));
      alert('WHOIS data copied to clipboard');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-widest">
          <AlertTriangle className="w-4 h-4" />
          For educational & ethical hacking use only
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-widest mb-4"
        >
          <ShieldCheck className="w-3 h-3" />
          Cyber Intelligence Engine v1.0
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          WHOIS <span className="text-emerald-500">Search</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Find out the registration details, registrar information, and registration dates for any domain name.
        </p>
      </div>

      {user && (
        <div className="max-w-2xl mx-auto mb-4 flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Logged in as: {user.email}</span>
        </div>
      )}

      <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-16">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
          </div>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Enter a domain name..."
            className="block w-full pl-12 pr-32 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-2xl"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Lookup</>
            )}
          </button>
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Global RDAP Network</span>
          <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Real-time Risk Analysis</span>
        </div>
      </form>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Risk Analysis Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  Domain Status
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Presence</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-sm text-white font-bold">Present</span>
                    </div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Activity</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${result.analysis?.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                      <span className="text-sm text-white font-bold">{result.analysis?.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <RiskBadge level={result.analysis?.level || 'Low'} className="text-xs px-3 py-1" />
                </div>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-emerald-500" />
                  Threat Score
                </h3>
                
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-white/5"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={364.4}
                        strokeDashoffset={364.4 - (364.4 * (result.analysis?.score || 0)) / 100}
                        className={result.analysis?.level === 'High' ? 'text-red-500' : result.analysis?.level === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-white">{result.analysis?.score || 0}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Points</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Risk Factors</p>
                  {result.analysis?.factors?.map((factor: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      {factor}
                    </div>
                  )) || <p className="text-xs text-slate-500 italic">No significant risks detected.</p>}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Raw Intelligence Data</span>
                <div className="flex gap-2">
                  <button onClick={copyRawData} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors" title="Copy JSON">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors" title="Download Report">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* WHOIS Data Cards */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    Domain Info
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Domain Name</p>
                      <p className="text-white font-mono">{result.raw?.domainName || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Status</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {result.raw?.status?.split(' ').map((s: string, idx: number) => (
                          <span key={`${s}-${idx}`} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-slate-300">
                            {s}
                          </span>
                        )) || <span className="text-xs text-slate-500 italic">No status info</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    Important Dates
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Registered</span>
                      <span className="text-xs text-white font-mono">{result.raw?.createdDate?.split('T')[0] || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Expires</span>
                      <span className="text-xs text-white font-mono">{result.raw?.expiresDate?.split('T')[0] || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Last Changed</span>
                      <span className="text-xs text-white font-mono">{result.raw?.updatedDate?.split('T')[0] || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    Registrar Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Registrar Name</p>
                      <p className="text-white text-sm font-medium">
                        {result.raw?.registrarName || 'Unknown'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">IANA ID</p>
                        <p className="text-white text-xs font-mono">{result.raw?.registrarIANAID || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Abuse Email</p>
                        <p className="text-white text-xs truncate" title={result.raw?.contactEmail || result.raw?.registrarAbuseContactEmail}>
                          {result.raw?.contactEmail || result.raw?.registrarAbuseContactEmail || 'N/A'}
                        </p>
                      </div>
                    </div>
                    {result.raw?.registrarURL && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Registrar URL</p>
                        <a href={result.raw.registrarURL.startsWith('http') ? result.raw.registrarURL : `https://${result.raw.registrarURL}`} 
                           target="_blank" rel="noopener noreferrer" 
                           className="text-emerald-500 text-xs hover:underline truncate block">
                          {result.raw.registrarURL}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-500" />
                    Name Servers
                  </h3>
                  <div className="space-y-2">
                    {result.raw?.nameServers?.hostNames?.map((ns: string, idx: number) => (
                      <div key={`${ns}-${idx}`} className="text-xs text-white font-mono bg-white/5 p-2 rounded border border-white/5">
                        {ns}
                      </div>
                    )) || <p className="text-xs text-slate-500 italic">No nameservers found</p>}
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Registrant & Network</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Organization</p>
                    <p className="text-xs text-white truncate">{result.raw?.registrant?.organization || 'Redacted'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Country</p>
                    <p className="text-xs text-white font-mono truncate">{result.raw?.registrant?.country || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Source</p>
                    <p className="text-xs text-white font-mono truncate">{result.source || 'WhoisXML API'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Data Quality</p>
                    <p className="text-xs text-white font-mono truncate">Verified</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Raw WHOIS Text</h3>
                <div className="bg-black/40 rounded-xl p-4 border border-white/5 max-h-96 overflow-y-auto">
                  <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap leading-relaxed">
                    {result.raw?.rawText || 'No raw text available'}
                  </pre>
                </div>
              </div>

              {/* Privacy Notice - Appears below result if masked data is detected */}
              {(result.raw?.dataError === "MASKED_WHOIS_DATA" || 
                JSON.stringify(result.raw).toUpperCase().includes("REDACTED") || 
                JSON.stringify(result.raw).toUpperCase().includes("PRIVACY") || 
                JSON.stringify(result.raw).toUpperCase().includes("MASKED")) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-start gap-4"
                >
                  <AlertTriangle className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Privacy Notice</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Some WHOIS data for this domain may be masked or redacted due to privacy regulations (such as GDPR).
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !loading && (
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center opacity-50">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
              <Globe className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Global Coverage</h4>
            <p className="text-xs text-slate-500">Access data from all major TLDs and registrars worldwide.</p>
          </div>
          <div className="space-y-3">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Risk Scoring</h4>
            <p className="text-xs text-slate-500">Advanced heuristics to identify potentially malicious domains.</p>
          </div>
          <div className="space-y-3">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
              <Server className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Infrastructure</h4>
            <p className="text-xs text-slate-500">Deep dive into nameservers, IP history, and hosting entities.</p>
          </div>
        </div>
      )}
    </div>
  );
}
