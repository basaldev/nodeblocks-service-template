import { defaultAdapter } from '@basaldev/blocks-order-service';
import {
  mongo,
  util,
  NBError,
} from '@basaldev/blocks-backend-sdk';
import {
  Organization,
  CatalogDefaultAdapterAPI,
  OrganizationDefaultAdapterAPI,
  ProductVariantResponse,
} from '@basaldev/blocks-default-adapter-api';
import { GuestOrderCreation } from '../types';
import { GuestOrderEntity } from './guest-order.entity';
import {
  ProductItem,
  NormalizedLineItem,
  NormalizedGuestOrder
} from '../types';

export interface GuestOrderDataServiceDependencies {
  db: mongo.Db;
  organizationService: Pick<OrganizationDefaultAdapterAPI, 'getOrganizationById'>;
  catalogService: Pick<CatalogDefaultAdapterAPI, 'getOneProduct' | 'getAvailableProducts'>;
}

export class GuestOrderDataService {
  private static readonly COLLECTION_ORDER = 'guest_orders';
  private readonly guestOrderRepository: mongo.MongoRepository<GuestOrderEntity>;
  db: mongo.Db;
  organizationService: Pick<OrganizationDefaultAdapterAPI, 'getOrganizationById'>;
  catalogService: Pick<CatalogDefaultAdapterAPI, 'getOneProduct' | 'getAvailableProducts'>;
  customFieldDefinitions: util.CustomField[];

  constructor(
    customFieldDefinitions: util.CustomField[],
    dependencies: GuestOrderDataServiceDependencies
  ) {
    this.guestOrderRepository = new mongo.MongoRepository<GuestOrderEntity>(
      dependencies.db,
      GuestOrderDataService.COLLECTION_ORDER
    );
    this.db = dependencies.db;
    this.organizationService = dependencies.organizationService;
    this.catalogService = dependencies.catalogService;
    this.customFieldDefinitions = customFieldDefinitions;
  }

  async createOrder(order: GuestOrderCreation): Promise<{ id: string }> {
    return this.guestOrderRepository.create(
      new GuestOrderEntity({
        ...order,
      })
    );
  }

  async getOneOrder(id: string): Promise<GuestOrderEntity | null> {
    const order = await this.guestOrderRepository.findOne(id);
    return order;
  }

  async getOneGuestOrderByOrgId(id: string | undefined, orgId?: string): Promise<GuestOrderEntity | null> {
    const order = await this.guestOrderRepository.findOneBy({
      id,
      organizationId: orgId,
    });
    return order;
  }

  async getPaginatedGuestOrdersByOrgId(
    orgId: string,
    filter: util.Expression | undefined,
    orderParams: util.OrderParam[],
    paginationOptions: mongo.PaginationOptions
  ): Promise<mongo.PaginatedFindResult<GuestOrderEntity>> {
    const query = filter
      ? {
          ...util.filterToMongoQuery(filter),
          organizationId: orgId,
        }
      : {
          organizationId: orgId,
        };
    const sortParams = orderParams
      ? util.orderParamsToMongoDbSortParams(orderParams)
      : [];
    return await this.guestOrderRepository.findWithPagination(
      query,
      sortParams,
      paginationOptions
    );
  }

  async prepareGuestOrderResponse(
    queryExpand: string,
    guestOrder: GuestOrderEntity | GuestOrderEntity[]
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
          await this.prepareGuestOrder(expandFields, order)
        )
      );
    } else {
      return await this.prepareGuestOrder(expandFields, guestOrder);
    }
  }

  async prepareGuestOrder(
    expandFields: Record<string, boolean>,
    guestOrder: GuestOrderEntity
  ) {
    const [customFields, organization, products] = await Promise.all([
      this.prepareCustomFields(
        expandFields,
        guestOrder.customFields
      ),
      this.prepareOrganization(
        expandFields,
        guestOrder.organizationId
      ),
      this.prepareProducts(
        expandFields,
        guestOrder.lineItems
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

  async prepareProducts(
    queryExpand: Record<string, boolean>,
    lineItems: ProductItem[]
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
      const productData = await this.catalogService.getOneProduct({
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

  async prepareOrganization(
    queryExpand: Record<string, boolean>,
    organizationId: string
  ): Promise<Organization | undefined | void> {
    if (!queryExpand['organization']) {
      return undefined;
    }

    return await this.organizationService.getOrganizationById(organizationId);
  }

  async prepareCustomFields(
    queryExpand: Record<string, boolean>,
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
      this.customFieldDefinitions,
      customFieldsToExpand
    )
  }
}
