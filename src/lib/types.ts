export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  createdAt: number;
  recurrenceGroupId?: string; // links all instances of a recurring todo
}

export interface RecurrenceConfig {
  type: RecurrenceType;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
}
