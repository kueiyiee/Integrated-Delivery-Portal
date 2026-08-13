export const DeliveryStatus = {
  Pending: 'pending',
  Assigned: 'assigned',
  InTransit: 'in_transit',
  PickedUp: 'picked_up',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
  Failed: 'failed',
} as const;

export type DeliveryStatus = typeof DeliveryStatus[keyof typeof DeliveryStatus];

export const DELIVERY_STATUSES: DeliveryStatus[] = Object.values(DeliveryStatus);

export const DELIVERY_OPEN_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.Pending,
  DeliveryStatus.Assigned,
  DeliveryStatus.InTransit,
  DeliveryStatus.PickedUp,
];

export const DELIVERY_CLOSED_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.Delivered,
  DeliveryStatus.Cancelled,
  DeliveryStatus.Failed,
];

export const DELIVERY_STATUS_OPTIONS: Array<{ value: DeliveryStatus; label: string }> = [
  { value: DeliveryStatus.Pending, label: 'Pending' },
  { value: DeliveryStatus.Assigned, label: 'Assigned' },
  { value: DeliveryStatus.InTransit, label: 'In transit' },
  { value: DeliveryStatus.PickedUp, label: 'Picked up' },
  { value: DeliveryStatus.Delivered, label: 'Delivered' },
  { value: DeliveryStatus.Cancelled, label: 'Cancelled' },
  { value: DeliveryStatus.Failed, label: 'Failed' },
];

export function isValidDeliveryStatus(status: string): status is DeliveryStatus {
  return DELIVERY_STATUSES.includes(status as DeliveryStatus);
}

export function getDeliveryStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return 'Pending';
  }

  const normalized = String(status).trim();
  if (!normalized) {
    return 'Pending';
  }

  return normalized
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}
