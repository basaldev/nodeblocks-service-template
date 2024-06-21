/* eslint-disable typescript-sort-keys/interface */
/* eslint-disable sort-keys-fix/sort-keys-fix */

import { defaultAdapter } from '@basaldev/blocks-order-service';
import { crypto, adapter, security, Logger } from '@basaldev/blocks-backend-sdk';
import {
  GuestOrderAdapter,
  GuestOrderDefaultAdapterOptions,
  GuestOrderDefaultAdapterDependencies
} from './adapter/guest-orders/types';

import { partial } from 'lodash';

import {
  GuestOrderDataService,
  getCreateGuestOrderDtoSchema,
} from './adapter/guest-orders/dataServices';
import {
  productContainsVariant,
  guestOrderBelongsToOrganization,
} from './adapter/guest-orders/validators';
import {
  createGuestOrderHandler,
  listOrdersForOrganizationHandler,
  getGuestOrderHandler,
} from './adapter/guest-orders/handlers';

export const ADAPTER_NAME = 'guest-order-default-adapter';

/**
 * Guest Order default adapter
 * @group Adapter
 */
export class GuestOrderDefaultAdapter implements GuestOrderAdapter {
  adapterName = ADAPTER_NAME;
  authSecrets: crypto.AuthSecrets;
  opts: Required<
    Omit<GuestOrderDefaultAdapterOptions, keyof crypto.AuthSecrets>
  >;
  dependencies: GuestOrderDefaultAdapterDependencies;
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
  createGuestOrder: adapter.HandlerAndValidators<
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
  getGuestOrder: adapter.HandlerAndValidators<
    {
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
  listGuestOrdersForOrganization: adapter.HandlerAndValidators<
    {
      organizationExists: security.Predicate | undefined;
    } & Record<string, security.Predicate>
  >;

  constructor(
    opts: GuestOrderDefaultAdapterOptions,
    dependencies: GuestOrderDefaultAdapterDependencies
  ) {
    this.authSecrets = {
      authEncSecret: opts.authEncSecret,
      authSignSecret: opts.authSignSecret,
    };
    this.opts = {
      customFields: opts.customFields ?? { order: [] },
      paginationConfiguration: opts.paginationConfiguration ?? {
        defaultOffset: 0,
        defaultPageSize: 20,
        maxPageSize: 1000,
      },
      serviceEndpoints: opts.serviceEndpoints,
    };
    this.dependencies = dependencies;
    this.dataServices = {
      guestOrder: new GuestOrderDataService(dependencies.db),
    };

    this.createGuestOrder = {
      handler: async (
        logger: Logger,
        context: adapter.AdapterHandlerContext
      ): Promise<adapter.AdapterHandlerResponse> => {
        return createGuestOrderHandler(
          this.dataServices.guestOrder,
          this.dependencies.catalogAPI,
          this.dependencies.organizationAPI,
          this.opts.customFields?.order ?? [],
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

    this.getGuestOrder = {
      handler: async (
        logger: Logger,
        context: adapter.AdapterHandlerContext
      ): Promise<adapter.AdapterHandlerResponse> => {
        return await getGuestOrderHandler(
          this.dataServices.guestOrder,
          this.dependencies.catalogAPI,
          this.dependencies.organizationAPI,
          this.opts.customFields?.order ?? [],
          logger,
          context
        );
      },
      validators: {
        guestOrderBelongsToOrganization: partial(
          guestOrderBelongsToOrganization,
          this.dataServices.guestOrder,
          this.dependencies.organizationAPI,
          { name: 'orgId', type: 'params' },
          { name: 'orderId', type: 'params' }
        ),
      },
    };

    this.listGuestOrdersForOrganization = {
      handler: async (
        logger: Logger,
        context: adapter.AdapterHandlerContext
      ): Promise<adapter.AdapterHandlerResponse> => {
        return listOrdersForOrganizationHandler(
          this.dataServices.guestOrder,
          this.dependencies.catalogAPI,
          this.dependencies.organizationAPI,
          this.opts.customFields?.order ?? [],
          this.opts.paginationConfiguration,
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
      },
    };
  }
}
