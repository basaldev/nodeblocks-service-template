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
    const variant = (product?.variants as ProductVariantResponse[]).find(
      (variant) => variant.id === item.variantId
    );
    if (!product || !variant) {
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
