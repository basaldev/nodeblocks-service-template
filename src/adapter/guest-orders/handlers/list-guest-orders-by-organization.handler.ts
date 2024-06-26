import {
  Logger,
  adapter,
  util,
} from '@basaldev/blocks-backend-sdk';
import { GuestOrderDataService } from '../dataServices';
import { get } from 'lodash';
import { ok } from 'assert';

/**
 * Get guest orders for organization handler
 *
 * @group Handlers
 *
 * @description This handler is used to get guest orders for an organization by applying the following steps in sequence:
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
  paginationConfiguration: adapter.PaginationConfigurations,
  logger: Logger,
  context: adapter.AdapterHandlerContext
) {
  logger.info('listOrdersForOrganizationHandler');
  const { params, headers, reqInfo, query } = context;
  const orgId = params?.orgId;
  ok(orgId, 'orgId is missing in params');

  const { defaultOffset, defaultPageSize, maxPageSize } =
    paginationConfiguration;

  const parsedListQuery = util.parsePaginatedListQuery(query ?? {}, {
    forcePagination: true,
    limit: defaultPageSize,
    maxPageSize,
    offset: defaultOffset,
  });

  const paginatedGuestOrders = await guestOrderService.getPaginatedGuestOrdersByOrgId(
    orgId,
    parsedListQuery
  );

  const expandedGuestOrder = await guestOrderService.prepareGuestOrderResponse(
    get(context, 'query.$expand', '').toString(),
    paginatedGuestOrders.result
  );

  return {
    data: {
      '@nextLink': util.buildNextLink(
        headers.host ?? reqInfo.host,
        reqInfo.url,
        paginatedGuestOrders.nextToken,
        parsedListQuery.pagination.limit
      ),
      '@previousLink': util.buildPreviousLink(
        headers.host ?? reqInfo.host,
        reqInfo.url,
        paginatedGuestOrders.previousToken,
        parsedListQuery.pagination.limit
      ),
      count: paginatedGuestOrders.count,
      total: paginatedGuestOrders.total,
      value: expandedGuestOrder,
    },
    status: util.StatusCodes.OK,
  };
}
