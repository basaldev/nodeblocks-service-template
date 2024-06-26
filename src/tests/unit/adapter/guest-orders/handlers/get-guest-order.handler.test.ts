import { defaultAdapter } from '@basaldev/blocks-order-service';
import { getGuestOrderHandler } from '../../../../../adapter/guest-orders/handlers';
import {
  Logger,
  util,
  adapter,
  NBError,
} from '@basaldev/blocks-backend-sdk';

describe('getGuestOrderHandler', () => {
  const mockedGuestOrderService = {
    getOneGuestOrderByOrgId: jest.fn(),
    prepareGuestOrderResponse: jest.fn(),
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
  mockedGuestOrderService.prepareGuestOrderResponse.mockResolvedValue({
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get a guest order', async () => {
    mockedGuestOrderService.getOneGuestOrderByOrgId.mockResolvedValue({
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

    const response = await getGuestOrderHandler(
      mockedGuestOrderService,
      mockedLogger,
      {
        ...dummyContext,
        params: {
          orderId: dummyOrderId,
          orgId: dummyOrganizationId,
        },
      }
    );

    expect(response).toHaveProperty('status', util.StatusCodes.OK);
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
    expect(mockedGuestOrderService.getOneGuestOrderByOrgId).toHaveBeenCalledWith(dummyOrderId, dummyOrganizationId);
    expect(mockedGuestOrderService.prepareGuestOrderResponse).toHaveBeenCalledWith('', {
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
  });

  it('should throw an error when guest order is not found', async () => {
    mockedGuestOrderService.getOneGuestOrderByOrgId.mockResolvedValue(undefined);

    await expect(getGuestOrderHandler(
      mockedGuestOrderService,
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
        code: defaultAdapter.ErrorCode.notFound,
        httpCode: util.StatusCodes.NOT_FOUND,
        message: 'operation failed to get an order',
      })
    );
    expect(mockedGuestOrderService.getOneGuestOrderByOrgId).toHaveBeenCalledWith(dummyOrderId, dummyOrganizationId);
    expect(mockedGuestOrderService.prepareGuestOrderResponse).not.toHaveBeenCalled();
  });
});