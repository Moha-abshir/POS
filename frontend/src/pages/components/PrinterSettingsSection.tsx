import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle2, XCircle, RefreshCcw, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const PrinterSettingsSection: React.FC = () => {
  const [agentStatus, setAgentStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('E-POS ECO250');
  const [isTesting, setIsTesting] = useState(false);

  const checkAgent = async () => {
    setAgentStatus('checking');
    try {
      const res = await fetch('http://localhost:4000/status');
      if (res.ok) {
        setAgentStatus('connected');
        // Fetch printers
        const printersRes = await fetch('http://localhost:4000/printers');
        if (printersRes.ok) {
          const printersData = await printersRes.json();
          const list = printersData.printers || [];
          setPrinters(list);
          if (list.length > 0) {
            const match = list.find((p: string) => p.toUpperCase().includes('E-POS') || p.toUpperCase().includes('POS'));
            setSelectedPrinter(match || list[0]);
          }
        }
      } else {
        setAgentStatus('disconnected');
      }
    } catch {
      setAgentStatus('disconnected');
    }
  };

  useEffect(() => {
    checkAgent();
  }, []);

  const handleTestPrint = async () => {
    setIsTesting(true);
    try {
      // Create ESC/POS test receipt format aligned to 42 columns with cash drawer kick & cut
      const ESC = '\x1B';
      const GS = '\x1D';
      const SEP = '-'.repeat(42) + '\n';
      const DBL_SEP = '='.repeat(42) + '\n';
      
      let testText = '';
      testText += `${ESC}@`; // Initialize
      testText += `${ESC}a\x01`; // Center text
      testText += `${ESC}E\x01`; // Bold ON
      testText += `SMART STORE POS\n`;
      testText += `PRINTER DIAGNOSTIC TEST\n`;
      testText += `${ESC}E\x00`; // Bold OFF
      testText += SEP;
      testText += `${ESC}a\x00`; // Left align
      testText += `Date/Time: ${new Date().toLocaleString()}\n`;
      testText += `Printer  : ${selectedPrinter || 'Thermal Printer'}\n`;
      testText += `Agent    : Local Windows Spooler Agent\n`;
      testText += SEP;
      testText += `1x Test Receipt Item        KSh 1.00\n`;
      testText += SEP;
      testText += `${ESC}a\x01`; // Center text
      testText += `${ESC}E\x01`; // Bold ON
      testText += `TEST STATUS: SUCCESSFUL!\n`;
      testText += `Cash drawer kick & paper cut issued.\n`;
      testText += `${ESC}E\x00`; // Bold OFF
      testText += DBL_SEP + '\n\n\n\n';

      // ESC p 0 25 250 (Kick cash drawer pulse)
      const drawerKick = `${ESC}\x70\x00\x19\xFA`;
      // GS V 66 0 (Cut paper)
      const paperCut = `${GS}\x56\x42\x00`;

      const fullPayload = testText + drawerKick + paperCut;
      const encoder = new TextEncoder();
      const bytes = encoder.encode(fullPayload);

      // Convert to Base64
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const rawBase64 = window.btoa(binary);

      const res = await fetch('http://localhost:4000/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer: selectedPrinter,
          raw_base64: rawBase64
        })
      });

      if (res.ok) {
        toast.success(`Test receipt sent to ${selectedPrinter}! Cash drawer kicked & receipt cut.`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to print test receipt');
      }
    } catch (err) {
      toast.error('Could not communicate with local print agent on port 4000.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-5 md:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Printer size={22} />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-semibold text-[var(--color-text-primary)]">Thermal Receipt Printer Service</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Configure silent thermal receipt printing & test hardware connectivity</p>
          </div>
        </div>
        <button
          onClick={checkAgent}
          className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-sunken)] rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <RefreshCcw size={14} className={agentStatus === 'checking' ? 'animate-spin' : ''} /> Check Status
        </button>
      </div>

      {/* Agent Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-sunken)]">
        <div className="flex items-center gap-3">
          {agentStatus === 'checking' && (
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
          )}
          {agentStatus === 'connected' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          )}
          {agentStatus === 'disconnected' && (
            <XCircle className="w-5 h-5 text-rose-500" />
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {agentStatus === 'connected' ? 'Print Agent Active' : (agentStatus === 'disconnected' ? 'Print Agent Disconnected' : 'Checking Agent...')}
              </span>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                agentStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {agentStatus === 'connected' ? 'HTTP 4000 OK' : 'OFFLINE / FALLBACK'}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {agentStatus === 'connected'
                ? 'Direct ESC/POS Windows spooler binding is running locally.'
                : 'POS will fallback to standard Chrome print dialog if agent is not running.'}
            </p>
          </div>
        </div>
      </div>

      {/* Printer Selector & Test Action */}
      {agentStatus === 'connected' && (
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Detected Windows Thermal Printer</label>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] font-medium outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              {printers.length > 0 ? (
                printers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))
              ) : (
                <option value="E-POS ECO250">E-POS ECO250 (Default)</option>
              )}
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleTestPrint}
              disabled={isTesting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-[var(--radius-md)] flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <RefreshCcw size={16} className="animate-spin" /> Printing Test Receipt...
                </>
              ) : (
                <>
                  <Send size={16} /> Print Test Receipt & Kick Drawer
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual PowerShell Instruction for Offline Testing */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-blue-950">
          <Sparkles size={14} className="text-blue-600" /> Terminal / PowerShell Test Command
        </div>
        <p>You can also test the print agent directly from Windows PowerShell using this command:</p>
        <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto select-all">
          Invoke-RestMethod -Uri "http://localhost:4000/status" -Method GET
        </div>
      </div>
    </div>
  );
};
