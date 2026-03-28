export class TodoResponse {
  readonly id: string;
  readonly text: string;
  readonly completed: boolean;
  readonly date: string;
  readonly time: string | null;
  readonly createdAt: number;
  readonly recurrenceGroupId: string | null;

  constructor(
    id: string,
    text: string,
    completed: boolean,
    date: string,
    time: string | null,
    createdAt: number,
    recurrenceGroupId: string | null,
  ) {
    this.id = id;
    this.text = text;
    this.completed = completed;
    this.date = date;
    this.time = time;
    this.createdAt = createdAt;
    this.recurrenceGroupId = recurrenceGroupId;
  }
}
