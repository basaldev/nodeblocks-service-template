import { defaultAdapter } from '@basaldev/blocks-order-service';
import { GuestOrderDataService } from '../dataServices/guest-order.dataServices';
import {
  Logger,
  adapter,
  util,
  NBError,
} from '@basaldev/blocks-backend-sdk';
import {
  CatalogDefaultAdapterAPI,
  OrganizationDefaultAdapterAPI,
} from '@basaldev/blocks-default-adapter-api';
import { get } from 'lodash';
import { prepareGuestOrderResponse } from '../utils';

/**
 * Get order handler
 *
 * @group Handlers
 *
 * @description This handler is used to get an order by applying the following steps in sequence:
 *
 * 1. Checks orderId provided
 *
 * 2. Fetches order (orderService.getOneOrder)
 *
 * 3. Return order data (expand if any)
 *
 * @param userServiceAPI injected API use to handle user related operations
 *
 * @param catalogServiceAPI injected API use to handle catalog related operations
 *
 * @param organizationServiceAPI injected API use to handle organization related operations
 *
 * @param orderService injected service use to handle order related operations
 *
 * @param logger injected logger use to handle logging
 *
 * @param context request context [headers, body, params, query].
 * - `params.orderId` is required
 *
 * @throws 400 NBError Bad Request
 * - missing parameter orderId
 *
 * @throws 404 NBError Not Found
 * - operation failed to get an order
 *
 * @throws 500 NBError Internal Server Error
 * - failed to get an order orderId:${params?.orderId}
 *
 * @returns 200 Status OK
 */
export async function getGuestOrderHandler(
  orderService: Pick<GuestOrderDataService, 'getOneGuestOrderByOrgId'>,
  catalogServiceAPI: Pick<CatalogDefaultAdapterAPI, 'getOneProduct'>,
  organizationServiceAPI: Pick<OrganizationDefaultAdapterAPI, 'getOrganizationById'>,
  orderCustomFieldDefinitions: util.CustomField[],
  logger: Logger,
  context: adapter.AdapterHandlerContext
) {
  logger.info('getGuestOrderHandler');
  const { params } = context;
  const guestOrder = await orderService.getOneGuestOrderByOrgId(params?.orderId, params?.orgId);
  if (!guestOrder) {
    throw new NBError({
      code: defaultAdapter.ErrorCode.notFound,
      httpCode: util.StatusCodes.NOT_FOUND,
      message: 'operation failed to get an order',
    });
  }

  const expandedGuestOrder = await prepareGuestOrderResponse(
    get(context, 'query.$expand', '').toString(),
    guestOrder,
    orderCustomFieldDefinitions,
    organizationServiceAPI,
    catalogServiceAPI
  );

  return {
    data: expandedGuestOrder,
    status: util.StatusCodes.OK,
  };
}
