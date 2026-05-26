export type ScheduleConflict = { allocationId: string; startTime: Date; endTime: Date };
export type StockConflict = { materialId: string; name: string; available: number; required: number };
export type ConflictDetail = ScheduleConflict | StockConflict;

export class ConflictError extends Error {
  constructor(
    public code: 'OPERATOR_CONFLICT' | 'MACHINE_CONFLICT' | 'INSUFFICIENT_STOCK',
    public conflicts: ConflictDetail[]
  ) {
    super(code);
    this.name = 'ConflictError';
  }
}
