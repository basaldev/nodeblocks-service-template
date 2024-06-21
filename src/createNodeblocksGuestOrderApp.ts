import {
  util,
  route,
  LoggerOpts,
  app as backendSdkApp,
  LoggerFactory,
  BunyanLoggerFactory,
  detectVersionInfo,
} from '@basaldev/blocks-backend-sdk';
import { GuestOrderAdapter } from './adapter/guest-orders/types';
import { predefinedRoutes } from './routes';
import { uniqBy } from 'lodash';

const PACKAGE = require('../package.json');
const SERVICE_NAME = 'blocks-guest-order';
const VERSION_INFO = detectVersionInfo(PACKAGE);

export type ServiceOpts = {
  PORT: number;
  adapter: GuestOrderAdapter | Promise<GuestOrderAdapter>;
  corsOrigin?: string | RegExp | (string | RegExp)[];
  customRoutes?: route.Route[];
  env?: 'production' | 'development';
  loggerOpts?: LoggerOpts;
};

export type OrderAppConfig = backendSdkApp.CreateNodeblocksAppOptions & {
  sanitizeOptions?: util.SanitizeOptions;
};

export function createNodeblockGuestsOrderApp(appConfig?: OrderAppConfig) {
  const app = backendSdkApp.createNodeblocksApp(appConfig);

  return {
    ...app,
    startService: async (
      opts: ServiceOpts,
      dependencies?: {
        loggerFactory?: LoggerFactory;
      }
    ) => {
      const { PORT, customRoutes, env } = opts;
      const adapter = await opts.adapter;

      const loggerFactory =
        dependencies?.loggerFactory ??
        new BunyanLoggerFactory({
          ...opts.loggerOpts,
          adapter: adapter.adapterName,
          env: env ?? 'production',
          name: SERVICE_NAME,
          port: PORT,
        });
      const logger = loggerFactory.createLogger();

      app.get('/ping', async (req, res) => {
        res.json({
          packageInfo: VERSION_INFO,
          status: 'ok',
        });
      });
      const routesToProceed = uniqBy(
        [...(customRoutes || []), ...predefinedRoutes(adapter)],
        (v) => `${v.method}_${v.path}`
      );
      app.use(
        route.createRoutes(routesToProceed, {
          adapterName: adapter.adapterName,
          loggerFactory,
          sanitizeOptions: appConfig?.sanitizeOptions,
        })
      );

      logger.info('🔄 Starting…');
      const server = app.listen(PORT as number, () => {
        logger.info(`🚀 Now listening on port ${PORT}`);
      });
      process.on('SIGINT', () => {
        logger.info('🚪 Shutting down…');
        process.exit();
      });
      return server;
    },
  };
}