const STATUS_BADGE_CLASSES = {
  pending: "order-badge--status-pending",
  preparing: "order-badge--status-preparing",
  delivered: "order-badge--status-delivered",
  cancelled: "order-badge--status-cancelled",
  default: "order-badge--status-default"
};

const PAYMENT_BADGE_CLASSES = {
  pending_payment: "order-badge--payment-pending",
  paid: "order-badge--payment-paid",
  pending: "order-badge--payment-pending",
  failed: "order-badge--payment-failed",
  refunded: "order-badge--payment-refunded",
  cancelled: "order-badge--payment-cancelled",
  default: "order-badge--payment-default"
};

function normalizeBadgeValue(value) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return String(value);
}

function getStatusBadgeClass(status) {
  const normalizedStatus = normalizeBadgeValue(status).toLowerCase();

  return STATUS_BADGE_CLASSES[normalizedStatus] || STATUS_BADGE_CLASSES.default;
}

function getPaymentBadgeClass(paymentStatus) {
  const normalizedPaymentStatus = normalizeBadgeValue(paymentStatus)
    .toLowerCase()
    .replace(/^pending$/, "pending_payment");

  return PAYMENT_BADGE_CLASSES[normalizedPaymentStatus] || PAYMENT_BADGE_CLASSES.default;
}

export default function OrderBadges({
  status,
  paymentStatus,
  paymentMethod
}) {
  const statusValue = normalizeBadgeValue(status);
  const paymentStatusValue = normalizeBadgeValue(paymentStatus);
  const paymentMethodValue = normalizeBadgeValue(paymentMethod);

  return (
    <div className="order-badge-row">
      <span
        className={`order-badge order-badge--status ${getStatusBadgeClass(
          statusValue
        )}`}
      >
        {statusValue}
      </span>

      <span
        className={`order-badge order-badge--payment ${getPaymentBadgeClass(
          paymentStatusValue
        )}`}
      >
        <span className="order-badge__label">Payment:</span>
        <span className="order-badge__value">{paymentStatusValue}</span>
      </span>

      <span className="order-badge order-badge--method">
        <span className="order-badge__label">Method:</span>
        <span className="order-badge__value">{paymentMethodValue}</span>
      </span>
    </div>
  );
}
