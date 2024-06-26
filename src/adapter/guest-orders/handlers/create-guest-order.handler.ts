import { defaultAdapter } from '@basaldev/blocks-order-service';
import {
  Logger,
  util,
  adapter,
  NBError,
} from '@basaldev/blocks-backend-sdk';
import {
  ProductResponse,
  ProductVariantResponse,
} from '@basaldev/blocks-default-adapter-api';
import { get } from 'lodash';
import {
  ProductItem,
  GuestOrderCreation,
} from '../types';
import { GuestOrderDataService } from '../dataServices';

/**
 * Create guest order handler
 *
 * @group Handlers
 *
 * @description This handler is used to create a guest order by applying the following steps in sequence:
 *
 * 1. Get available products from organization (catalogService.getAvailableProducts)
 *
 * 2. Get variants from the products.
 *
 * 3. Create guest order (guestOrderService.createOrder)
 *
 * 4. Fetches guest order (guestOrderService.getOneOrder)
 *
 * 5. Normalize guest order and expand if any
 *
 * 6. Return guest order data
 *
 * @param guestOrderService injected service use to handle guest order related operations
 *
 * @param logger injected logger use to handle logging
 *
 * @param context request context [headers, body, params, query].
 * - `params.orgId` is required
 *
 * @throws 400 NBError Bad Request
 * - wrong variant
 *
 * @throws 500 NBError Internal Server Error
 * - operation failed to create a guest order
 *
 * @returns 201 Status Create
 * - data: guest order data
 */
export async function createGuestOrderHandler(
  guestOrderService: Pick<
    GuestOrderDataService, 'createOrder' | 'getOneOrder'| 'prepareGuestOrderResponse' | 'catalogService'
  >,
  logger: Logger,
  context: adapter.AdapterHandlerContext
) {
  logger.info('createGuestOrderHandler');
  const body = context.body as defaultAdapter.CreateOrderRequestBody;
  const { orgId } = context.params as defaultAdapter.CreateOrderRequestParams;

  const productIdFilter = body.items
    .map((item) => `'${item.productId}'`)
    .join(',');
  const productResult = await guestOrderService.catalogService.getAvailableProducts({
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

  const createdGuestOrder = await guestOrderService.createOrder(guestOrderPayload);
  const guestOrder = await guestOrderService.getOneOrder(createdGuestOrder.id);
  if (!guestOrder) {
    throw new NBError({
      code: defaultAdapter.ErrorCode.internalServerError,
      httpCode: util.StatusCodes.INTERNAL_SERVER_ERROR,
      message: 'operation failed to create order',
    });
  }

  const expandedGuestOrder = await guestOrderService.prepareGuestOrderResponse(
    get(context, 'query.$expand', '').toString(),
    guestOrder
  );

  return {
    data: expandedGuestOrder,
    status: util.StatusCodes.CREATED,
  };
}

function getVariantFromProductId(
  item: { productId: string; quantity: number; variantId: string },
  products: ProductResponse[]
): ProductItem {
  const product = products.find((product) => product.id === item.productId);
  const variant = (product?.variants as ProductVariantResponse[]).find(
    (variant) => variant.id === item.variantId
  );
  if (!product || !variant) {
    throw new NBError({
      code: defaultAdapter.ErrorCode.notFound,
      httpCode: util.StatusCodes.BAD_REQUEST,
      message: `Could not find item productId=${item.productId} variantId=${item.variantId}: Ensure the product and variant exist and are published (status=ACTIVE & since/until include current date)`,
    });
  }
  return {
    productId: item.productId,
    productName: product.name,
    quantity: item.quantity,
    sku: variant.sku,
    variantId: item.variantId,
    variantTitle: variant.title,
  };
}
