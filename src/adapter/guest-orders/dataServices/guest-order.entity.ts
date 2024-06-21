import { mongo } from '@basaldev/blocks-backend-sdk';
import { defaultAdapter } from '@basaldev/blocks-order-service';
import { GuestOrder, GuestOrderCreation, ProductItem, GuestOrderCustomer } from '../types';

export class GuestOrderEntity extends mongo.BaseMongoEntity implements GuestOrder {
  constructor(obj: GuestOrderCreation) {
    super();
    this.organizationId = obj.organizationId;
    this.lineItems = obj.lineItems;
    this.customer = obj.customer;
    this.status = obj.status;
    this.cancelReason = obj.cancelReason;
    this.closedAt = obj.closedAt;
    this.canceledAt = obj.canceledAt;
    this.customFields = obj.customFields;
  }

  /** Unique identifier for the organization this order is linked to */
  organizationId: string;
  /** List of line items in the order */
  lineItems: ProductItem[];
  /** Customer info for the order */
  customer: GuestOrderCustomer;
  /** Status of the order */
  status: defaultAdapter.Status;
  /** Reason for the order being canceled (null if not cancelled) */
  cancelReason: defaultAdapter.CancelReason | null;
  /** Date the order was closed (null if not closed) */
  closedAt: Date | null;
  /** Date the order was canceled (null if not canceled) */
  canceledAt: Date | null;
  /** Custom fields for the order */
  customFields?: Record<string, unknown>;
}