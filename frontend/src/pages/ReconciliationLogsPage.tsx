import React, { useState, useEffect } from 'react';
import { 
  Calculator, ArrowLeft, Calendar, 
  User, CheckCircle, AlertTriangle, Eye, EyeOff 
} from 'lucide-react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

export const ReconciliationLogsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/cash-sessions/history');
      setSessions(res.data.data);
    } catch (err) {
      console.error('Error fetching register history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatKES = (amount: number) => {
    return amount.toLocaleString('en-KE', { style: 'currency', currency: 'KES' });
  };

  const renderVarianceBadge = (diff: number) => {
    if (Math.abs(diff) <= 0.01) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100 flex items-center justify-center gap-1 w-max">
          <CheckCircle className="w-3.5 h-3.5" /> Balanced
        </span>
      );
    }

    const isSurplus = diff > 0;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center justify-center gap-1 w-max ${
        isSurplus 
          ? 'bg-blue-50 text-blue-700 border-blue-100' 
          : 'bg-red-50 text-red-700 border-red-100'
      }`}>
        <AlertTriangle className="w-3.5 h-3.5" /> {isSurplus ? 'Surplus' : 'Shortage'}: {formatKES(Math.abs(diff))}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link 
          to="/" 
          className="p-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-[var(--color-accent)]" /> Cash Register Reconciliations
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Audits of register floats, counted cash, and drawer variances</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Historical Shifts Table */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm xl:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 font-bold uppercase tracking-wider text-xs text-gray-500 flex justify-between items-center">
            <span>Historical Reconciliation Sessions</span>
            <button 
              onClick={() => { setLoading(true); fetchHistory(); }}
              className="text-[var(--color-accent)] hover:underline font-bold text-xs"
            >
              Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-xs text-left">
              <thead className="bg-gray-50 font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3">Duration / Date</th>
                  <th className="px-5 py-3">Cashier Details</th>
                  <th className="px-5 py-3 text-right">Float</th>
                  <th className="px-5 py-3 text-right">System Expected</th>
                  <th className="px-5 py-3 text-right">Actual Counted</th>
                  <th className="px-5 py-3 text-center">Variance Status</th>
                  <th className="px-5 py-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white font-medium text-gray-800">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      No register reconciliation sessions found. Open/close a shift register to begin logs.
                    </td>
                  </tr>
                ) : (
                  sessions.map((sess) => {
                    const startStr = new Date(sess.openedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                    const startHrs = new Date(sess.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const endHrs = sess.closedAt 
                      ? new Date(sess.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Open';
                    const isSelected = selectedSession?.id === sess.id;

                    return (
                      <tr key={sess.id} className={`hover:bg-gray-50/50 ${isSelected ? 'bg-amber-50/15' : ''}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 font-bold text-gray-900">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {startStr}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{startHrs} to {endHrs}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            {sess.openedByName}
                          </div>
                          {sess.closedByName !== 'N/A' && sess.closedByName !== sess.openedByName && (
                            <div className="text-[10px] text-gray-400 mt-0.5">Closed by: {sess.closedByName}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold">{formatKES(Number(sess.openingFloat))}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-700">{formatKES(Number(sess.expectedCash))}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                          {sess.status === 'OPEN' ? 'Active...' : formatKES(Number(sess.actualCash))}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-center">
                            {sess.status === 'OPEN' ? (
                              <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 text-[10px] border border-green-100 font-bold tracking-wide uppercase">Open Shift</span>
                            ) : (
                              renderVarianceBadge(Number(sess.actualCash) - Math.abs(Number(sess.expectedCash)))
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => setSelectedSession(isSelected ? null : sess)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isSelected 
                                ? 'bg-amber-100 border-amber-300 text-amber-800' 
                                : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                            title={isSelected ? 'Hide Details' : 'View Denominations breakdown'}
                          >
                            {isSelected ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Count Details Drawer */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden sticky top-6">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 font-bold uppercase tracking-wider text-xs text-gray-500">
            Session Details &amp; Denominations
          </div>

          <div className="p-5 text-sm">
            {!selectedSession ? (
              <div className="py-12 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                <Calculator className="w-10 h-10 text-gray-300" />
                Select a session row on the left to inspect detailed counted notes, coins, and cashier notes.
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Variance and basic information */}
                <div className="bg-gray-50 p-4 border border-gray-100 rounded-lg space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Session Status</span>
                    <span className="font-bold text-gray-900 uppercase">{selectedSession.status}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Shift Started</span>
                    <span className="font-semibold text-gray-800">
                      {new Date(selectedSession.openedAt).toLocaleDateString('en-GB')} at {new Date(selectedSession.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {selectedSession.closedAt && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Shift Closed</span>
                      <span className="font-semibold text-gray-800">
                        {new Date(selectedSession.closedAt).toLocaleDateString('en-GB')} at {new Date(selectedSession.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Expected vs Actual */}
                {selectedSession.status === 'CLOSED' && (
                  <div className="border border-gray-100 rounded-lg p-4 space-y-1.5 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Opening Float</span>
                      <span>{formatKES(Number(selectedSession.openingFloat))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Expected in Register</span>
                      <span>{formatKES(Number(selectedSession.expectedCash))}</span>
                    </div>
                    <div className="flex justify-between text-gray-900 pt-1 border-t border-dashed">
                      <span>Total Actual Counted</span>
                      <span className="font-bold">{formatKES(Number(selectedSession.actualCash))}</span>
                    </div>
                    <div className="pt-2">
                      {renderVarianceBadge(Number(selectedSession.actualCash) - Math.abs(Number(selectedSession.expectedCash)))}
                    </div>
                  </div>
                )}

                {/* Cashier notes */}
                {selectedSession.notes && (
                  <div className="bg-amber-50/30 border border-amber-100 rounded-lg p-3 text-xs leading-relaxed text-amber-900">
                    <p className="font-bold uppercase tracking-wider text-[9px] mb-0.5 text-amber-700">Cashier Explanation Notes</p>
                    <p className="font-medium italic">"{selectedSession.notes}"</p>
                  </div>
                )}

                {/* Counted Denominations breakdown */}
                {selectedSession.denominationCounts && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Denomination Counter breakdown</h4>
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                      <table className="min-w-full text-xs text-left">
                        <thead className="bg-gray-50 font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                          <tr>
                            <th className="px-3 py-2">Denomination</th>
                            <th className="px-3 py-2 text-center">Quantity</th>
                            <th className="px-3 py-2 text-right">Total (KES)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium text-gray-700 bg-white">
                          {Object.entries(selectedSession.denominationCounts)
                            .map(([val, qty]) => ({
                              value: Number(val),
                              quantity: Number(qty)
                            }))
                            .filter(d => d.quantity > 0)
                            .sort((a, b) => b.value - a.value)
                            .map((denom) => (
                              <tr key={denom.value}>
                                <td className="px-3 py-1.5">{denom.value >= 50 ? `${denom.value.toLocaleString()} Note` : `${denom.value} Coin`}</td>
                                <td className="px-3 py-1.5 text-center font-bold">{denom.quantity}</td>
                                <td className="px-3 py-1.5 text-right font-bold">{formatKES(denom.quantity * denom.value)}</td>
                              </tr>
                            ))}
                          {Object.values(selectedSession.denominationCounts).every(v => Number(v) === 0) && (
                            <tr>
                              <td colSpan={3} className="px-3 py-4 text-center text-gray-400">No denominationsCount quantity logged</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
