import React from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { History, MessageSquare, TrendingUp, TrendingDown, Trash2, Calendar } from 'lucide-react';
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
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl">
        Error loading history: {error.message}
      </div>
    );
  }

  if (!readings || readings.length === 0) {
    return (
      <div className="text-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No readings found yet.</p>
        <p className="text-sm text-slate-400">Add your first reading to see history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Historical Records</h2>
        <div className="flex gap-2">
           <span className="px-2 py-1 bg-slate-100 text-[10px] font-black border border-slate-200">DATA</span>
           <span className="px-2 py-1 bg-slate-100 text-[10px] font-black border border-slate-200 uppercase">{readings.length} ROWS</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-left">
              <th className="py-3 text-[10px] uppercase font-black text-slate-400">Date</th>
              <th className="py-3 text-[10px] uppercase font-black text-slate-400">Reading</th>
              <th className="py-3 text-[10px] uppercase font-black text-slate-400 text-right pr-4">Units Used</th>
              <th className="py-3 text-[10px] uppercase font-black text-slate-400">Status</th>
              <th className="py-3 text-[10px] uppercase font-black text-slate-400">Remarks</th>
              <th className="py-3 text-[10px] uppercase font-black text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <AnimatePresence mode="popLayout">
              {readings.map((reading, index) => {
                const isHigher = index < readings.length - 1 && reading.units > readings[index + 1].units;
                
                return (
                  <motion.tr
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={reading.id || index}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors group"
                  >
                    <td className="py-4 font-bold text-slate-900">
                      {format(reading.date.toDate(), 'MMM d, yyyy, p')}
                    </td>
                    <td className="py-4 font-mono text-slate-600">
                      {reading.readingValue.toLocaleString()}
                    </td>
                    <td className={`py-4 font-black text-right pr-4 ${isHigher ? 'text-red-600' : 'text-emerald-600'}`}>
                      {reading.units.toFixed(1)}
                      <span className="ml-1 text-[10px]">{isHigher ? '▲' : '▼'}</span>
                    </td>
                    <td className="py-4 text-[10px] font-black space-y-1">
                      <div>
                        <span className={`px-2 py-0.5 rounded uppercase ${
                          isHigher ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isHigher ? 'High' : 'Normal'}
                        </span>
                      </div>
                      {reading.isOfficial && (
                        <div>
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[9px] uppercase font-bold border border-blue-400">
                            ✓ Official
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-slate-400 italic font-medium max-w-[200px] truncate" title={reading.remarks}>
                      {reading.remarks || '-'}
                    </td>
                    <td className="py-4">
                      <button 
                        onClick={() => reading.id && handleDelete(reading.id)}
                        className="p-1.5 border border-slate-200 hover:border-red-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
