import {
  crypto,
  mongo,
} from '@basaldev/blocks-backend-sdk';
import { getEnvString } from './helper/utilities';
import { createNodeblockGuestsOrderApp } from './createNodeblocksGuestOrderApp';

import {
  OrganizationDefaultAdapterRestSdk,
  CatalogDefaultAdapterRestSdk,
} from '@basaldev/blocks-default-adapter-api';

import { GuestOrderDefaultAdapter, ADAPTER_NAME } from './adapter';

async function main() {
  const opts = {
    authEncSecret: getEnvString('AUTH_ENC_SECRET', ''),
    authSignSecret: getEnvString('AUTH_SIGN_SECRET', ''),
    serviceEndpoints: {
      guestOrder: getEnvString('ORDER_ENDPOINT', ''),
    },
  };
  const internalToken = crypto.generateAppAccessToken(
    {
      authEncSecret: opts.authEncSecret,
      authSignSecret: opts.authSignSecret,
    },
    ADAPTER_NAME
  );
  const dependencies = {
    catalogAPI: new CatalogDefaultAdapterRestSdk(
      getEnvString('CATALOG_ENDPOINT', ''),
      internalToken
    ),
    db: await mongo.singletonMongoConn(getEnvString('DATABASE_URL', '')),
    organizationAPI: new OrganizationDefaultAdapterRestSdk(
      getEnvString('ORGANIZATION_ENDPOINT', ''),
      internalToken
    ),
  };

  const guestOrderAdapter = new GuestOrderDefaultAdapter(opts, dependencies);

  await createNodeblockGuestsOrderApp({
    corsOrigin: /.*/,
  }).startService({
    PORT: Number(getEnvString('ORDER_PORT', '8081')),
    adapter: guestOrderAdapter,
    env: 'development',
  });
}

void main();
