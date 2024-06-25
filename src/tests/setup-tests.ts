import { Server } from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  BunyanLoggerFactory,
  mongo,
  crypto,
  Logger,
  util,
} from '@basaldev/blocks-backend-sdk';
import { bucketMock, mailServiceMock } from './mock';

import {
  AuthDefaultAdapterRestSdk,
  UserDefaultAdapterRestSdk,
  CatalogDefaultAdapterRestSdk,
  OrganizationDefaultAdapterRestSdk,
} from '@basaldev/blocks-default-adapter-api';
import {
  createNodeblocksUserApp,
  defaultAdapter as UserAdapter,
} from '@basaldev/blocks-user-service';
import {
  defaultAdapter as CatalogAdapter,
  createNodeblocksCatalogApp,
} from '@basaldev/blocks-catalog-service';
import {
  defaultAdapter as OrganizationAdapter,
  createNodeblocksOrganizationApp,
} from '@basaldev/blocks-organization-service';

import { GuestOrderAdapter, ADAPTER_NAME } from '../adapter/guest-orders/adapter'
import { createNodeblocksOrderApp } from '@basaldev/blocks-order-service';

export interface NodeblocksServices {
  db: mongo.Db;
  logger: Logger;
  userServer: Server,
  catalogServer: Server,
  organizationServer: Server,
  guestOrderServer: Server,
  userDefaultAdapter: UserAdapter.UserDefaultAdapter,
  catalogDefaultAdapter: CatalogAdapter.CatalogDefaultAdapter,
  organizationDefaultAdapter: OrganizationAdapter.OrganizationDefaultAdapter,
  guestOrderAdapter: GuestOrderAdapter,
  catalogAPI: CatalogDefaultAdapterRestSdk,
  organizationAPI: OrganizationDefaultAdapterRestSdk;
  userAPI: UserDefaultAdapterRestSdk;
}

export const authSecrets: crypto.AuthSecrets = {
  authEncSecret: 'test_enc_secret-test_enc_secret-test_enc_secret',
  authSignSecret: 'test_sign_secret-test_sign_secret-test_sign_secret',
};

export const USER_PORT = 3001;
export const AUTH_PORT = 3002;
export const ORGANIZATION_PORT = 3003;
export const CATALOG_PORT = 3004;
export const GUEST_ORDER_PORT = 3005;
export const authServiceEndpoint = `http://127.0.0.1:${AUTH_PORT}`;
export const userServiceEndpoint = `http://127.0.0.1:${USER_PORT}`;
export const organizationServiceEndpoint = `http://127.0.0.1:${ORGANIZATION_PORT}`;
export const catalogServiceEndpoint = `http://127.0.0.1:${CATALOG_PORT}`;
export const GUEST_ORDER_SERVER_URL = `http://127.0.0.1:${GUEST_ORDER_PORT}`;

export function getAppToken(
  authSecrets: crypto.AuthSecrets,
  appId: string
): string {
  return crypto.generateAppAccessToken(authSecrets, appId);
}

export const internalToken = getAppToken(authSecrets, ADAPTER_NAME);

export async function setupTests(): Promise<NodeblocksServices> {
  const instance = await MongoMemoryServer.create({
    binary: { version: '5.0.13' },
  });
  const uri = instance.getUri();

  const db = await mongo.singletonMongoConn(uri);
  const loggerFactory = new BunyanLoggerFactory({
    env: 'development',
    name: 'test',
  });
  const logger = loggerFactory.createLogger();

  process.env.NODE_ENV = 'test';
  process.env.DB_URL = uri;

  const authAPI = new AuthDefaultAdapterRestSdk(
    authServiceEndpoint,
    internalToken
  );
  const userAPI = new UserDefaultAdapterRestSdk(
    userServiceEndpoint,
    internalToken
  );
  const organizationAPI = new OrganizationDefaultAdapterRestSdk(
    organizationServiceEndpoint,
    internalToken
  );
  const catalogAPI = new CatalogDefaultAdapterRestSdk(
    catalogServiceEndpoint,
    internalToken
  );

  const userDefaultAdapter = new UserAdapter.UserDefaultAdapter(
    {
      authEncSecret: authSecrets.authEncSecret,
      authSignSecret: authSecrets.authSignSecret,
      emailConfig: {
        inviteUser: { enabled: false },
        resetPassword: { enabled: false },
        sender: 'test@test.com',
        verifyEmail: { enabled: false },
      },
    },
    {
      authAPI,
      bucket: bucketMock,
      db,
      mailService: mailServiceMock,
      organizationAPI,
    }
  );

  const catalogDefaultAdapter = new CatalogAdapter.CatalogDefaultAdapter(
    {
      authEncSecret: authSecrets.authEncSecret,
      authSignSecret: authSecrets.authSignSecret,
      serviceEndpoints: {
        catalog: catalogServiceEndpoint,
        organization: organizationServiceEndpoint,
      }
    },
    {
      bucket: bucketMock,
      db,
      organizationAPI,
      userAPI,
    }
  );

  const organizationDefaultAdapter = new OrganizationAdapter.OrganizationDefaultAdapter(
    {
      authEncSecret: authSecrets.authEncSecret,
      authSignSecret: authSecrets.authSignSecret,
    },
    {
      bucket: bucketMock,
      db,
      userAPI,
    }
  );

  const guestOrderAdapter = new GuestOrderAdapter(
    {
      authEncSecret: authSecrets.authEncSecret,
      authSignSecret: authSecrets.authSignSecret,
      serviceEndpoints: { guestOrder: GUEST_ORDER_SERVER_URL },
    },
    { catalogAPI, db, organizationAPI, userAPI }
  );

  const userServer = await createNodeblocksUserApp({
    corsOrigin: /.*/,
  }).startService({
    PORT: USER_PORT,
    adapter: userDefaultAdapter,
    env: 'development',
  });

  const catalogServer = await createNodeblocksCatalogApp({
    jsonLimit: '10mb',
  }).startService({
    PORT: CATALOG_PORT,
    adapter: catalogDefaultAdapter,
    env: 'development',
  });

  const organizationServer = await createNodeblocksOrganizationApp({
    jsonLimit: '10mb',
  }).startService({
    PORT: ORGANIZATION_PORT,
    adapter: organizationDefaultAdapter,
    env: 'development',
  });

  const guestOrderServer = await createNodeblocksOrderApp({
    corsOrigin: /.*/,
  }).startService({
    PORT: GUEST_ORDER_PORT,
    adapter: guestOrderAdapter,
    env: 'development',
    customRoutes:[
      util.createRoute({
        ...guestOrderAdapter.createGuestOrder,
        path: '/orgs/:orgId/guest/orders',
        method: 'post',
      }),
      util.createRoute({
        ...guestOrderAdapter.getGuestOrder,
        path: '/orgs/:orgId/guest/orders/:orderId',
        method: 'get',
      }),
      util.createRoute({
        ...guestOrderAdapter.listGuestOrdersForOrganization,
        path: '/orgs/:orgId/guest/orders',
        method: 'get',
      }),
    ]
  });

  return {
    db,
    logger,
    userServer,
    catalogServer,
    organizationServer,
    guestOrderServer,
    userDefaultAdapter,
    catalogDefaultAdapter,
    organizationDefaultAdapter,
    guestOrderAdapter,
    catalogAPI,
    organizationAPI,
    userAPI,
  };
}
