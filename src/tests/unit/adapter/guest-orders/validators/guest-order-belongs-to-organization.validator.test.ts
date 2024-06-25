import { guestOrderBelongsToOrganization } from '../../../../../adapter/guest-orders/validators/guest-order-belongs-to-organization.validator';
import { defaultAdapter } from '@basaldev/blocks-order-service';
import {
  Logger,
  util,
  adapter,
  NBError,
  security,
} from '@basaldev/blocks-backend-sdk';

describe('guestOrderBelongsToOrganization', () => {
  const mockedGuestOrderService = {
    getOneOrder: jest.fn(),
  };
  const mockedOrganizationAPI = {
    getOrganizationById: jest.fn(),
  };
  const orgIdTargetField: security.TargetField = { name: 'orgId', type: 'params' };
  const orderIdTargetField: security.TargetField = { name: 'orderId', type: 'params' };
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

  const dummyOrganizationId = 'dummy-org-id-1';
  const dummyOrganization = {
    addressLine1: 'address line 1',
    description: 'org description',
    id: dummyOrganizationId,
    name: 'Organization Name',
  };
  const dummyOrderId = 'dummy-order-id-1';
  const dummyOrder = {
    organizationId: dummyOrganizationId,
    lineItems: [{
      productId: 'dummy-product-id-1',
      productName: 'product name',
      quantity: 1,
      sku: 'sku-1',
      variantId: 'dummy-variant-id-1',
      variantTitle: 'variant title',
    }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate guest order belongs to organization', async () => {
    mockedOrganizationAPI.getOrganizationById.mockResolvedValue(dummyOrganization);
    mockedGuestOrderService.getOneOrder.mockResolvedValue(dummyOrder);

    const response = await guestOrderBelongsToOrganization(
      mockedGuestOrderService,
      mockedOrganizationAPI,
      orgIdTargetField,
      orderIdTargetField,
      mockedLogger,
      {
        ...dummyContext,
        params: {
          orgId: dummyOrganizationId,
          orderId: dummyOrderId,
        },
      }
    );

    expect(response).toEqual(util.StatusCodes.OK);
    expect(mockedOrganizationAPI.getOrganizationById).toHaveBeenCalledWith(dummyOrganizationId);
    expect(mockedGuestOrderService.getOneOrder).toHaveBeenCalledWith(dummyOrderId);
  });

  it('should throw error when orderId does not belong to organization', async () => {
    mockedOrganizationAPI.getOrganizationById.mockResolvedValue({
      addressLine1: 'address line 2',
      description: 'org description 2',
      id: 'dummy-organization-id-2',
      name: 'Organization Name 2',
    });
    mockedGuestOrderService.getOneOrder.mockResolvedValue(dummyOrder);

    await expect(guestOrderBelongsToOrganization(
      mockedGuestOrderService,
      mockedOrganizationAPI,
      orgIdTargetField,
      orderIdTargetField,
      mockedLogger,
      {
        ...dummyContext,
        params: {
          orgId: dummyOrganizationId,
          orderId: dummyOrderId,
        },
      }
    )).rejects.toThrow(
      new NBError({
        code: defaultAdapter.ErrorCode.noPermission,
        httpCode: util.StatusCodes.FORBIDDEN,
        message: `order: orderId=${dummyOrderId} does not belong to organization: orgId=${dummyOrganizationId}`,
      })
    );

    expect(mockedOrganizationAPI.getOrganizationById).toHaveBeenCalledWith(dummyOrganizationId);
    expect(mockedGuestOrderService.getOneOrder).toHaveBeenCalledWith(dummyOrderId);
  });

  it('should throw error when organization does not exist', async () => {
    mockedOrganizationAPI.getOrganizationById.mockResolvedValue(undefined);

    await expect(guestOrderBelongsToOrganization(
      mockedGuestOrderService,
      mockedOrganizationAPI,
      orgIdTargetField,
      orderIdTargetField,
      mockedLogger,
      {
        ...dummyContext,
        params: {
          orgId: dummyOrganizationId,
          orderId: dummyOrderId,
        },
      }
    )).rejects.toThrow(
      new NBError({
        code: defaultAdapter.ErrorCode.notFound,
        httpCode: util.StatusCodes.NOT_FOUND,
        message: `orgId ${dummyOrganizationId} cannot be found`,
      })
    );

    expect(mockedOrganizationAPI.getOrganizationById).toHaveBeenCalledWith(dummyOrganizationId);
    expect(mockedGuestOrderService.getOneOrder).not.toHaveBeenCalled();
  });

  it('should throw error when order does not exist', async () => {
    mockedOrganizationAPI.getOrganizationById.mockResolvedValue(dummyOrganization);
    mockedGuestOrderService.getOneOrder.mockResolvedValue(undefined);

    await expect(guestOrderBelongsToOrganization(
      mockedGuestOrderService,
      mockedOrganizationAPI,
      orgIdTargetField,
      orderIdTargetField,
      mockedLogger,
      {
        ...dummyContext,
        params: {
          orgId: dummyOrganizationId,
          orderId: dummyOrderId,
        },
      }
    )).rejects.toThrow(
      new NBError({
        code: defaultAdapter.ErrorCode.notFound,
        httpCode: util.StatusCodes.NOT_FOUND,
        message: `orderId ${dummyOrderId} cannot be found`,
      })
    );

    expect(mockedOrganizationAPI.getOrganizationById).toHaveBeenCalledWith(dummyOrganizationId);
    expect(mockedGuestOrderService.getOneOrder).toHaveBeenCalledWith(dummyOrderId);
  });
});