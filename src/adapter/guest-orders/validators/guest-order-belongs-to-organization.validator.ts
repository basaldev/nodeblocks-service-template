import { defaultAdapter } from '@basaldev/blocks-order-service';
import { GuestOrderDataService } from '../dataServices';
import {
  util,
  adapter,
  Logger,
  NBError,
  security,
} from '@basaldev/blocks-backend-sdk';
import { OrganizationDefaultAdapterAPI } from '@basaldev/blocks-default-adapter-api';
import { get } from 'lodash';

/**
 * Order belongs to organization validator
 *
 * @group Validators
 *
 * @description This validator checks if the order belongs to the organization by applying the following steps in sequence:
 *
 * 1. Get orgId from targetField context
 *
 * 2. Check if organization exists
 *
 * 3. Get orderId from targetField context
 *
 * 4. Check if order exists
 *
 * 3. Check if order has the same organization ID as the organization in targetField
 *
 * @param guestOrderService injected order service to get order
 *
 * @param organizationAPI injected API use to get organization
 *
 * @param orgIdTargetField injected targetField use to get orgId
 *
 * @param orderIdTargetField injected targetField use to get orderId
 *
 * @param logger injected logger use to handle logging
 *
 * @param context request context [headers, body, params, query].
 *
 * @throws 403 NBError Forbidden
 * - order does not belong to organization
 *
 * @throws 404 NBError Not Found
 * - orgId ${orgId} cannot be found
 * - orderId ${orderId} cannot be found
 *
 * @returns 200 Status OK
 */
export async function guestOrderBelongsToOrganization(
  guestOrderService: Pick<GuestOrderDataService, 'getOneOrder'>,
  organizationAPI: Pick<OrganizationDefaultAdapterAPI, 'getOrganizationById'>,
  orgIdTargetField: security.TargetField,
  orderIdTargetField: security.TargetField,
  logger: Logger,
  context: adapter.AdapterHandlerContext
) {
  const organizationId = get(
    context,
    [orgIdTargetField.type, orgIdTargetField.name],
    null
  );
  const organization = await organizationAPI.getOrganizationById(
    organizationId
  );
  if (!organization) {
    throw new NBError({
      code: defaultAdapter.ErrorCode.notFound,
      httpCode: util.StatusCodes.NOT_FOUND,
      message: `orgId ${organizationId} cannot be found`,
    });
  }

  const orderId = get(
    context,
    [orderIdTargetField.type, orderIdTargetField.name],
    null
  );
  const order = await guestOrderService.getOneOrder(orderId);
  if (!order) {
    throw new NBError({
      code: defaultAdapter.ErrorCode.notFound,
      httpCode: util.StatusCodes.NOT_FOUND,
      message: `orderId ${orderId} cannot be found`,
    });
  }

  if (order.organizationId === organization.id) {
    return util.StatusCodes.OK;
  }

  throw new NBError({
    code: defaultAdapter.ErrorCode.noPermission,
    httpCode: util.StatusCodes.FORBIDDEN,
    message: `order: orderId=${orderId} does not belong to organization: orgId=${organizationId}`,
  });
}
