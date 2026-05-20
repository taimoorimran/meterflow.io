import React, { useState } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { History, MessageSquare, TrendingUp, TrendingDown, Trash2, Calendar, Search, SlidersHorizontal, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Reading } from '../types';
import { deleteDoc, doc } from 'firebase/firestore';

export default function ReadingList() {
  const [readings, loading, error] = useCollectionData(
    query(
      collection(db, 'readings'),
      where('userId', '==', auth.currentUser?.uid),
      orderBy('date', 'desc')
    )
  ) as unknown as [Reading[] | undefined, boolean, any, any];

  // Search & Filter local states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOfficial, setFilterOfficial] = useState<'all' | 'official' | 'standard'>('all');
  const [filterConsumption, setFilterConsumption] = useState<'all' | 'high' | 'normal'>('all');

  React.useEffect(() => {
    if (error) {
      handleFirestoreError(error, OperationType.LIST, 'readings');
    }
  }, [error]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await deleteDoc(doc(db, 'readings', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `readings/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl border-2 border-red-500 font-bold uppercase text-xs">
        Error loading history: {error.message}
      </div>
    );
  }

  if (!readings || readings.length === 0) {
    return (
      <div className="text-center p-12 bg-slate-50 border-2 border-dashed border-slate-200">
        <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-bold uppercase text-xs">No readings found yet.</p>
        <p className="text-xs text-slate-400 mt-1 uppercase font-extrabold">Add your first reading or click DEMO DATA to begin.</p>
      </div>
    );
  }

  // 1. Enrich readings with the chronological relationship variables (isHigher status) BEFORE filtering
  // This avoids index mapping bugs when search/filters are active!
  const enrichedReadings = readings.map((reading, index) => {
    const isHigher = index < readings.length - 1 && reading.units > readings[index + 1].units;
    return {
      ...reading,
      isHigher
    };
  });

  // 2. Apply client-side filters
  const filteredReadings = enrichedReadings.filter(r => {
    // Remarks Search Match
    if (searchQuery.trim() !== "") {
      const match = (r.remarks || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!match) return false;
    }

    // Official status Filter Match
    if (filterOfficial === 'official' && !r.isOfficial) return false;
    if (filterOfficial === 'standard' && r.isOfficial) return false;

    // Consumption Standing Filter Match
    if (filterConsumption === 'high' && !r.isHigher) return false;
    if (filterConsumption === 'normal' && r.isHigher) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* List Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Historical Records</h2>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">Chronological tracking list</p>
        </div>

        <div className="flex gap-2">
          <span className="px-2 py-1 bg-slate-100 text-[10px] font-black border border-slate-200">TOTAL: {readings.length} ROWS</span>
          {filteredReadings.length !== readings.length && (
            <span className="px-2 py-1 bg-blue-50 text-[10px] font-black border border-blue-200 text-blue-800">FILTERED: {filteredReadings.length}</span>
          )}
        </div>
      </div>

      {/* Neubrutalist Filter Workspace */}
      <div className="bg-slate-50 border-2 border-slate-900 p-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search Remarks */}
        <div className="relative">
          <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Search Remarks</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by comment content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-slate-900 p-2 pl-8 text-xs font-bold focus:outline-none focus:bg-slate-50 rounded-none font-mono"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Filter Official */}
        <div>
          <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Audit Type</label>
          <select
            value={filterOfficial}
            onChange={(e: any) => setFilterOfficial(e.target.value)}
            className="w-full bg-white border-2 border-slate-900 p-2 text-xs font-black uppercase focus:outline-none focus:bg-slate-50 rounded-none cursor-pointer"
          >
            <option value="all">All Entries</option>
            <option value="official">✓ Official ONLY</option>
            <option value="standard">Standard Audits</option>
          </select>
        </div>

        {/* Filter Consumption */}
        <div>
          <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Usage Status</label>
          <select
            value={filterConsumption}
            onChange={(e: any) => setFilterConsumption(e.target.value)}
            className="w-full bg-white border-2 border-slate-900 p-2 text-xs font-black uppercase focus:outline-none focus:bg-slate-50 rounded-none cursor-pointer"
          >
            <option value="all">All Consumption Levels</option>
            <option value="high">▲ High Consumption</option>
            <option value="normal">▼ Normal Consumption</option>
          </select>
        </div>
      </div>

      {/* Table grid */}
      {filteredReadings.length > 0 ? (
        <div className="overflow-x-auto border-2 border-slate-900 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-left">
                <th className="p-3 text-[9px] uppercase font-black text-slate-500">Date & Time</th>
                <th className="p-3 text-[9px] uppercase font-black text-slate-500">Reading (kWh)</th>
                <th className="p-3 text-[9px] uppercase font-black text-slate-500 text-right pr-6">Units Used</th>
                <th className="p-3 text-[9px] uppercase font-black text-slate-500">Audit Status</th>
                <th className="p-3 text-[9px] uppercase font-black text-slate-500">Remarks</th>
                <th className="p-3 text-[9px] uppercase font-black text-slate-500 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              <AnimatePresence mode="popLayout">
                {filteredReadings.map((reading) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={reading.id}
                    className="border-b border-slate-200 hover:bg-slate-50 transition-all group"
                  >
                    <td className="p-3 font-bold text-slate-900">
                      {format(reading.date.toDate(), 'PPP, p')}
                    </td>
                    <td className="p-3 font-mono text-slate-600 font-bold">
                      {reading.readingValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                    <td className={`p-3 font-extrabold text-right pr-6 font-mono ${reading.isHigher ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {reading.units.toFixed(1)}
                      <span className="ml-1 text-[9px] font-black">{reading.isHigher ? '▲' : '▼'}</span>
                    </td>
                    <td className="p-3 font-black space-y-1">
                      <div>
                        <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] uppercase tracking-wider font-extrabold border ${
                          reading.isHigher ? 'bg-red-50 text-red-700 border-red-350' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        }`}>
                          {reading.isHigher ? 'High Spike' : 'Within Norm'}
                        </span>
                      </div>
                      {reading.isOfficial && (
                        <div>
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-[3px] text-[8px] uppercase font-extrabold border border-blue-400">
                            ✓ Official Cut-Off
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 italic font-medium max-w-[180px] truncate" title={reading.remarks}>
                      {reading.remarks || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => reading.id && handleDelete(reading.id)}
                        className="p-1.5 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-slate-950 transition-all cursor-pointer hover:bg-rose-50 rounded-none"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-8 border-2 border-slate-900 bg-slate-50 flex flex-col items-center justify-center">
          <EyeOff className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs uppercase font-extrabold text-slate-500">No entries match your search filters</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterOfficial('all');
              setFilterConsumption('all');
            }}
            className="mt-3 text-[10px] font-black bg-white border-2 border-slate-900 px-3 py-1.5 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
          >
            CLEAR FILTERS
          </button>
        </div>
      )}
    </div>
  );
}
