import React, { useState } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Reading } from '../types';
import { computeMonthlyCycles, computeDailyConsumption, getCycleBounds, MonthlyCycleData } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, LineChart, Line, AreaChart, Area } from 'recharts';
import { Zap, ShieldCheck, ShieldAlert, BarChart3, HelpCircle, CalendarRange } from 'lucide-react';
import { motion } from 'motion/react';

interface AnalyticsChartsProps {
  cutoffDay: number;
  threshold: number;
}

export default function AnalyticsCharts({ cutoffDay, threshold }: AnalyticsChartsProps) {
  const [readings, loading] = useCollectionData(
    query(
      collection(db, 'readings'),
      where('userId', '==', auth.currentUser?.uid),
      orderBy('date', 'desc')
    )
  ) as unknown as [Reading[] | undefined, boolean, any, any];

  const [activeTab, setActiveTab] = useState<'annual' | 'daily'>('annual');

  if (loading || !readings || readings.length === 0) {
    return (
      <div className="bg-white border-2 border-slate-900 p-8 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-white animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-4">Analysing Usage History...</p>
      </div>
    );
  }

  // Get processed cycle list
  const monthlyCycles = computeMonthlyCycles(readings, cutoffDay, threshold);
  
  // Calculate rolling 6 months protected stats (completed ones)
  const completedCycles = monthlyCycles.filter(c => c.isCompleted);
  // Get last 6 completed cycles
  const last6Completed = completedCycles.slice(-6);
  const totalCompletedCount = last6Completed.length;
  const protectedMonthsInLast6 = last6Completed.filter(c => c.isProtected).length;
  const is6MonthsProtected = totalCompletedCount > 0 && protectedMonthsInLast6 === totalCompletedCount;

  // Daily usage estimation for current cycle
  const dailyData = computeDailyConsumption(readings);
  // Filter daily readings that belong to current cycle
  const currentBounds = getCycleBounds(new Date(), cutoffDay);
  const currentCycleDaily = dailyData.filter(d => d.date >= currentBounds.start && d.date <= currentBounds.end);

  // Custom tooltips for nice, neubrutalist geometric design
  const CustomTooltipAnnual = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyCycleData = payload[0].payload;
      return (
        <div className="bg-white border-2 border-slate-900 p-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] font-sans text-xs">
          <p className="font-black uppercase text-[10px] text-slate-400 mb-1">{data.monthLabel}</p>
          <p className="font-bold text-slate-900 text-sm">
            Consumption: <span className="font-black text-blue-600">{data.units.toFixed(1)} kWh</span>
          </p>
          <p className="font-medium text-slate-500 mt-1">
            Meter: {data.startReadingVal.toFixed(0)} → {data.endReadingVal.toFixed(0)}
          </p>
          <span className={`inline-block mt-2 px-1.5 py-0.5 font-bold uppercase text-[9px] border border-slate-900 ${
            data.isProtected ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            {data.isProtected ? '★ Protected' : 'Unprotected'}
          </span>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipDaily = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border-2 border-slate-900 p-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] font-sans text-xs">
          <p className="font-black uppercase text-[10px] text-slate-400 mb-1">{data.dateStr}</p>
          <p className="font-bold text-slate-900 text-sm">
            Day Consumption: <span className="font-black text-amber-600">{data.consumed.toFixed(1)} kWh</span>
          </p>
          <p className="font-medium text-slate-500 mt-1">
            Running Meter: {data.readingValue.toFixed(1)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 6-Month Protected Indication Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rolling Status */}
        <div className={`p-6 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between ${
          is6MonthsProtected ? 'bg-emerald-50' : 'bg-rose-50'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">6-Month Standing</span>
              {is6MonthsProtected ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              )}
            </div>
            
            <h3 className="text-2xl font-black uppercase tracking-tighter mt-2">
              {is6MonthsProtected ? 'Protected Consumer' : 'Unprotected Tariff'}
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed font-semibold">
              {is6MonthsProtected 
                ? `Outstanding! You kept your consumption below ${threshold} kWh for all of the past 6 billing cycles.` 
                : `Your consumption exceeded ${threshold} kWh in ${totalCompletedCount - protectedMonthsInLast6} of the last 6 months, shifting you to standard unprotected rates.`}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-900/10 flex items-center justify-between text-xs font-black uppercase">
            <span>Historical Compliance:</span>
            <span className={is6MonthsProtected ? 'text-emerald-700' : 'text-rose-700'}>
              {protectedMonthsInLast6} / {Math.max(6, totalCompletedCount)} Months Checked
            </span>
          </div>
        </div>

        {/* Current Cycle Standing */}
        <div className="bg-white p-6 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400">Current Cycle Progress</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black">
                {monthlyCycles[monthlyCycles.length - 1]?.units.toFixed(1) || '0'}
              </span>
              <span className="text-xs font-bold text-slate-400">/ {threshold} kWh Limit</span>
            </div>

            <p className="text-xs text-slate-500 mt-2 font-medium">
              We look back at the readings relative to the cutoff (Day {cutoffDay}) to evaluate your standing daily. Keep it below {threshold} to secure this month's protection.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-2">
            {last6Completed.map((c, idx) => (
              <div 
                key={idx} 
                className={`flex-1 min-w-[50px] text-center py-1 border border-slate-900 text-[9px] font-bold ${
                  c.isProtected ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                }`}
                title={`${c.monthLabel}: ${c.units.toFixed(0)} kWh`}
              >
                <div>{c.monthLabel.split(' ')[0]}</div>
                <div className="font-extrabold">{c.units.toFixed(0)}</div>
              </div>
            ))}
            {last6Completed.length === 0 && (
              <span className="text-[10px] font-bold italic text-slate-400">Insufficient monthly records to generate 6-month status.</span>
            )}
          </div>
        </div>
      </div>

      {/* Graphs Wrapper with Neubrutalist Selector tabs */}
      <div className="bg-white border-2 border-slate-900 p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b-2 border-slate-900 pb-4 mb-6 gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Consumption Metrics & Projection
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Analised dynamically via configured {cutoffDay}th cut-off</p>
          </div>

          <div className="flex border-2 border-slate-900 overflow-hidden text-xs">
            <button
              onClick={() => setActiveTab('annual')}
              className={`px-4 py-2 font-black uppercase transition-colors cursor-pointer ${
                activeTab === 'annual' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 bg-white'
              }`}
            >
              Annual (Monthly)
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 font-black uppercase transition-colors cursor-pointer ${
                activeTab === 'daily' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 bg-white'
              }`}
            >
              Current Cycle (Daily)
            </button>
          </div>
        </div>

        {activeTab === 'annual' ? (
          <div>
            <div className="h-64 sm:h-80 w-full font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCycles} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="monthLabel" stroke="#1e293b" fontSize={10} fontWeight="bold" />
                  <YAxis stroke="#1e293b" fontSize={10} fontWeight="bold" />
                  <Tooltip content={<CustomTooltipAnnual />} cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }} />
                  <ReferenceLine y={threshold} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'Tariff Limit', position: 'top', fill: '#ef4444', fontStyle: 'italic', fontWeight: 'bold', fontSize: 10 }} />
                  <Bar
                    dataKey="units"
                    isAnimationActive={false}
                    shape={(props: any) => {
                      const { fill, x, y, width, height, payload } = props;
                      // Dynamic coloring depending on protection limits
                      const isOver = payload.units > threshold;
                      const customColor = isOver ? '#ef4444' : '#10b981';
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={customColor}
                          stroke="#0f172a"
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex items-center justify-end gap-6 text-[10px] font-black uppercase">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-emerald-500 border border-slate-900"></div>
                <span>Protected (≤ {threshold} kWh)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 bg-red-505 bg-red-500 border border-slate-900"></div>
                <span>Unprotected (&gt; {threshold} kWh)</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {currentCycleDaily.length > 0 ? (
              <div className="space-y-4">
                <div className="h-64 sm:h-80 w-full font-mono text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={currentCycleDaily} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorConsumed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="dateStr" stroke="#1e293b" fontSize={10} fontWeight="bold" />
                      <YAxis stroke="#1e293b" fontSize={10} fontWeight="bold" />
                      <Tooltip content={<CustomTooltipDaily />} />
                      <Area 
                        type="monotone" 
                        dataKey="consumed" 
                        stroke="#d97706" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorConsumed)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic mt-2">
                  Daily consumption is computed automatically using our customized formula: <b>Yesterday last meter reading subtracted from today's last meter reading.</b>
                </p>
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-slate-200 text-center text-slate-400 font-medium">
                <CalendarRange className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs uppercase font-bold">No daily entries for current cycle</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Add more than one meter reading during this billing cycle (from the {cutoffDay + 1}th of last month onwards) to show daily trends.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
