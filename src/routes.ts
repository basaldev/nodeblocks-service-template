import { GuestOrderAdapter } from './adapter/guest-orders/types';

import { util } from '@basaldev/blocks-backend-sdk';

export function predefinedRoutes(adapter: GuestOrderAdapter) {
  return [
    util.createRoute({
      method: 'get',
      path: '/orgs/:orgId/guest/orders',
      ...adapter.listGuestOrdersForOrganization,
    }),
    util.createRoute({
      method: 'get',
      path: '/orgs/:orgId/guest/orders/:orderId',
      ...adapter.getGuestOrder,
    }),
    util.createRoute({
      method: 'post',
      path: '/orgs/:orgId/guest/orders',
      ...adapter.createGuestOrder,
    }),
  ];
}
