import { defaultAdapter } from '@basaldev/blocks-order-service';
import {
  ProductResponse,
  Organization,
 } from '@basaldev/blocks-default-adapter-api';
import { util, adapter, mongo, security } from '@basaldev/blocks-backend-sdk';

export interface GuestOrderAdapter extends adapter.Adapter {
  createGuestOrder: adapter.HandlerAndValidators;
  getGuestOrder: adapter.HandlerAndValidators;
  listGuestOrdersForOrganization: adapter.HandlerAndValidators;
}

export interface GuestOrderAdapterOptions {
  /** Secret use to encrypt the JWT Token */
  authEncSecret: string;
  /** Secret use to sign the JWT Token */
  authSignSecret: string;
  /**
   * Function that will be called to authenticate the user via validators. When
   * not provided, this will default to the default for the given authType.
   *
   * Typically you would only provide this if designing your own authentication.
   */
  authenticate?: security.AuthenticationFunction;
  /** Custom field configuration for each data type */
  customFields?: {
      order?: util.CustomField[];
  };
  /** Default pagination configuration for each of the list endpoints */
  paginationConfiguration?: adapter.PaginationConfigurations;
  /**
   * Endpoints for different services
   * Used in the API when returning links to services.
   */
  serviceEndpoints: {
      guestOrder: string;
  };
}

export interface CreateGuestOrderRequest extends util.WithCustomFields {
  customer: GuestOrderCustomer;
  items: defaultAdapter.ItemRequest[];
  status?: defaultAdapter.Status;
}

export interface ProductItem {
  productId: string;
  productName: string;
  quantity: number;
  sku: string;
  variantId: string;
  variantTitle: string;
};

export type GuestOrderCreation = {
  cancelReason: defaultAdapter.CancelReason | null;
  canceledAt: Date | null;
  closedAt: Date | null;
  customer: GuestOrderCustomer;
  lineItems: ProductItem[];
  organizationId: string;
  status: defaultAdapter.Status;
} & util.WithCustomFields;

export type GuestOrder = {
  id: string;
} & GuestOrderCreation;

export type GuestOrderCustomer = Omit<defaultAdapter.Customer, 'userId'>;

export type NormalizedProductItem = {
  product: string;
  productName: string;
  quantity: number;
  sku: string;
  variant: string;
  variantTitle: string;
};

export interface NormalizedGuestOrder {
  cancelReason: defaultAdapter.CancelReason | null;
  canceledAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  customer: GuestOrderCustomer;
  customFields?: Record<string, unknown>;
  id: string;
  lineItems: NormalizedLineItem[];
  organization: string | Organization;
  status: defaultAdapter.Status;
  updatedAt: Date;
};

export interface NormalizedLineItem {
  product: string | ProductResponse;
  productName: string;
  quantity: number;
  sku: string;
  variants: string | GuestOrderProductVariant;
  variantTitle: string;
};

export type GuestOrderProductVariant = {
  description: string;
  sku: string;
  title: string;
  id: string;
  productId: string;
} & util.WithCustomFields;
