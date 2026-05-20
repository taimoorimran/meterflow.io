import React, { useState, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, writeBatch, doc, deleteDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Download, Upload, Trash2, Database, RefreshCw, AlertCircle, Sparkles, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parse, format } from 'date-fns';

export default function BackupManager() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger CSV export
  const handleExport = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const q = query(
        collection(db, 'readings'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('date', 'asc')
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        throw new Error("No readings found to export. Try adding or injecting some records first!");
      }

      // Headers
      let csvContent = "Date,ReadingValue_kWh,ConsumptionUnits,Remarks,IsOfficial\n";

      snapshot.docs.forEach(d => {
        const data = d.data();
        const dateStr = format(data.date.toDate(), "yyyy-MM-dd HH:mm:ss");
        const remarksEscaped = `"${(data.remarks || '').replace(/"/g, '""')}"`;
        csvContent += `${dateStr},${data.readingValue},${data.units || 0},${remarksEscaped},${data.isOfficial || false}\n`;
      });

      // Download trigger
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `meter_readings_backup_${format(new Date(), "yyyyMMdd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess("CSV Data exported successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to export CSV");
    } finally {
      setLoading(false);
    }
  };

  // CSV Import handler
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error("Could not read empty file.");

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length <= 1) throw new Error("No data records found in CSV (header row only or empty).");

        // Simple CSV parser
        const parsedRecords: Array<{
          date: Date;
          readingValue: number;
          remarks: string;
          isOfficial: boolean;
        }> = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          // simple split accounting for escaped quotes in remarks
          const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          
          if (parts.length < 2) continue;

          const dateStr = parts[0]?.trim();
          const readingStr = parts[1]?.trim();
          const unitsStr = parts[2]?.trim(); // optional in raw imports
          const remarksRaw = parts[3]?.trim() || "";
          const remarks = remarksRaw.startsWith('"') && remarksRaw.endsWith('"') 
            ? remarksRaw.slice(1, -1).replace(/""/g, '"') 
            : remarksRaw;
          const isOfficial = parts[4]?.trim().toLowerCase() === "true";

          const readingValue = parseFloat(readingStr);
          if (isNaN(readingValue) || readingValue < 0) {
            throw new Error(`Data format error on line ${i + 1}: Reading value must be a positive number`);
          }

          let parsedDate: Date;
          try {
            parsedDate = new Date(dateStr);
            if (isNaN(parsedDate.getTime())) {
              // Try parsing with standard ISO formats or custom formats if needed
              throw new Error("Invalid date");
            }
          } catch {
            throw new Error(`Data format error on line ${i + 1}: Invalid date format "${dateStr}"`);
          }

          parsedRecords.push({
            date: parsedDate,
            readingValue,
            remarks: remarks.slice(0, 1000), // restrict length to limits
            isOfficial
          });
        }

        if (parsedRecords.length === 0) {
          throw new Error("No valid records found to import.");
        }

        // Sort chronologically to correctly compute units
        parsedRecords.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Fetch existing readings to determine starting point
        const q = query(
          collection(db, 'readings'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        const existingSorted = snapshot.docs.map(doc => doc.data()).sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

        // Write batch
        const batch = writeBatch(db);
        let lastReadingVal = existingSorted.length > 0 ? existingSorted[existingSorted.length - 1].readingValue : null;

        for (const record of parsedRecords) {
          let units = 0;
          if (lastReadingVal !== null) {
            units = record.readingValue - lastReadingVal;
            if (units < 0) {
              // Meter was reset or typo. Keep units 0 or relative value
              units = 0; 
            }
          }
          
          lastReadingVal = record.readingValue;

          const docRef = doc(collection(db, 'readings'));
          batch.set(docRef, {
            readingValue: record.readingValue,
            date: Timestamp.fromDate(record.date),
            remarks: record.remarks,
            userId: auth.currentUser.uid,
            units: units,
            isOfficial: record.isOfficial,
            createdAt: serverTimestamp()
          });
        }

        await batch.commit();
        setSuccess(`Successfully imported ${parsedRecords.length} readings!`);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to import CSV");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  // Inject beautiful demo data
  const handleInjectDemo = async () => {
    if (!auth.currentUser) return;
    if (!window.confirm("This will inject 12 high-quality mock readings covering the past 6 months to instantly populate your indicators. Proceed?")) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date();
      const mockReadings: Array<{
        date: Date;
        readingValue: number;
        remarks: string;
        isOfficial: boolean;
      }> = [];

      // Generate 12 readings spanning approx 6 months (spaced 15 days apart)
      let currentMeter = 1200; // start index
      for (let i = 12; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 15 * 24 * 60 * 60 * 1000);
        
        // Add realistic fluctuating consumption per 15-day block (average 6-12 kWh/day)
        // Let's create a visual cycle, maybe one month exceeding limit to test UI
        let consumption = 90 + Math.floor(Math.random() * 50); // 90 to 140 units per block
        
        if (i === 6 || i === 7) {
          // Exceed threshold peak for "May / April" 
          consumption = 160 + Math.floor(Math.random() * 60); 
        }

        currentMeter += consumption;

        const isCutoffPoint = date.getDate() === 13; // label some cutoff points
        
        mockReadings.push({
          date,
          readingValue: currentMeter,
          remarks: i === 12 ? "Initial setup" : isCutoffPoint ? "Official monthly cycle record" : `Automatic intermediate audit`,
          isOfficial: isCutoffPoint || Math.random() > 0.7
        });
      }

      // Write sequentially adding appropriate Units calculated chronologically
      const batch = writeBatch(db);
      let lastVal = 1200;

      mockReadings.forEach(item => {
        const units = item.readingValue - lastVal;
        lastVal = item.readingValue;

        const docRef = doc(collection(db, 'readings'));
        batch.set(docRef, {
          readingValue: item.readingValue,
          date: Timestamp.fromDate(item.date),
          remarks: item.remarks,
          userId: auth.currentUser!.uid,
          units: units,
          isOfficial: item.isOfficial,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      setSuccess("Demonstration database simulated successfully with 12 mock records!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to inject demo records");
    } finally {
      setLoading(false);
    }
  };

  // Erase database
  const handlePurge = async () => {
    if (!auth.currentUser) return;
    const confirmText = "DELETE ALL DATA";
    const input = window.prompt(`CRITICAL WARNING: This action will permanently delete all meter readings in your account.\n\nType "${confirmText}" to confirm:`);
    
    if (input !== confirmText) {
      setError("Database purge cancelled (confirmation text mismatch).");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const q = query(
        collection(db, 'readings'),
        where('userId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error("No database entries found to purge.");
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.delete(d.ref);
      });

      await batch.commit();
      setSuccess(`Purged database. Deleted ${snapshot.size} records.`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to clear database");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-slate-900 p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-4">
      <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-2">
        <Database className="w-4 h-4 text-slate-800" />
        <span className="text-xs font-black uppercase text-slate-900">Database & Portability</span>
      </div>

      <p className="text-[10px] text-slate-500 font-extrabold uppercase leading-relaxed">
        Export database as backup, import clean historical templates, or populate records to review indicators.
      </p>

      {/* Button controls */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase">
        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border-2 border-slate-900 p-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border-2 border-slate-900 p-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          Import CSV
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".csv"
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase">
        <button
          onClick={handleInjectDemo}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 border-2 border-slate-900 p-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          DEMO DATA
        </button>

        <button
          onClick={handlePurge}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 border-2 border-rose-900 text-rose-900 p-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          PURGE DATA
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 justify-center py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-800" />
          <span className="text-[9px] font-black uppercase text-slate-500 animate-pulse">Syncing Database Transaction...</span>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2 border border-red-500 bg-red-50 text-red-900 text-[9px] font-bold uppercase leading-relaxed flex items-start gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2 border border-emerald-500 bg-emerald-50 text-emerald-900 text-[9px] font-bold uppercase leading-relaxed flex items-start gap-1.5"
          >
            <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
