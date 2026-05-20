import React, { useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Calendar, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface ReadingFormProps {
  onSuccess?: () => void;
}

export default function ReadingForm({ onSuccess }: ReadingFormProps) {
  const [readingValue, setReadingValue] = useState('');
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'warning' | 'info', message: string } | null>(null);
  const [isOfficial, setIsOfficial] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError(null);
    setAlert(null);

    try {
      const val = parseFloat(readingValue);
      if (isNaN(val) || val < 0) throw new Error('Invalid reading value');

      const readingDate = new Date(date);
      
      // Calculate units
      // Find the reading immediately before this date
      const q = query(
        collection(db, 'readings'),
        where('userId', '==', auth.currentUser.uid),
        where('date', '<', Timestamp.fromDate(readingDate)),
        orderBy('date', 'desc'),
        limit(1)
      );
      
      let prevSnapshot;
      try {
        prevSnapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'readings');
        return; // Should not be reached as throw is in handle
      }

      let units = 0;
      if (prevSnapshot && !prevSnapshot.empty) {
        const prevData = prevSnapshot.docs[0].data();
        units = val - prevData.readingValue;
        if (units < 0) {
          throw new Error(`Invalid reading: Current value (${val}) is less than previous reading (${prevData.readingValue}) on ${format(prevData.date.toDate(), 'PP')}`);
        }
      }

      // Alert logic: Check if unusually high ...
      // (Keep existing alert logic, but ensuring last3Snapshot matches)
      const last3Q = query(
        collection(db, 'readings'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('date', 'desc'),
        limit(3)
      );
      
      let last3Snapshot;
      try {
        last3Snapshot = await getDocs(last3Q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'readings');
        return;
      }

      const lastUnits = last3Snapshot.docs.map(d => d.data().units).filter(u => u > 0);
      if (lastUnits.length > 0) {
        const avg = lastUnits.reduce((a, b) => a + b, 0) / lastUnits.length;
        if (units > avg * 1.5) { // 50% higher than average
          setAlert({ 
            type: 'warning', 
            message: `Attention: This consumption (${units.toFixed(1)} units) is significantly higher than your average (${avg.toFixed(1)} units).` 
          });
        }
      }

      try {
        await addDoc(collection(db, 'readings'), {
          readingValue: val,
          date: Timestamp.fromDate(readingDate),
          remarks,
          userId: auth.currentUser.uid,
          units,
          isOfficial,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'readings');
      }

      setReadingValue('');
      setRemarks('');
      setIsOfficial(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to add reading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black uppercase mb-1">Meter Reading (kWh)</label>
          <input
            type="number"
            step="0.1"
            required
            value={readingValue}
            onChange={(e) => setReadingValue(e.target.value)}
            placeholder="0000.0"
            className="w-full border-2 border-slate-900 p-2 text-xl font-mono focus:outline-none focus:bg-slate-50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase mb-1">Reading Date & Time</label>
          <div className="relative">
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border-2 border-slate-900 p-2 text-sm focus:outline-none bg-slate-50 font-bold uppercase"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase mb-1">Remarks / Notes</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add any notes..."
            rows={2}
            className="w-full border-2 border-slate-900 p-2 text-sm focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center gap-2 py-1 select-none">
          <input
            type="checkbox"
            id="isOfficial"
            checked={isOfficial}
            onChange={(e) => setIsOfficial(e.target.checked)}
            className="w-4.5 h-4.5 cursor-pointer accent-slate-950 border-2 border-slate-900 rounded focus:ring-0"
          />
          <label htmlFor="isOfficial" className="text-[10px] font-black uppercase tracking-tight cursor-pointer">
            This is an Official Meter Reading
          </label>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-100 border-2 border-red-500 text-red-900 text-[10px] font-black uppercase flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </motion.div>
        )}

        <AnimatePresence>
          {alert && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-3 text-[10px] font-black uppercase border-2 flex items-start gap-2 ${
                alert.type === 'warning' ? 'bg-amber-100 border-amber-500 text-amber-900' : 'bg-blue-100 border-blue-500 text-blue-900'
              }`}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {alert.message}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 font-black uppercase text-sm border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:bg-slate-400 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4" />}
          Calculate & Record
        </button>
      </form>
    </div>
  );
}
