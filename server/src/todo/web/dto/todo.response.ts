export interface TodoResponse {
  readonly id: string;
  readonly text: string;
  readonly completed: boolean;
  readonly date: string | null;
  readonly time: string | null;
  readonly createdAt: number;
  readonly recurrenceGroupId: string | null;
  readonly listId: string | null;
  readonly month: string | null;
  readonly updatedAt: number;
}
