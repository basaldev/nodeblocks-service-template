import { defaultAdapter } from '@basaldev/blocks-order-service';
import { listOrdersForOrganizationHandler } from '../../../../adapter/guest-orders/handlers';
import {
  Logger,
  util,
  adapter,
  NBError,
} from '@basaldev/blocks-backend-sdk';

describe('listOrdersForOrganizationHandler', () => {
  const mockedOrderService = {
    getPaginatedGuestOrdersByOrgId: jest.fn(),
  };
  const mockedCatalogService = {
    getOneProduct: jest.fn(),
  };
  const mockedOrganizationService = {
    getOrganizationById: jest.fn(),
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
  const dummyOrganizationId = 'dummy-org-id';
  const dummyProductId = 'product-id-1';
  const dummyVariantId = 'variant-id-1';
  const dummyOrderId = 'order-id';
  const dummyCustomer = {
      name: "Fake Name",
      nameKana: "フェーク ネーム",
      addressLine1: "address line 1",
      phone: "44-444-4444",
      email: "fake@name.email",
  };
  const dummyBody = {
    items: [{
      productId: dummyProductId,
      variantId: dummyVariantId,
      quantity: 1,
    }],
    customer: dummyCustomer,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get a guest order', async () => {
    mockedOrderService.getPaginatedGuestOrdersByOrgId.mockResolvedValue({
      count: 1,
      result: [{
        id: dummyOrderId,
        organizationId: dummyOrganizationId,
        lineItems: [{
          productId: dummyProductId,
          productName: 'product name',
          quantity: 1,
          variantId: dummyVariantId,
        }],
        customer: dummyCustomer,
        status: defaultAdapter.Status.PENDING,
      }],
      total: 1,
    });

    const response = await listOrdersForOrganizationHandler(
      mockedOrderService,
      mockedCatalogService,
      mockedOrganizationService,
      [],
      { maxPageSize: 20 },
      mockedLogger,
      {
        ...dummyContext,
        params: {
          orgId: dummyOrganizationId,
        },
      }
    );

    expect(response).toHaveProperty('status', util.StatusCodes.OK);
    expect(response).toHaveProperty('data');
    expect(response.data).toMatchObject({
      '@nextLink': '',
      '@previousLink': '',
      count: 1,
      total: 1,
      value: [{
        customer: dummyCustomer,
        id: dummyOrderId,
        status: 'PENDING',
        lineItems: [{
          productName: 'product name',
          quantity: 1,
          product: dummyProductId,
          variants: dummyVariantId,
        }],
        organization: dummyOrganizationId,
      }],
    });
    expect(mockedOrderService.getPaginatedGuestOrdersByOrgId).toHaveBeenCalledWith(
      "dummy-org-id",
      undefined,
      [],
      {
        limit: 20,
        offset: 0,
        type: 'offset'
      }
    );
  });

  it('should get a guest order with next and previous links included in response', async () => {
    mockedOrderService.getPaginatedGuestOrdersByOrgId.mockResolvedValue({
      count: 1,
      total: 1,
      nextToken: 'next-token',
      previousToken: 'previous-token',
      result: [{
        id: dummyOrderId,
        organizationId: dummyOrganizationId,
        lineItems: [{
          productId: dummyProductId,
          productName: 'product name',
          quantity: 1,
          variantId: dummyVariantId,
        }],
        customer: dummyCustomer,
        status: defaultAdapter.Status.PENDING,
      }],
    });

    const response = await listOrdersForOrganizationHandler(
      mockedOrderService,
      mockedCatalogService,
      mockedOrganizationService,
      [],
      { maxPageSize: 20 },
      mockedLogger,
      {
        ...dummyContext,
        params: {
          orgId: dummyOrganizationId,
        },
      }
    );

    expect(response).toHaveProperty('status', util.StatusCodes.OK);
    expect(response).toHaveProperty('data');
    expect(response.data).toMatchObject({
      '@nextLink': 'https://1.2.3.4/localhost?$nextToken=next-token&$top=20',
      '@previousLink': 'https://1.2.3.4/localhost?$previousToken=previous-token&$top=20',
      count: 1,
      total: 1,
      value: [{
        customer: dummyCustomer,
        id: dummyOrderId,
        status: 'PENDING',
        lineItems: [{
          productName: 'product name',
          quantity: 1,
          product: dummyProductId,
          variants: dummyVariantId,
        }],
        organization: dummyOrganizationId,
      }],
    });
    expect(mockedOrderService.getPaginatedGuestOrdersByOrgId).toHaveBeenCalledWith(
      "dummy-org-id",
      undefined,
      [],
      {
        limit: 20,
        offset: 0,
        type: 'offset'
      }
    );
  });

  it('should throw error when pagination limit is greater than maxPageSize', async () => {
    await expect(listOrdersForOrganizationHandler(
      mockedOrderService,
      mockedCatalogService,
      mockedOrganizationService,
      [],
      { maxPageSize: 10 },
      mockedLogger,
      {
        ...dummyContext,
        params: {
          orderId: dummyOrderId,
          orgId: dummyOrganizationId,
        },
      }
    )).rejects.toThrow(
      new NBError({
        code: defaultAdapter.ErrorCode.wrongParameter,
        httpCode: util.StatusCodes.BAD_REQUEST,
        message: 'Page size exceeds 10 mbs',
      })
    );
    expect(mockedOrderService.getPaginatedGuestOrdersByOrgId).not.toHaveBeenCalled();
  });
});