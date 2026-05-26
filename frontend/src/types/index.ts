export type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
export type OperatorStatus = 'AVAILABLE' | 'ASSIGNED' | 'ABSENT';
export type MachineStatus = 'AVAILABLE' | 'RUNNING' | 'MAINTENANCE';
export type Role = 'SUPERVISOR' | 'VIEWER';

export interface WorkOrder {
  id: string;
  orderNumber: string;
  title: string;
  status: WorkOrderStatus;
  scheduledStart: string;
  scheduledEnd: string;
  targetQty: number;
}

export interface Operator {
  id: string;
  employeeId: string;
  name: string;
  skills: string[];
  status: OperatorStatus;
}

export interface Machine {
  id: string;
  machineCode: string;
  name: string;
  type: string;
  status: MachineStatus;
}

export interface Material {
  id: string;
  sku: string;
  name: string;
  unitOfMeasure: string;
  quantityOnHand: number;
}

export interface AllocationMaterial {
  materialId: string;
  quantityRequired: number;
  material?: Material;
}

export interface Allocation {
  id: string;
  workOrderId: string;
  operatorId: string | null;
  machineId: string | null;
  startTime: string;
  endTime: string;
  createdById: string;
  operator?: Operator;
  machine?: Machine;
  materials?: AllocationMaterial[];
  workOrder?: WorkOrder;
}

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
}
