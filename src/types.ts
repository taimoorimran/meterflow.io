import { Timestamp } from 'firebase/firestore';

export interface Reading {
  id?: string;
  readingValue: number;
  date: Timestamp;
  remarks: string;
  userId: string;
  units: number;
  createdAt: Timestamp;
  isOfficial?: boolean;
}

export interface BillingCycle {
  start: Date;
  end: Date;
  label: string;
}
