import { defaultAdapter } from '@basaldev/blocks-order-service';
import {
  util,
  NBError,
} from '@basaldev/blocks-backend-sdk';
import {
  Organization,
  CatalogDefaultAdapterAPI,
  OrganizationDefaultAdapterAPI,
} from '@basaldev/blocks-default-adapter-api';
import { ProductResponse, ProductVariantResponse } from '@basaldev/blocks-default-adapter-api';
import {
  ProductItem,
  NormalizedLineItem,
  NormalizedGuestOrder
} from './types';
import { GuestOrderEntity } from './dataServices/guest-order.dataServices';

export async function prepareGuestOrderResponse(
  queryExpand: string,
  guestOrder: GuestOrderEntity | GuestOrderEntity[],
  orderCustomFieldDefinitions: util.CustomField[],
  organizationServiceAPI: Pick<OrganizationDefaultAdapterAPI, 'getOrganizationById'>,
  catalogServiceAPI: Pick<CatalogDefaultAdapterAPI, 'getOneProduct'>
): Promise<NormalizedGuestOrder | NormalizedGuestOrder[]> {
  const expandFields = queryExpand.split(',').reduce<Record<string, boolean>>(
    (result, field) => ({
      ...result,
      [field]: true,
    }),
    {}
  );

  if (Array.isArray(guestOrder)) {
    return await Promise.all(
      guestOrder.map(async (order) =>
        await prepareGuestOrder(expandFields, orderCustomFieldDefinitions, order, organizationServiceAPI, catalogServiceAPI)
      )
    );
  } else {
    return await prepareGuestOrder(expandFields, orderCustomFieldDefinitions, guestOrder, organizationServiceAPI, catalogServiceAPI);
  }
}

async function prepareGuestOrder(
  expandFields: Record<string, boolean>,
  orderCustomFieldDefinitions: util.CustomField[],
  guestOrder: GuestOrderEntity,
  organizationServiceAPI: Pick<OrganizationDefaultAdapterAPI, 'getOrganizationById'>,
  catalogServiceAPI: Pick<CatalogDefaultAdapterAPI, 'getOneProduct'>
) {
  const [customFields, organization, products] = await Promise.all([
    prepareCustomFields(
      expandFields,
      orderCustomFieldDefinitions,
      guestOrder.customFields
    ),
    prepareOrganization(
      expandFields,
      guestOrder.organizationId,
      organizationServiceAPI
    ),
    prepareProducts(
      expandFields,
      guestOrder.lineItems,
      catalogServiceAPI
    )
  ]);

  return {
    cancelReason: guestOrder.cancelReason,
    canceledAt: guestOrder.canceledAt,
    closedAt: guestOrder.closedAt,
    createdAt: guestOrder.createdAt,
    customer: guestOrder.customer,
    id: guestOrder.id,
    status: guestOrder.status,
    updatedAt: guestOrder.updatedAt,
    customFields,
    lineItems: products,
    organization: organization ?? guestOrder.organizationId,
  };
}

export async function prepareProducts(
  queryExpand: Record<string, boolean>,
  lineItems: ProductItem[],
  catalogService: Pick<CatalogDefaultAdapterAPI, 'getOneProduct'>
): Promise<NormalizedLineItem[]>{
  return await Promise.all(lineItems.map(async (product) => {
    let expandedLineItems: NormalizedLineItem = {
      productName: product.productName,
      quantity: product.quantity,
      sku: product.sku,
      variantTitle: product.variantTitle,
      product: product.productId,
      variants: product.variantId,
    };
    const productData = await catalogService.getOneProduct({
      productId: product.productId,
      expand: 'variants'
    });
    if (queryExpand['lineItems.product']) {
      expandedLineItems = {
        ...expandedLineItems,
        product: productData
      };
    }
    if (queryExpand['lineItems.variant']) {
      const variant = (productData.variants as ProductVariantResponse[]).find(
        (variant) => variant.id === product.variantId
      );
      if (!variant) {
        throw new NBError({
          code: defaultAdapter.ErrorCode.notFound,
          httpCode: util.StatusCodes.BAD_REQUEST,
          message: `Could not find item productId=${product.productId} variantId=${product.variantId}: Ensure the product and variant exist and are published (status=ACTIVE & since/until include current date)`,
        });
      }
      expandedLineItems = {
        ...expandedLineItems,
        variants: {
          id: variant.id,
          description: variant.description,
          sku: variant.sku,
          title: variant.title,
          productId: variant.productId,
        },
      };
    }
    return expandedLineItems;
  }));
}

export async function prepareOrganization(
  queryExpand: Record<string, boolean>,
  organizationId: string,
  organizationServiceAPI: Pick<OrganizationDefaultAdapterAPI, 'getOrganizationById'>
): Promise<Organization | undefined | void> {
  if (!queryExpand['organization']) {
    return undefined;
  }

  return await organizationServiceAPI.getOrganizationById(organizationId);
}

export async function prepareCustomFields(
  queryExpand: Record<string, boolean>,
  customFieldDefinition: util.CustomField[],
  customFields: Record<string, unknown> | undefined,
): Promise<Record<string, unknown> | undefined> {
  const customFieldsToExpand = Object.keys(queryExpand).reduce<Record<string, boolean>>(
    (customFields, expandKey) => {
      if (expandKey.startsWith('customFields.')) {
        customFields[expandKey.replace('customFields.', '')] = true;
      }
      return customFields;
    },
    {}
  );

  if (Object.keys(customFieldsToExpand).length === 0) {
    return customFields;
  }

  return await util.expandCustomFields(
    customFields,
    customFieldDefinition,
    customFieldsToExpand
  )
}

export function getVariantFromProductId(
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