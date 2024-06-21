import { mongo, util } from '@basaldev/blocks-backend-sdk';
import { GuestOrderCreation } from '../types';
import { GuestOrderEntity } from './guest-order.entity';

export class GuestOrderDataService {
  private static readonly COLLECTION_ORDER = 'orders';
  private readonly guestOrderRepository: mongo.MongoRepository<GuestOrderEntity>;
  constructor(private db: mongo.Db) {
    this.guestOrderRepository = new mongo.MongoRepository<GuestOrderEntity>(
      db,
      GuestOrderDataService.COLLECTION_ORDER
    );
  }

  async createOrder(order: GuestOrderCreation): Promise<{ id: string }> {
    return this.guestOrderRepository.create(
      new GuestOrderEntity({
        ...order,
      })
    );
  }

  async getOneOrder(id?: string): Promise<GuestOrderEntity | null> {
    if (!id) {
      return null;
    }

    const order = await this.guestOrderRepository.findOne(id);
    return order;
  }

  async getOneGuestOrderByOrgId(id?: string, orgId?: string): Promise<GuestOrderEntity | null> {
    if (!id) {
      return null;
    }

    const order = await this.guestOrderRepository.findOneBy({
      id,
      organizationId: orgId,
    });
    return order;
  }

  async getPaginatedGuestOrders(
    filter: util.Expression | undefined,
    orderParams: util.OrderParam[],
    paginationOptions: mongo.PaginationOptions
  ): Promise<mongo.PaginatedFindResult<GuestOrderEntity>> {
    const query = filter ? util.filterToMongoQuery(filter) : {};
    const sortParams = orderParams
      ? util.orderParamsToMongoDbSortParams(orderParams)
      : [];
    return this.guestOrderRepository.findWithPagination(
      query,
      sortParams,
      paginationOptions
    );
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
}
