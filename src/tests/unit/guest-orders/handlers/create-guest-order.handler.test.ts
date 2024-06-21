import { defaultAdapter } from '@basaldev/blocks-order-service';
import { createGuestOrderHandler } from '../../../../adapter/guest-orders/handlers';
import {
  Logger,
  util,
  adapter,
  NBError,
} from '@basaldev/blocks-backend-sdk';

describe('createGuestOrderHandler', () => {
  const mockedOrderService = {
    createOrder: jest.fn(),
    getOneOrder: jest.fn(),
  };
  const mockedCatalogService = {
    getAvailableProducts: jest.fn(),
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

  it('should create a guest order', async () => {
    mockedCatalogService.getAvailableProducts.mockResolvedValue({
      value: [{
        id: dummyProductId,
        name: 'product name',
        variants: [{
          id: 'variant-id-1',
        }],
        organization: dummyOrganizationId,
      }],
    });
    mockedOrderService.createOrder.mockResolvedValue({ id: dummyOrderId });
    mockedOrderService.getOneOrder.mockResolvedValue({
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
    });

    const response = await createGuestOrderHandler(
      mockedOrderService,
      mockedCatalogService,
      mockedOrganizationService,
      [],
      mockedLogger,
      {
        ...dummyContext,
        params: {
          orgId: dummyOrganizationId,
        },
        body: dummyBody,
      }
    );

    expect(response).toHaveProperty('status', util.StatusCodes.CREATED);
    expect(response).toHaveProperty('data');
    expect(response.data).toMatchObject({
      customer: dummyCustomer,
      id: expect.any(String),
      status: 'PENDING',
      lineItems: [{
        productName: 'product name',
        quantity: 1,
        product: dummyProductId,
        variants: dummyVariantId,
      }],
      organization: dummyOrganizationId,
    });
    expect(mockedOrderService.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      customer: dummyBody.customer,
      lineItems: [{
        productId: dummyProductId,
        productName: 'product name',
        quantity: 1,
        variantId: dummyVariantId,
      }],
      organizationId: dummyOrganizationId,
      status: defaultAdapter.Status.PENDING,
    }));
    expect(mockedOrderService.getOneOrder).toHaveBeenCalledWith(dummyOrderId);
  });

  it('should throw error when guest order was not created', async () => {
    mockedCatalogService.getAvailableProducts.mockResolvedValue({
      value: [{
        id: dummyProductId,
        name: 'product name',
        variants: [{
          id: 'variant-id-1',
        }],
        organization: dummyOrganizationId,
      }],
    });
    mockedOrderService.getOneOrder.mockResolvedValue(null);

    await expect(createGuestOrderHandler(
      mockedOrderService,
      mockedCatalogService,
      mockedOrganizationService,
      [],
      mockedLogger,
      {
        ...dummyContext,
        params: {
          orgId: dummyOrganizationId,
        },
        body: dummyBody,
      }
    )).rejects.toThrow(
      new NBError({
        code: defaultAdapter.ErrorCode.internalServerError,
        httpCode: util.StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'operation failed to create order',
      })
    );

    expect(mockedOrderService.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      customer: dummyBody.customer,
      lineItems: [{
        productId: dummyProductId,
        productName: 'product name',
        quantity: 1,
        variantId: dummyVariantId,
      }],
      organizationId: dummyOrganizationId,
      status: defaultAdapter.Status.PENDING,
    }));
    expect(mockedOrderService.getOneOrder).toHaveBeenCalled();
  });
});