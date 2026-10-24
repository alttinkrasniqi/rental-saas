import { Badge } from "@/components/ui/badge";
import {
  VEHICLE_STATUS_META,
  RENTAL_STATUS_META,
  PAYMENT_STATE_META,
} from "@/lib/constants";
import type { RentalStatus, VehicleStatus } from "@/lib/types";
import { paymentState } from "@/lib/format";
import { cn } from "@/lib/utils";

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const meta = VEHICLE_STATUS_META[status];
  return <Badge className={meta.badge}>{meta.label}</Badge>;
}

export function RentalStatusBadge({ status }: { status: RentalStatus }) {
  const meta = RENTAL_STATUS_META[status];
  return <Badge className={meta.badge}>{meta.label}</Badge>;
}

export function PaymentStatusBadge({
  paid_cents,
  total_cents,
}: {
  paid_cents: number;
  total_cents: number;
}) {
  const meta = PAYMENT_STATE_META[paymentState({ paid_cents, total_cents })];
  return <Badge className={meta.badge}>{meta.label}</Badge>;
}

export function StatusDot({ status }: { status: VehicleStatus }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", VEHICLE_STATUS_META[status].dot)} />;
}
