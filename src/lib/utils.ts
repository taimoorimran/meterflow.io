import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, set, addMonths, subMonths, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, differenceInDays } from 'date-fns';
import { Reading } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Get the cutoff boundaries for a given date and dynamic cutoffDay
export const getCycleBounds = (date: Date, cutoffDay: number = 13) => {
  const day = date.getDate();
  let start: Date;
  let end: Date;

  if (day > cutoffDay) {
    start = set(date, { date: cutoffDay + 1, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
    // End is the cutoffDay of the next month
    const nextMonth = addMonths(date, 1);
    end = set(nextMonth, { date: cutoffDay, hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });
  } else {
    // Current cycle started in previous month
    const prevMonth = subMonths(date, 1);
    start = set(prevMonth, { date: cutoffDay + 1, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
    end = set(date, { date: cutoffDay, hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });
  }

  return { 
    start, 
    end, 
    label: `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}` 
  };
};

export const formatReadingValue = (value: number) => {
  return value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

// Calculate monthly cycle consumption based on the user's specific instructions:
// Units consumed between two months should be reading of last month's cutoff date subtracted by this month's cutoff date
// (or if the cutoff has not happened yet, units consumed till this day).
export interface MonthlyCycleData {
  monthLabel: string; // e.g., "May 2026"
  startCutoffDate: Date;
  endCutoffDate: Date;
  startReadingVal: number;
  endReadingVal: number;
  units: number;
  isCompleted: boolean;
  isProtected: boolean;
  message?: string;
}

export function computeMonthlyCycles(
  readings: Reading[],
  cutoffDay: number = 13,
  threshold: number = 200
): MonthlyCycleData[] {
  if (readings.length === 0) return [];

  // Sort readings chronologically
  const sorted = [...readings].sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

  // Generate the last 12 monthly cycles up to the current date
  const now = new Date();
  const cycles: MonthlyCycleData[] = [];

  // Let's look back 12 months
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i);
    const bounds = getCycleBounds(d, cutoffDay);
    const isCompleted = now > bounds.end;

    // We want to find the reading of last month's cutoff date (R_start) and this month's cutoff date (R_end)
    // Find the latest reading on/before start cutoff
    const startReadingObj = sorted.reduce((best: Reading | null, r) => {
      const rDate = r.date.toDate();
      if (rDate <= bounds.start) {
        if (!best || rDate > best.date.toDate()) {
          return r;
        }
      }
      return best;
    }, null);

    // Find the latest reading on/before the end cutoff (or now if not completed)
    const activeEndLimit = isCompleted ? bounds.end : now;
    const endReadingObj = sorted.reduce((best: Reading | null, r) => {
      const rDate = r.date.toDate();
      if (rDate <= activeEndLimit) {
        if (!best || rDate > best.date.toDate()) {
          return r;
        }
      }
      return best;
    }, null);

    if (startReadingObj && endReadingObj && endReadingObj.readingValue >= startReadingObj.readingValue) {
      const startVal = startReadingObj.readingValue;
      const endVal = endReadingObj.readingValue;
      const consumedUnits = endVal - startVal;

      cycles.push({
        monthLabel: format(bounds.end, 'MMM yyyy'),
        startCutoffDate: bounds.start,
        endCutoffDate: bounds.end,
        startReadingVal: startVal,
        endReadingVal: endVal,
        units: consumedUnits,
        isCompleted,
        isProtected: consumedUnits <= threshold,
      });
    } else if (endReadingObj && sorted.length > 0) {
      // Fallback for the very first cycle in history which might not have a prior cutoff reading
      const firstReading = sorted[0];
      const endVal = endReadingObj.readingValue;
      const startVal = firstReading.readingValue;
      const consumedUnits = endVal - startVal;

      cycles.push({
        monthLabel: format(bounds.end, 'MMM yyyy'),
        startCutoffDate: bounds.start,
        endCutoffDate: bounds.end,
        startReadingVal: startVal,
        endReadingVal: endVal,
        units: Math.max(0, consumedUnits),
        isCompleted,
        isProtected: Math.max(0, consumedUnits) <= threshold,
      });
    }
  }

  return cycles;
}

// Daily consumption: Last day meter reading subtracted by today's last meter reading is the daily consumption.
export interface DailyConsumptionData {
  dateStr: string; // e.g. "May 15"
  date: Date;
  readingValue: number;
  consumed: number;
}

export function computeDailyConsumption(readings: Reading[]): DailyConsumptionData[] {
  if (readings.length === 0) return [];

  // Sort readings chronologically
  const sorted = [...readings].sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

  // Group readings by day, keeping the last reading of each day
  const dailyLastMap = new Map<string, Reading>();
  sorted.forEach(r => {
    const dayKey = format(r.date.toDate(), 'yyyy-MM-dd');
    dailyLastMap.set(dayKey, r);
  });

  const uniqueDays = Array.from(dailyLastMap.keys()).sort();
  const dailyData: DailyConsumptionData[] = [];

  for (let i = 0; i < uniqueDays.length; i++) {
    const currentDayStr = uniqueDays[i];
    const currentReading = dailyLastMap.get(currentDayStr)!;
    let consumed = 0;

    if (i > 0) {
      const prevDayStr = uniqueDays[i - 1];
      const prevReading = dailyLastMap.get(prevDayStr)!;
      consumed = currentReading.readingValue - prevReading.readingValue;
    } else {
      // First day in record defaults to its entry units
      consumed = currentReading.units;
    }

    dailyData.push({
      dateStr: format(currentReading.date.toDate(), 'MMM d'),
      date: currentReading.date.toDate(),
      readingValue: currentReading.readingValue,
      consumed: Math.max(0, consumed)
    });
  }

  // Return reverse-chronological or chronological as needed (chronological for graphs, reverse for lists)
  return dailyData;
}

export interface PacingData {
  daysElapsed: number;
  totalDays: number;
  progressPercent: number;
  projectedUnits: number;
  isPacingUnsafe: boolean;
  dailyRate: number;
}

export function calculatePacing(
  currentCycleUnits: number,
  startDate: Date,
  endDate: Date,
  threshold: number
): PacingData {
  const now = new Date();
  // Bound current date to make sure it doesn't exceed the end of cycle
  const current = now > endDate ? endDate : now;
  
  // Calculate difference in days (at least 1 day to avoid divide by zero)
  const daysElapsed = Math.max(1, differenceInDays(current, startDate));
  const totalDays = Math.max(1, differenceInDays(endDate, startDate));
  const progressPercent = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  
  const dailyRate = currentCycleUnits / daysElapsed;
  const projectedUnits = dailyRate * totalDays;
  const isPacingUnsafe = projectedUnits > threshold;
  
  return {
    daysElapsed,
    totalDays,
    progressPercent,
    projectedUnits,
    isPacingUnsafe,
    dailyRate
  };
}

