import { productContainsVariant } from '../../../../../adapter/guest-orders/validators/product-contains-variant.validator';
import { ErrorCode } from '@basaldev/blocks-default-adapter-api';
import {
  Logger,
  util,
  adapter,
  NBError,
  security,
} from '@basaldev/blocks-backend-sdk';

describe('productContainsVariant', () => {
  const dummyOrganizationId = 'dummy-org-id';
  const dummyProductId = 'product-id-1';
  const dummyVariantId1 = 'variant-id-1';
  const dummyVariantId2 = 'variant-id-2';
  const orgIdTargetField: security.TargetField = { name: 'orgId', type: 'params' };
  const itemsTargetField: security.TargetField = { name: 'items', type: 'body' };
  const mockedCatalogService = {
    getAvailableProducts: jest.fn(),
  };
  const mockedLogger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
  const dummyContext: adapter.AdapterHandlerContext = {
    headers: { from: 'test' },
    reqInfo: {
      host: '1.2.3.4',
      ip: '1.2.3.4',
      method: 'GET',
      path: '/hello',
      url: 'localhost',
    },
  };
  const dummyItem = {
    productId: dummyProductId,
    productName: 'product-name',
    quantity: 1,
    sku: '1234567890',
    variantId: dummyVariantId1,
    variantTitle: 'variant-title',
  };
  const dummyAvailableProducts = {
    '@nextLink': '',
    count: 1,
    total: 1,
    value: [
      {
        id: dummyProductId,
        additionalInformation: '',
        description: '',
        dimensions: '',
        features: [],
        name: '',
        publication: {},
        tags: [''],
        variantNote: '',
        variants: [{ id: dummyVariantId1 }],
      },
    ],
  };

  it('should return 200 when product contains variant', async () => {
    mockedCatalogService.getAvailableProducts.mockResolvedValue(dummyAvailableProducts);

    const response = await productContainsVariant(
      mockedCatalogService,
      orgIdTargetField,
      itemsTargetField,
      mockedLogger,
      {
        ...dummyContext,
        params: { orgId: dummyOrganizationId },
        body: { items: [dummyItem] },
      }
    );

    expect(response).toBe(util.StatusCodes.OK);
    expect(mockedCatalogService.getAvailableProducts).toHaveBeenCalledWith({
      queryOptions: {
        expand: 'variants',
        filter: `organizationId eq '${dummyOrganizationId}' and id in ['${dummyProductId}']`,
        top: 1,
      },
    });
  });

  it('should throw error when product is not found in organization', async () => {
    mockedCatalogService.getAvailableProducts.mockResolvedValue(dummyAvailableProducts);

    await expect(productContainsVariant(
      mockedCatalogService,
      orgIdTargetField,
      itemsTargetField,
      mockedLogger,
      {
        ...dummyContext,
        params: { orgId: dummyOrganizationId },
        body: { items: [{
          productId: 'non-existent-product-id',
          productName: 'product-name',
          quantity: 1,
          sku: '1234567890',
          variantId: dummyVariantId1,
          variantTitle: 'variant-title',
        }] },
      }
    )).rejects.toThrow(
      new NBError({
        code: ErrorCode.notFound,
        httpCode: util.StatusCodes.BAD_REQUEST,
        message: `Could not find item productId=non-existent-product-id: Ensure the product exists in the organization and is published (status=ACTIVE & since/until include current date)`,
      })
    );
    expect(mockedCatalogService.getAvailableProducts).toHaveBeenCalledWith({
      queryOptions: {
        expand: 'variants',
        filter: `organizationId eq '${dummyOrganizationId}' and id in ['${dummyProductId}']`,
        top: 1,
      },
    });
  });

  it('should throw error when variant is not in product', async () => {
    mockedCatalogService.getAvailableProducts.mockResolvedValue(dummyAvailableProducts);

    await expect(productContainsVariant(
      mockedCatalogService,
      orgIdTargetField,
      itemsTargetField,
      mockedLogger,
      {
        ...dummyContext,
        params: { orgId: dummyOrganizationId },
        body: { items: [{
          ...dummyItem,
          variantId: dummyVariantId2,
        }] },
      }
    )).rejects.toThrow(
      new NBError({
        code: ErrorCode.notFound,
        httpCode: util.StatusCodes.BAD_REQUEST,
        message: `Could not find item productId=${dummyProductId} variantId=${dummyVariantId2}: Ensure the product and variant exist and are published (status=ACTIVE & since/until include current date)`,
      })
    );
    expect(mockedCatalogService.getAvailableProducts).toHaveBeenCalledWith({
      queryOptions: {
        expand: 'variants',
        filter: `organizationId eq '${dummyOrganizationId}' and id in ['${dummyProductId}']`,
        top: 1,
      },
    });
  });
});