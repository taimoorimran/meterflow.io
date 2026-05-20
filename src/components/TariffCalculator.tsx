import React, { useState, useEffect } from 'react';
import { Calculator, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles, Receipt, HelpCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function TariffCalculator() {
  const [units, setUnits] = useState<number>(185);
  const [tariffType, setTariffType] = useState<'pak_nepra' | 'custom'>('pak_nepra');
  const [isProtected, setIsProtected] = useState<boolean>(true);
  const [customRate, setCustomRate] = useState<number>(35);
  const [taxPercent, setTaxPercent] = useState<number>(18);
  const [showFaq, setShowFaq] = useState(false);

  // Auto-toggle protected status for Pakistan domestic based on real NEPRA threshold limit (200 Units)
  useEffect(() => {
    if (tariffType === 'pak_nepra') {
      setIsProtected(units <= 200);
    }
  }, [units, tariffType]);

  // Pakistan NEPRA 2026 domestic tariff model
  // Note: Protected (under 200 units for 6 months consecutively): flat low rates.
  // Unprotected: Multi-stage higher rates.
  const calculateBill = () => {
    let rawSlabCost = 0;
    let slabRateDetails: Array<{ slab: string; rate: number; cost: number }> = [];
    
    if (tariffType === 'pak_nepra') {
      if (isProtected) {
        // Protected domestic rate (highly subsidized)
        // 1 - 100 units: ~Rs. 7.74/unit
        // 101 - 200 units: ~Rs. 10.06/unit
        if (units <= 100) {
          const cost = units * 7.74;
          rawSlabCost = cost;
          slabRateDetails.push({ slab: "0 - 100 (Protected)", rate: 7.74, cost });
        } else {
          const cost1 = 100 * 7.74;
          const cost2 = (units - 100) * 10.06;
          rawSlabCost = cost1 + cost2;
          slabRateDetails.push(
            { slab: "0 - 100 (Protected)", rate: 7.74, cost: cost1 },
            { slab: "101 - 200 (Protected)", rate: 10.06, cost: cost2 }
          );
        }
      } else {
        // Unprotected domestic rate (No slab benefit - current month tariff spikes immensely)
        // 1 - 100: ~Rs. 16.48
        // 101 - 200: ~Rs. 22.95
        // 201 - 300: ~Rs. 29.21
        // 301 - 400: ~Rs. 35.57
        // 401+: ~Rs. 42.00
        let remaining = units;
        
        // Slab 1
        const u1 = Math.min(100, remaining);
        const cost1 = u1 * 16.48;
        rawSlabCost += cost1;
        slabRateDetails.push({ slab: "1 - 100 (Unprotected)", rate: 16.48, cost: cost1 });
        remaining -= u1;

        // Slab 2
        if (remaining > 0) {
          const u2 = Math.min(100, remaining);
          const cost2 = u2 * 22.95;
          rawSlabCost += cost2;
          slabRateDetails.push({ slab: "101 - 200 (Unprotected)", rate: 22.95, cost: cost2 });
          remaining -= u2;
        }

        // Slab 3
        if (remaining > 0) {
          const u3 = Math.min(100, remaining);
          const cost3 = u3 * 29.21;
          rawSlabCost += cost3;
          slabRateDetails.push({ slab: "201 - 300 (Unprotected)", rate: 29.21, cost: cost3 });
          remaining -= u3;
        }

        // Slab 4
        if (remaining > 0) {
          const u4 = Math.min(100, remaining);
          const cost4 = u4 * 35.57;
          rawSlabCost += cost4;
          slabRateDetails.push({ slab: "301 - 400 (Unprotected)", rate: 35.57, cost: cost4 });
          remaining -= u4;
        }

        // Slab 5
        if (remaining > 0) {
          const cost5 = remaining * 42.00;
          rawSlabCost += cost5;
          slabRateDetails.push({ slab: "401+ (Unprotected)", rate: 42.00, cost: cost5 });
        }
      }
    } else {
      // Custom basic tariff
      const cost = units * customRate;
      rawSlabCost = cost;
      slabRateDetails.push({ slab: `Flat Custom Rate`, rate: customRate, cost });
    }

    // Fuel Price Adjustment (FPA) + Fixed charges: Estimate Rs. 3.5 per unit on average
    const fpaEst = units * 3.5;
    
    // Taxes: Sales Tax (GST) + Duties
    const taxEst = (rawSlabCost + fpaEst) * (taxPercent / 100);
    const totalBill = rawSlabCost + fpaEst + taxEst;

    // Estimate what the bill WOULD be if they crossed/didn't cross
    // To show potential penalty/savings
    let compareBill = 0;
    if (tariffType === 'pak_nepra') {
      if (isProtected) {
        // Estimate penalty bill if unprotected at same usage!
        let compRaw = 0;
        const u1 = Math.min(100, units);
        compRaw += u1 * 16.48;
        const u2 = Math.max(0, units - 100);
        compRaw += u2 * 22.95;
        compareBill = compRaw + (units * 3.5) + ((compRaw + (units * 3.5)) * (taxPercent / 100));
      } else {
        // Estimate savings bill if usage was kept protected <= 200
        const restrictedUnits = Math.min(200, units);
        let compRaw = 0;
        if (restrictedUnits <= 100) {
          compRaw = restrictedUnits * 7.74;
        } else {
          compRaw = (100 * 7.74) + ((restrictedUnits - 100) * 10.06);
        }
        compareBill = compRaw + (restrictedUnits * 3.5) + ((compRaw + (restrictedUnits * 3.5)) * (taxPercent / 100));
      }
    }

    return {
      rawSlabCost,
      slabRateDetails,
      fpaEst,
      taxEst,
      totalBill,
      compareBill,
      multiplierDifference: compareBill > 0 && isProtected ? (compareBill / totalBill) : 1
    };
  };

  const bill = calculateBill();

  return (
    <div className="bg-white border-2 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-slate-800" />
          <h3 className="text-sm font-black uppercase text-slate-900">Tariff Analyzer & Bill Projector</h3>
        </div>
        <button
          onClick={() => setShowFaq(!showFaq)}
          className="text-[9px] font-black uppercase bg-slate-100 border border-slate-900 px-2 py-0.5 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
        >
          <HelpCircle className="w-3 h-3" />
          {showFaq ? 'Hide Help' : 'How the slabs work'}
        </button>
      </div>

      {showFaq && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-blue-50 border border-blue-400 p-4 text-[11px] font-bold text-slate-700 leading-relaxed uppercase tracking-tight space-y-2"
        >
          <p className="font-extrabold text-blue-900">🇵🇰 The Pakistani "Protected Consumer" Slab Trap:</p>
          <p>
            • If your average monthly consumption remains <span className="text-blue-900 font-black">under 200 kWh</span> for 6 consecutive months, you are in the subsidized <span className="underline">Protected Slab</span>.
          </p>
          <p>
            • Once you cross <span className="text-rose-600 font-black">201 kWh</span> in any single month, or lose status, your entire pricing flips to the <span className="underline">Unprotected Slab</span>.
          </p>
          <p>
            • It's not just paying for the extra unit—your <span className="font-black">rate for every single unit</span> climbs by 200% to 300% instantly, plus higher GST, fuel adjustments, and fixed surcharges!
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Select Billing Regime</label>
            <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase">
              <button
                type="button"
                onClick={() => setTariffType('pak_nepra')}
                className={`p-2.5 border-2 text-center transition-all cursor-pointer ${
                  tariffType === 'pak_nepra'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-300 hover:border-slate-900'
                }`}
              >
                🇵🇰 NEPRA Domestic
              </button>
              <button
                type="button"
                onClick={() => setTariffType('custom')}
                className={`p-2.5 border-2 text-center transition-all cursor-pointer ${
                  tariffType === 'custom'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-300 hover:border-slate-900'
                }`}
              >
                ⚙️ Custom Tariff
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="tempUnitsInput" className="block text-[10px] font-black uppercase text-slate-400">Monthly Usage Projection (kWh)</label>
              <span className="font-mono text-xs font-black">{units} kWh</span>
            </div>
            <input
              id="tempUnitsInput"
              type="range"
              min="10"
              max="500"
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="w-full accent-slate-950 h-2 bg-slate-200 cursor-pointer border border-slate-900 rounded-none mb-2"
            />
            <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
              <span>10 kWh</span>
              {tariffType === 'pak_nepra' && (
                <span className="text-rose-600 font-extrabold border-x-2 border-slate-900 px-1 hover:bg-rose-50 cursor-pointer" onClick={() => setUnits(200)}>
                  201 kWh Protected Limit
                </span>
              )}
              <span>500 kWh</span>
            </div>
          </div>

          {tariffType === 'pak_nepra' && (
            <div className="flex items-center gap-3 p-3.5 border-2 border-slate-900 bg-slate-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              {isProtected ? (
                <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-8 h-8 text-rose-600 shrink-0 animate-bounce" />
              )}
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">Predicted Tariff Slab</span>
                <span className={`block font-black text-xs uppercase tracking-tight ${isProtected ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isProtected ? 'Active Protected Consumer Slab' : '⚠️ Danger: Unprotected High Tariff'}
                </span>
                <p className="text-[9px] text-slate-500 font-bold leading-none mt-1 uppercase">
                  {isProtected ? 'Subsidized charges enabled. Flat base rate.' : 'Subsidies lost. Multiplier tariff applied.'}
                </p>
              </div>
            </div>
          )}

          {tariffType === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="customRateInput" className="block text-[10px] font-black uppercase text-slate-400 mb-1">Custom Rate per kWh</label>
                <input
                  id="customRateInput"
                  type="number"
                  min="1"
                  max="100"
                  value={customRate}
                  onChange={(e) => setCustomRate(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border-2 border-slate-900 p-2 text-xs font-mono font-bold focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="taxPercentInput" className="block text-[10px] font-black uppercase text-slate-400 mb-1">GST / Surcharge (%)</label>
                <input
                  id="taxPercentInput"
                  type="number"
                  min="0"
                  max="50"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full border-2 border-slate-900 p-2 text-xs font-mono font-bold focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bill Receipt Render */}
        <div className="bg-slate-900 text-white p-5 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] font-mono text-[11px] uppercase tracking-tight relative flex flex-col justify-between">
          <div className="absolute top-2 right-2 text-[8px] border border-slate-700 font-sans text-slate-400 px-1 font-bold">
            EST. BILL REVENUE
          </div>
          
          <div className="space-y-3">
            <div className="border-b border-dashed border-slate-700 pb-2">
              <span className="text-[10px] text-slate-400 font-sans font-bold block">AUDIT PROJECTION</span>
              <span className="text-sm font-black text-amber-400">METERFLOW OUTLET INVOICE</span>
            </div>

            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span>Total consumption:</span>
                <span className="text-white font-extrabold">{units} kWh</span>
              </div>
              
              {/* Detailed Slab Breakdown */}
              <div className="pl-3 py-1 space-y-1 text-[10px] text-slate-400 border-l border-slate-700">
                {bill.slabRateDetails.map((s, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>• {s.slab}</span>
                    <span>Rs. {s.cost.toFixed(1)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span>Basic Cost:</span>
                <span className="text-white">Rs. {bill.rawSlabCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Fuel (FPA) & Surcharges:</span>
                <span className="text-white">Rs. {bill.fpaEst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Govt Taxes & Duties:</span>
                <span className="text-white">Rs. {bill.taxEst.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t-2 border-dashed border-slate-700 pt-2 flex justify-between text-white text-xs font-black">
              <span>ESTIMATED PAYABLE:</span>
              <span className="text-amber-400 font-extrabold text-sm">Rs. {bill.totalBill.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Comparison Block to Show Savings/Penalty */}
          {tariffType === 'pak_nepra' && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              {isProtected ? (
                <div className="bg-emerald-950 border border-emerald-500/30 p-2.5 text-[9px] text-emerald-300 uppercase leading-normal">
                  <div className="flex items-center gap-1 font-black text-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    PROTECTED BENEFIT ACTIVE
                  </div>
                  <p className="mt-1 font-sans font-medium text-[10px]">
                    If you cross 200 kWh, your rate spikes! Your bill would raise tomorrow to <b className="text-white">Rs. {Math.round(bill.compareBill).toLocaleString()}</b>. You are saving <b className="text-white">Rs. {Math.round(bill.compareBill - bill.totalBill).toLocaleString()}</b> by tracking!
                  </p>
                </div>
              ) : (
                <div className="bg-rose-950 border border-rose-500/30 p-2.5 text-[9px] text-rose-300 uppercase leading-normal">
                  <div className="flex items-center gap-1 font-black text-rose-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    SLAB EXCESS PENALTY
                  </div>
                  <p className="mt-1 font-sans font-medium text-[10px]">
                    If you reduce consumption to <b className="text-white">200 kWh</b> and maintain Protected status, your bill could shrink down to <b className="text-white">Rs. {Math.round(compareBillProtected(200)).toLocaleString()}</b>. Keep tracking to recover!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Helper calculation
  function compareBillProtected(targetUnits: number) {
    const rawCost = (100 * 7.74) + ((targetUnits - 100) * 10.06);
    const fpa = targetUnits * 3.5;
    const taxes = (rawCost + fpa) * (taxPercent / 100);
    return rawCost + fpa + taxes;
  }
}
