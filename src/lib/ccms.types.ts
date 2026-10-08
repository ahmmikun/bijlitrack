/**
 * Shapes returned by the CCMS/PITC consumer portal, plus the normalised forms
 * the dashboard consumes.
 */

/** Raw feeder payload as returned under `load[0].response.data[0]`. */
export interface CcmsFeederPayload {
  feeder_code?: string | null;
  feeder?: string | null;
  grid?: string | null;
  current_status?: string | null;
  current_status_time?: string | null;
  expected_restoration_time?: string | null;
  voltage?: number;
  current?: number;
  active_power_kW?: number;
  power_factor?: number;
  event_logs?: unknown[];
  maintenance_sch?: unknown[];
  tripping?: number[];
  history_data?: Record<string, unknown>;
  maintenance_data?: Record<string, unknown>;
}

/** Restoration metadata, which CCMS nests under a separate `feeder` key. */
export interface CcmsFeederMeta {
  time?: string | null;
  date?: string | null;
  duration?: string | null;
}

export interface ParsedDayOutage {
  date: string;
  hourlyOutageMinutes: number[];
  totalOutageMinutes: number;
  totalOutageHours: number;
  hourlyStatus: string[];
  isScheduled?: boolean;
}

/** Normalised load/feeder record consumed by the dashboard. */
export interface ParsedLoadInfo {
  feederCode: string | null;
  feederName: string | null;
  gridStation: string | null;
  currentStatus: string | null;
  currentStatusTime: string | null;
  expectedRestorationTime: string | null;
  expectedRestorationDate: string | null;
  expectedRestorationDuration: string | null;
  voltage: number;
  current: number;
  activePower: number;
  powerFactor: number;
  eventLogs: unknown[];
  days: Record<string, ParsedDayOutage>;
  todaySchedule: unknown[];
  tripping: number[];
}

/** Normalised complaint row scraped from the complaint history table. */
export interface ParsedComplaint {
  ticketNo: string;
  status: string;
  reopened: boolean;
  refNo: string;
  nature: string;
  type: string;
  source: string;
  feedback: string;
  history: string[];
}

/** Consumer block returned by the CCMS user details endpoint. */
export interface CcmsUserPayload {
  NAME?: string;
  [key: string]: unknown;
}

/** Bill block returned by the CCMS bill endpoint. */
export interface CcmsBillPayload {
  basicInfo?: {
    netBill?: number;
    billDueDate?: string;
  };
  [key: string]: unknown;
}

/** Live feeder status polled on an interval for the active reference. */
export interface FeederStatusSnapshot {
  currentStatus: string;
  currentStatusTime: string | null;
  expectedRestorationTime: string | null;
  expectedRestorationDate: string | null;
  expectedRestorationDuration: string | null;
  voltage: number;
  powerFactor: number;
  activePower: number;
  feederName: string | null;
}

export interface CcmsBundle {
  user: CcmsUserPayload | null;
  bill: CcmsBillPayload | null;
  loadInfo: ParsedLoadInfo | null;
  errors: {
    user: string | null;
    bill: string | null;
    loadInfo: string | null;
  };
}

export interface RestorationSnapshot {
  expectedRestorationTime: string | null;
  plannedOutage: string | null;
  actualOutage: string | null;
  historyOutage: string | null;
}