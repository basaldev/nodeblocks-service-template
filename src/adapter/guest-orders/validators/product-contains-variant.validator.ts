import { get } from 'lodash';
import { ProductItem } from '../types';

import {
  util,
  adapter,
  Logger,
  NBError,
  security,
} from '@basaldev/blocks-backend-sdk';
import { CatalogDefaultAdapterAPI, ProductVariantResponse, ErrorCode } from '@basaldev/blocks-default-adapter-api';

/**
 * Product contains variant validator
 *
 * @group Validators
 *
 * @description This validator checks if the items contain variants by applying the following steps in sequence:
 *
 * 1. Get available products
 *
 * 2. Check if product ids exist
 *
 * 3. Check if variants exist in the product
 *
 * @param catalogServiceAPI injected API use to get available products
 *
 * @param orgIdTargetField injected targetField use to get orgId
 *
 * @param itemsTargetField injected targetField use to get items
 *
 * @param logger injected logger use to handle logging
 *
 * @param context request context [headers, body, params, query].
 *
 * @throws 403 NBError Forbidden
 * - order does not belong to organization
 *
 * @throws 404 NBError Not Found
 * - product id cannot be found
 * - variant id cannot be found
 *
 * @returns 200 Status OK
 */
export async function productContainsVariant(
  catalogServiceAPI: Pick<CatalogDefaultAdapterAPI, 'getAvailableProducts'>,
  orgIdTargetField: security.TargetField,
  itemsTargetField: security.TargetField,
  logger: Logger,
  context: adapter.AdapterHandlerContext
): Promise<number> {
  const orderItems = get(context, [itemsTargetField.type, itemsTargetField.name], null) as ProductItem[];
  const organizationId = get(context, [orgIdTargetField.type, orgIdTargetField.name], null);

  const productIdFilter = orderItems.map((item) => `'${item.productId}'`).join(',');
  const productResults = await catalogServiceAPI.getAvailableProducts({
    queryOptions: {
      expand: 'variants',
      filter: `organizationId eq '${organizationId}' and id in [${productIdFilter}]`,
      top: orderItems.length,
    },
  });

  await Promise.all(orderItems.map((item) => {
    const product = productResults.value.find((product) => product.id === item.productId);
    if (!product) {
      throw new NBError({
        code: ErrorCode.notFound,
        httpCode: util.StatusCodes.BAD_REQUEST,
        message: `Could not find item productId=${item.productId}: Ensure the product exists in the organization and is published (status=ACTIVE & since/until include current date)`,
      });
    }

    const variant = (product?.variants as ProductVariantResponse[]).find(
      (variant) => variant.id === item.variantId
    );
    if (!variant) {
      throw new NBError({
        code: ErrorCode.notFound,
        httpCode: util.StatusCodes.BAD_REQUEST,
        message: `Could not find item productId=${item.productId} variantId=${item.variantId}: Ensure the product and variant exist and are published (status=ACTIVE & since/until include current date)`,
      });
    }
    return true;
  }));

  return util.StatusCodes.OK;
}
