import { Server } from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  BunyanLoggerFactory,
  mongo,
  crypto,
} from '@basaldev/blocks-backend-sdk';
import { bucketMock } from './mock';

import {
  UserDefaultAdapterRestSdk,
  CatalogDefaultAdapterRestSdk,
  OrganizationDefaultAdapterRestSdk,
} from '@basaldev/blocks-default-adapter-api';
import {
  defaultAdapter as CatalogAdapter,
  createNodeblocksCatalogApp,
} from '@basaldev/blocks-catalog-service';
import {
  defaultAdapter as OrganizationAdapter,
  createNodeblocksOrganizationApp,
} from '@basaldev/blocks-organization-service';

import { GuestOrderDefaultAdapter, ADAPTER_NAME } from '../../src/adapter'
import { createNodeblockGuestsOrderApp } from '../createNodeblocksGuestOrderApp';

export interface NodeblocksServices {
  catalogServer: Server,
  organizationServer: Server,
  guestOrderServer: Server,
  catalogDefaultAdapter: CatalogAdapter.CatalogDefaultAdapter,
  organizationDefaultAdapter: OrganizationAdapter.OrganizationDefaultAdapter,
  guestOrderAdapter: GuestOrderDefaultAdapter,
  catalogAPI: CatalogDefaultAdapterRestSdk,
  organizationAPI: OrganizationDefaultAdapterRestSdk;
}

export const authSecrets: crypto.AuthSecrets = {
  authEncSecret: 'test_enc_secret-test_enc_secret-test_enc_secret',
  authSignSecret: 'test_sign_secret-test_sign_secret-test_sign_secret',
};

export const USER_PORT = 3001;
export const ORGANIZATION_PORT = 3003;
export const CATALOG_PORT = 3004;
export const GUEST_ORDER_PORT = 3005;
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
  process.env.NODE_ENV = 'test';
  process.env.DB_URL = uri;

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

  const guestOrderAdapter = new GuestOrderDefaultAdapter(
    {
      authEncSecret: authSecrets.authEncSecret,
      authSignSecret: authSecrets.authSignSecret,
      serviceEndpoints: { guestOrder: GUEST_ORDER_SERVER_URL },
    },
    { catalogAPI, db, organizationAPI }
  );

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

  const guestOrderServer = await createNodeblockGuestsOrderApp({
    corsOrigin: /.*/,
  }).startService({
    PORT: GUEST_ORDER_PORT,
    adapter: guestOrderAdapter,
    env: 'development',
  });

  return {
    catalogServer,
    organizationServer,
    guestOrderServer,
    catalogDefaultAdapter,
    organizationDefaultAdapter,
    guestOrderAdapter,
    catalogAPI,
    organizationAPI,
  };
}
