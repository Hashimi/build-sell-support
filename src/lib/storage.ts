// Repository layer over localStorage. Swap implementation later for HTTP/MySQL.
import { useEffect, useState, useSyncExternalStore } from "react";

export interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material extends Entity {
  name: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  supplier?: string;
  purchaseDate: string;
  notes?: string;
}

export interface Worker extends Entity {
  name: string;
  role: string;
  phone?: string;
  dailyWage: number;
  hireDate: string;
  active: boolean;
}

export interface Salary extends Entity {
  workerId: string;
  period: string; // YYYY-MM
  daysWorked: number;
  amount: number;
  paid: boolean;
  payDate?: string;
  notes?: string;
}

export interface Expense extends Entity {
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: "cash" | "bank";
  project?: string;
}

export type FloorPurpose = "residential" | "parking" | "commercial" | "storage" | "amenity" | "mixed";

export interface Building extends Entity {
  name: string;
  address?: string;
  floorsCount: number;
  notes?: string;
}

export interface Floor extends Entity {
  buildingId: string;
  floorNumber: number;
  /** Display label, e.g. "B1", "GF", "1", "M". Falls back to floorNumber. */
  label?: string;
  purpose: FloorPurpose;
  notes?: string;
}

export interface ParkingSlot extends Entity {
  buildingId: string;
  floorId: string;
  slotNo: string;
  status: "available" | "assigned" | "sold";
  assignedClientId?: string;
  monthlyFee?: number;
  notes?: string;
}

export type ShopStatus = "available" | "rented" | "sold";

export interface Shop extends Entity {
  buildingId: string;
  floorId: string;
  shopNo: string;
  area: number;
  monthlyRent: number;
  salePrice: number;
  status: ShopStatus;
  clientId?: string;
  startDate?: string;
  notes?: string;
}

export interface ShopPayment extends Entity {
  shopId: string;
  clientId?: string;
  amount: number;
  date: string;
  type: "rent" | "sale" | "deposit" | "other";
  period?: string; // YYYY-MM for rent
  notes?: string;
}

export interface Apartment extends Entity {
  buildingId?: string;
  floorId?: string;
  block: string;
  floor: number;
  apartmentNo: string;
  rooms: number; // bedrooms
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  area: number;
  price: number;
  status: "available" | "sold" | "reserved";
  purpose?: FloorPurpose;
  notes?: string;
}

export interface Client extends Entity {
  name: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface InstallmentEntry {
  no: number;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  paid: boolean;
  paidDate?: string;
}

export interface Sale extends Entity {
  clientId: string;
  apartmentId: string;
  salePrice: number;
  paidAmount: number;
  date: string;
  installmentsCount?: number; // 0 or undefined = no installments
  installments?: InstallmentEntry[];
  notes?: string;
}

export interface ServiceRequest extends Entity {
  clientId: string;
  apartmentId: string;
  issue: string;
  priority: "low" | "medium" | "high";
  status: "open" | "inProgress" | "completed";
  assignedWorkerId?: string;
  notes?: string;
}

type StoreMap = {
  materials: Material;
  workers: Worker;
  salaries: Salary;
  expenses: Expense;
  buildings: Building;
  floors: Floor;
  apartments: Apartment;
  parkingSlots: ParkingSlot;
  shops: Shop;
  shopPayments: ShopPayment;
  clients: Client;
  sales: Sale;
  requests: ServiceRequest;
};

export type StoreKey = keyof StoreMap;

const PREFIX = "cre.v1.";
const listeners = new Map<StoreKey, Set<() => void>>();

function emit(key: StoreKey) {
  listeners.get(key)?.forEach((fn) => fn());
}

function read<K extends StoreKey>(key: K): StoreMap[K][] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as StoreMap[K][]) : [];
  } catch {
    return [];
  }
}

function write<K extends StoreKey>(key: K, items: StoreMap[K][]) {
  localStorage.setItem(PREFIX + key, JSON.stringify(items));
  emit(key);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const repo = {
  list<K extends StoreKey>(key: K): StoreMap[K][] {
    return read(key);
  },
  get<K extends StoreKey>(key: K, id: string): StoreMap[K] | undefined {
    return read(key).find((x) => x.id === id);
  },
  add<K extends StoreKey>(key: K, data: Omit<StoreMap[K], keyof Entity>): StoreMap[K] {
    const now = new Date().toISOString();
    const item = { ...(data as object), id: uid(), createdAt: now, updatedAt: now } as StoreMap[K];
    write(key, [item, ...read(key)]);
    return item;
  },
  update<K extends StoreKey>(key: K, id: string, patch: Partial<StoreMap[K]>) {
    const items = read(key).map((x) =>
      x.id === id ? ({ ...x, ...patch, updatedAt: new Date().toISOString() } as StoreMap[K]) : x,
    );
    write(key, items);
  },
  remove<K extends StoreKey>(key: K, id: string) {
    write(
      key,
      read(key).filter((x) => x.id !== id),
    );
  },
  subscribe(key: StoreKey, fn: () => void) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    return () => listeners.get(key)!.delete(fn);
  },
};

export function useCollection<K extends StoreKey>(key: K): StoreMap[K][] {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const data = useSyncExternalStore(
    (cb) => repo.subscribe(key, cb),
    () => JSON.stringify(read(key)),
    () => "[]",
  );
  if (!hydrated) return [];
  return JSON.parse(data) as StoreMap[K][];
}
