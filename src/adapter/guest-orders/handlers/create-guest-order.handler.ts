import { defaultAdapter } from '@basaldev/blocks-order-service';
import {
  Logger,
  util,
  adapter,
  NBError,
} from '@basaldev/blocks-backend-sdk';
import {
  CatalogDefaultAdapterAPI,
  OrganizationDefaultAdapterAPI,
} from '@basaldev/blocks-default-adapter-api';
import { get } from 'lodash';
import {
  ProductItem,
  GuestOrderCreation,
} from '../types';
import { GuestOrderDataService } from '../dataServices/guest-order.dataServices';
import {
  getVariantFromProductId,
  prepareGuestOrderResponse
} from '../utils';

export async function createGuestOrderHandler(
  orderService: Pick<GuestOrderDataService, 'createOrder' | 'getOneOrder'>,
  catalogServiceAPI: Pick<CatalogDefaultAdapterAPI, 'getAvailableProducts' | 'getOneProduct'>,
  organizationServiceAPI: Pick<OrganizationDefaultAdapterAPI, 'getOrganizationById'>,
  orderCustomFieldDefinitions: util.CustomField[],
  logger: Logger,
  context: adapter.AdapterHandlerContext
) {
  logger.info('createGuestOrderHandler');
  const body = context.body as defaultAdapter.CreateOrderRequestBody;
  const { orgId } = context.params as defaultAdapter.CreateOrderRequestParams;

  const productIdFilter = body.items
    .map((item) => `'${item.productId}'`)
    .join(',');
  const productResult = await catalogServiceAPI.getAvailableProducts({
    queryOptions: {
      expand: 'variants',
      filter: `organizationId eq '${orgId}' and id in [${productIdFilter}]`,
      top: body.items.length,
    },
  });

  const variantsByProductId = body.items.reduce<ProductItem[]>((prev, item) => {
      return prev.concat(getVariantFromProductId(item, productResult.value));
    }, []);

  const guestOrderPayload: GuestOrderCreation = {
    cancelReason: null,
    canceledAt: null,
    closedAt: null,
    customFields: body.customFields,
    customer: body.customer,
    lineItems: variantsByProductId,
    organizationId: orgId,
    status: defaultAdapter.Status.PENDING,
  };

  const createdGuestOrder = await orderService.createOrder(guestOrderPayload);
  const guestOrder = await orderService.getOneOrder(createdGuestOrder.id);
  if (!guestOrder) {
    throw new NBError({
      code: defaultAdapter.ErrorCode.internalServerError,
      httpCode: util.StatusCodes.INTERNAL_SERVER_ERROR,
      message: 'operation failed to create order',
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
    status: util.StatusCodes.CREATED,
  };
}
