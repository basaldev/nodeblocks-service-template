import { defaultAdapter } from '@basaldev/blocks-order-service';
import { GuestOrderDataService } from '../dataServices/guest-order.dataServices';
import {
  Logger,
  adapter,
  util,
  NBError,
} from '@basaldev/blocks-backend-sdk';
import { get } from 'lodash';

/**
 * Get guest order handler
 *
 * @group Handlers
 *
 * @description This handler is used to get a guest order by applying the following steps in sequence:
 *
 * 1. Fetches order (orderService.getOneOrder)
 *
 * 2. Normalize data and expand if any
 *
 * 3. Return guest order data and status
 *
 * @param guestOrderService injected service use to handle guest order related operations
 *
 * @param logger injected logger use to handle logging
 *
 * @param context request context [headers, body, params, query].
 * - `params.orderId` is required
 *
 * @throws 404 NBError Not Found
 * - operation failed to get an order
 *
 * @throws 500 NBError Internal Server Error
 * - failed to get a guest order
 *
 * @returns 200 Status OK
 */
export async function getGuestOrderHandler(
  guestOrderService: Pick<GuestOrderDataService, 'getOneGuestOrderByOrgId' | 'prepareGuestOrderResponse'>,
  logger: Logger,
  context: adapter.AdapterHandlerContext
) {
  logger.info('getGuestOrderHandler');
  const { params } = context;
  const guestOrder = await guestOrderService.getOneGuestOrderByOrgId(params?.orderId, params?.orgId);
  if (!guestOrder) {
    throw new NBError({
      code: defaultAdapter.ErrorCode.notFound,
      httpCode: util.StatusCodes.NOT_FOUND,
      message: 'operation failed to get an order',
    });
  }

  const expandedGuestOrder = await guestOrderService.prepareGuestOrderResponse(
    get(context, 'query.$expand', '').toString(),
    guestOrder
  );

  return {
    data: expandedGuestOrder,
    status: util.StatusCodes.OK,
  };
}
