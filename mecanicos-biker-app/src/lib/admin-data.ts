export type {
  AppointmentStatus,
  OrderStatus,
  PaymentMethod,
  ProductCategory,
  Appointment,
  OrderItem,
  Order,
  Product,
  Customer,
  RewardItem,
  WeeklyDaySchedule,
  ScheduleOverride,
  Testimonial,
  TestimonialStatus,
  SecondHandItem,
  SecondHandStatus,
} from "@/lib/db";
export { orderTotal } from "@/lib/pricing";
export { REWARD_TIERS, getRewardTier } from "@/lib/rewards";
import type { AppointmentStatus, OrderStatus, ProductCategory } from "@/lib/db";

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  en_proceso: "En proceso",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  componentes: "Componentes",
  accesorios: "Accesorios",
  cuidado: "Cuidado",
  herramientas: "Herramientas",
};
