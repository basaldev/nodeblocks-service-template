import { defaultAdapter } from '@basaldev/blocks-order-service';
import {
  Logger,
  adapter,
  util,
  NBError,
} from '@basaldev/blocks-backend-sdk';
import { GuestOrderDataService } from '../dataServices';
import { get } from 'lodash';
import { ok } from 'assert';

/**
 * Get guest orders for organization handler
 *
 * @group Handlers
 *
 * @description This handler is used to get orders for an organization by applying the following steps in sequence:
 *
 * 1. Checks orgId provided
 *
 * 2. Performs pagination query using query params
 *
 * 3. Applies expansion using query params
 *
 * 4. Returns paginated list
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
 * - `params.orgId` is required
 *
 * @throws Error
 * - orgId is missing in params
 *
 * @throws 400 NBError Bad Request
 *
 * @returns 200 Status OK
 * - data: paginated list of orders
 */
export async function listOrdersForOrganizationHandler(
  guestOrderService: Pick<GuestOrderDataService, 'getPaginatedGuestOrdersByOrgId' | 'prepareGuestOrderResponse'>,
  paginatedListQueryOptions: util.ParsePaginatedListQueryOptions,
  logger: Logger,
  context: adapter.AdapterHandlerContext
) {
  logger.info('listOrdersForOrganizationHandler');
  const { params, reqInfo, query } = context;
  const orgId = params?.orgId;
  ok(orgId, 'orgId is missing in params');
  const paginatedListOptions = util.parsePaginatedListQuery(
    query || {},
    paginatedListQueryOptions
  );

  if (paginatedListOptions.pagination.type === 'no-pagination') {
    throw new NBError({
      code: defaultAdapter.ErrorCode.wrongParameter,
      httpCode: util.StatusCodes.BAD_REQUEST,
      message: 'pagination must be set',
    });
  }

  const maxPageSize = paginatedListQueryOptions.maxPageSize || 0;
  if (paginatedListOptions.pagination.limit > maxPageSize) {
    throw new NBError({
      code: defaultAdapter.ErrorCode.wrongParameter,
      httpCode: util.StatusCodes.BAD_REQUEST,
      message: `Page size exceeds ${maxPageSize} mbs`,
    });
  }

  const paginatedGuestOrders = await guestOrderService.getPaginatedGuestOrdersByOrgId(
    orgId,
    paginatedListOptions.filterExpression,
    paginatedListOptions.orderParams ?? [],
    paginatedListOptions.pagination
  );
  const expandedGuestOrder = await guestOrderService.prepareGuestOrderResponse(
    get(context, 'query.$expand', '').toString(),
    paginatedGuestOrders.result
  );

  return {
    data: {
      '@nextLink': paginatedGuestOrders.nextToken
        ? util.buildNextLink(
            reqInfo.host,
            reqInfo.url,
            paginatedGuestOrders.nextToken,
            paginatedListOptions?.pagination.limit
          )
        : '',
      '@previousLink': paginatedGuestOrders.previousToken
        ? util.buildPreviousLink(
            reqInfo.host,
            reqInfo.url,
            paginatedGuestOrders.previousToken,
            paginatedListOptions?.pagination.limit
          )
        : '',
      count: paginatedGuestOrders.count,
      total: paginatedGuestOrders.total,
      value: expandedGuestOrder,
    },
    status: util.StatusCodes.OK,
  };
}
