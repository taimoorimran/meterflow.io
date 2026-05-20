import React from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Reading } from '../types';
import { getCycleBounds, computeMonthlyCycles } from '../lib/utils';
import { Zap, Activity, Info, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface MetricsProps {
  cutoffDay: number;
  threshold: number;
}

export default function Metrics({ cutoffDay, threshold }: MetricsProps) {
  const [readings, loading] = useCollectionData(
    query(
      collection(db, 'readings'),
      where('userId', '==', auth.currentUser?.uid),
      orderBy('date', 'desc')
    )
  ) as unknown as [Reading[] | undefined, boolean, any, any];

  if (loading || !readings || readings.length === 0) return null;

  const currentCycle = getCycleBounds(new Date(), cutoffDay);
  
  // Calculate rolling and monthly cycles
  const monthlyCycles = computeMonthlyCycles(readings, cutoffDay, threshold);
  const currentMonthData = monthlyCycles[monthlyCycles.length - 1];
  
  const totalUnits = currentMonthData ? currentMonthData.units : 0;
  
  // Average calculation of past completed monthly cycles
  const completedCycles = monthlyCycles.filter(c => c.isCompleted);
  const avgUnits = completedCycles.length > 0 
    ? completedCycles.reduce((sum, c) => sum + c.units, 0) / completedCycles.length 
    : totalUnits;
  
  const isHigh = totalUnits > avgUnits * 1.5 && avgUnits > 0;
  const isProtected = totalUnits <= threshold;

  return (
    <div className="grid grid-cols-1 gap-4">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white border-2 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
      >
        <span className="text-[10px] font-black uppercase text-slate-400">Current Month Units</span>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-4xl font-black">{totalUnits.toFixed(1)}</span>
          <span className="text-xs font-bold text-slate-500">kWh</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
          <Info className="w-3.5 h-3.5 text-blue-600" />
          Cutoff: {currentCycle.label.split(' - ')[1]}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className={`p-6 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${
          isProtected ? 'bg-emerald-50 text-slate-900' : 'bg-rose-50 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400">Current Standing</span>
          {isProtected ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xl font-black uppercase tracking-tighter">
            {isProtected ? 'Protected' : 'Unprotected'}
          </span>
          <span className="text-xs font-bold opacity-60">(&le; {threshold} kWh)</span>
        </div>
        
        <p className="text-[11px] font-bold text-slate-500 mt-2">
          AVG MONTHLY: {avgUnits.toFixed(1)} kWh
        </p>
      </motion.div>
    </div>
  );
}
