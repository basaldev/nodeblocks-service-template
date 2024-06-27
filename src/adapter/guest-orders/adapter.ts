/* eslint-disable typescript-sort-keys/interface */
/* eslint-disable sort-keys-fix/sort-keys-fix */

import { defaultAdapter, OrderAdapter } from '@basaldev/blocks-order-service';
import { crypto, adapter, security, Logger } from '@basaldev/blocks-backend-sdk';
import { GuestOrderAdapterOptions } from './types';

import { partial } from 'lodash';

import {
  GuestOrderDataService,
  getCreateGuestOrderDtoSchema,
} from './dataServices';
import {
  productContainsVariant,
  guestOrderBelongsToOrganization,
} from './validators';
import {
  createGuestOrderHandler,
  listOrdersForOrganizationHandler,
  getGuestOrderHandler,
} from './handlers';

export const ADAPTER_NAME = 'guest-order-adapter';

/**
 * Guest Order adapter
 * @group Adapter
 */
export class GuestOrderAdapter implements OrderAdapter {
  adapterName = ADAPTER_NAME;
  authSecrets: crypto.AuthSecrets;
  opts: Required<
    Omit<GuestOrderAdapterOptions, keyof crypto.AuthSecrets>
  >;
  dependencies: defaultAdapter.OrderDefaultAdapterDependencies;
  dataServices: {
    guestOrder: GuestOrderDataService;
  };

  /**
   * @group HandlerAndValidators
   * @description Create guest order handler and validators
   *
   * handler: {@link createGuestOrderHandler}
   *
   * validators:
   * - validBody: [createValidRequestPredicate](https://docs.nodeblocks.dev/tsdoc/backend-sdk/functions/security.createValidRequestPredicate.html)
   * - organizationExist: {@link isOrganizationExists}
   * - productContainVariant: {@link productContainVariant}
   */
  createOrder: adapter.HandlerAndValidators<
    {
      validBody: security.Predicate | undefined;
      organizationExists: security.Predicate | undefined;
      productContainVariant: security.Predicate | undefined;
    } & Record<string, security.Predicate>
  >;

  /**
   * @group HandlerAndValidators
   * @description Get guest order handler and validators
   *
   * handler: {@link getGuestOrderHandler}
   *
   * validators:
   * - orderBelongsToOrganization: {@link orderBelongsToOrganization}
   */
  getOrder: adapter.HandlerAndValidators<
    {
      authentication: security.Predicate | undefined;
      authorization: security.Predicate | undefined;
      guestOrderBelongsToOrganization: security.Predicate | undefined;
    } & Record<string, security.Predicate>
  >;

  /**
   * @group HandlerAndValidators
   * @description Get guest orders for organization handler and validators
   *
   * handler: {@link listGuestOrdersForOrganizationHandler}
   *
   * validators:
   * - organizationExist: {@link isOrganizationExists}
   */
  listOrdersForOrganization: adapter.HandlerAndValidators<
    {
      authentication: security.Predicate | undefined;
      authorization: security.Predicate | undefined;
      organizationExists: security.Predicate | undefined;
    } & Record<string, security.Predicate>
  >;

  calculateOrderStatisticsForProducts: adapter.HandlerAndValidators<Record<string, security.Predicate>>;
  deleteOrder: adapter.HandlerAndValidators<Record<string, security.Predicate>>;
  listOrders: adapter.HandlerAndValidators<Record<string, security.Predicate>>;
  listOrdersForUser: adapter.HandlerAndValidators<Record<string, security.Predicate>>;
  updateOrder: adapter.HandlerAndValidators<Record<string, security.Predicate>>;

  constructor(
    opts: GuestOrderAdapterOptions,
    dependencies: defaultAdapter.OrderDefaultAdapterDependencies
  ) {
    this.authSecrets = {
      authEncSecret: opts.authEncSecret,
      authSignSecret: opts.authSignSecret,
    };
    this.opts = {
      authenticate: opts.authenticate ?? security.defaultBearerAuth,
      customFields: opts.customFields ?? { order: [] },
      paginationConfiguration: opts.paginationConfiguration ?? {
        defaultOffset: 0,
        defaultPageSize: 20,
        maxPageSize: 1000,
      },
    };
    this.dependencies = dependencies;
    this.dataServices = {
      guestOrder: new GuestOrderDataService(
        this.opts.customFields.order ?? [],
        {
          db: dependencies.db,
          catalogService: dependencies.catalogAPI,
          organizationService: dependencies.organizationAPI,
        }
      ),
    };

    this.createOrder = {
      handler: async (
        logger: Logger,
        context: adapter.AdapterHandlerContext
      ): Promise<adapter.AdapterHandlerResponse> => {
        return createGuestOrderHandler(
          this.dataServices.guestOrder,
          logger,
          context
        );
      },
      validators: {
        organizationExists: partial(
          defaultAdapter.isOrganizationExists,
          { name: 'orgId', type: 'params' },
          this.dependencies.organizationAPI
        ),
        validBody: security.createValidRequestPredicate(
          getCreateGuestOrderDtoSchema(this.opts.customFields?.order ?? []),
          'body'
        ),
        productContainVariant: partial(
          productContainsVariant,
          this.dependencies.catalogAPI,
          { name: 'orgId', type: 'params' },
          { name: 'items', type: 'body' }
        ),
      },
    };

    this.getOrder = {
      handler: async (
        logger: Logger,
        context: adapter.AdapterHandlerContext
      ): Promise<adapter.AdapterHandlerResponse> => {
        return await getGuestOrderHandler(
          this.dataServices.guestOrder,
          logger,
          context
        );
      },
      validators: {
        authentication: security.createIsAuthenticatedValidator(
          this.authSecrets,
          this.opts.authenticate
        ),
        authorization: this.dependencies.userAPI.createIsAdminUserValidator(
          this.authSecrets
        ),
        guestOrderBelongsToOrganization: partial(
          guestOrderBelongsToOrganization,
          this.dataServices.guestOrder,
          this.dependencies.organizationAPI,
          { name: 'orgId', type: 'params' },
          { name: 'orderId', type: 'params' }
        ),
      },
    };

    this.listOrdersForOrganization = {
      handler: async (
        logger: Logger,
        context: adapter.AdapterHandlerContext
      ): Promise<adapter.AdapterHandlerResponse> => {
        return listOrdersForOrganizationHandler(
          this.dataServices.guestOrder,
          this.opts.paginationConfiguration,
          logger,
          context
        );
      },
      validators: {
        authentication: security.createIsAuthenticatedValidator(
          this.authSecrets,
          this.opts.authenticate
        ),
        authorization: this.dependencies.userAPI.createIsAdminUserValidator(
          this.authSecrets
        ),
        organizationExists: partial(
          defaultAdapter.isOrganizationExists,
          { name: 'orgId', type: 'params' },
          this.dependencies.organizationAPI
        ),
      },
    };

    this.calculateOrderStatisticsForProducts = {
      handler: adapter.notFoundHandler,
      validators: {},
    };
    this.deleteOrder = {
      handler: adapter.notFoundHandler,
      validators: {},
    };
    this.listOrders = {
      handler: adapter.notFoundHandler,
      validators: {},
    };
    this.listOrdersForUser = {
      handler: adapter.notFoundHandler,
      validators: {},
    };
    this.updateOrder = {
      handler: adapter.notFoundHandler,
      validators: {},
    };
  }
}
