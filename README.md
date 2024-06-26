<p align="center"><img width="300px" src="docs/logo.png" />
</p>
<h1 align="center" >nodeblocks-service-template</h1>
<p align="center">A nodeblocks service template using a guest order as example</p>

---

## 🔰 Setup

**Install NVM**

- [OSX / Linux](https://github.com/nvm-sh/nvm#installing-and-updating)
- [Windows](https://github.com/coreybutler/nvm-windows)

**Set Node Version**

```sh
nvm use
```

## 🛠 Environment Variables

#### Global Variables

`NODEBLOCKS_DEV_TOKEN` is required to install private packages. This token will be provided by Nodeblocks team. Set `NODEBLOCKS_DEV_TOKEN` in your local environment before proceeding.

```sh
export NODEBLOCKS_DEV_TOKEN=__INSERT_YOUR_TOKEN_HERE__
```

#### Project Variables

**Initialize the env file:**

```sh
cp .env.default .env
```

**Set the correct values in the .env file:**

| Name                  | Description                   | Default Value |
| --------------------- | ----------------------------- | ------------- |
| AUTH_ENC_SECRET       | encryption key                | -             |
| AUTH_SIGN_SECRET      | secret key                    | -             |
| DATABASE_URL          | service db url                | -             |
| ORDER_PORT            | port number                   | -             |
| ORDER_ENDPOINT        | order service endpoint        | -             |
| CATALOG_ENDPOINT      | catalog service endpoint      | -             |
| USER_ENDPOINT         | user service endpoint         | -             |
| ORGANIZATION_ENDPOINT | organization service endpoint | -             |

#### ⚠️ NOTE

`AUTH_ENC_SECRET` & `AUTH_ENC_SECRET` should be the same across all services

## 🪄 Usage

**Install project dependencies**

```sh
npm ci
```

**Run**

```sh
npm run start:dev
```

## 🗂️ Folder Structure
The folder structure should look something like this:
```bash
|-- src
    |-- adapter
        |-- guest-orders
            |-- dataServices
            |-- handlers
            `-- validators
    |-- helper
    |-- tests
        |-- api
        `-- unit
            |-- adapter
                |-- guest-orders
                    |-- handlers
                    `-- validators
            |-- helper
```
| Folder                                | Description                                                 |
| ------------------------------------- | ----------------------------------------------------------- |
| src                                   | source folder                                               |
| src/adapter                           | adapters                                                    |
| src/adapter/guest-orders              | guest order adapter files                                   |
| src/adapter/guest-orders/dataServices | guest order data services                                   |
| src/adapter/guest-orders/handlers     | guest order handler functions                               |
| src/adapter/guest-orders/validators   | guest order validators                                      |
| src/helper                            | any utilities or helper functions                           |
| src/tests                             | unit and api tests                                          |
| src/tests/api                         | api tests                                                   |
| src/tests/unit                        | unit tests which should follow the adapter folder structure |


## 🪄 How to Write an Adapter for a Service

### Create Adapter Class

1. First thing to do is create an Adapter class that implements an existing service. In this guest order example, we create an Adapter class that implements `OrderAdapter`.

   ```typescript
   export class GuestOrderAdapter implements OrderAdapter {...}
   ```

2. Just like the default order adapter, it should take 2 arguments: opts and dependencies.

   ```typescript
   constructor(
    opts: GuestOrderAdapterOptions,
    dependencies: defaultAdapter.OrderDefaultAdapterDependencies
   )
   ```

3. The basic class properties should be: `adapterName`, `authSecrets`, `opts`, `dependencies`, `dataServices`

   ```typescript
   adapterName = ADAPTER_NAME;
   authSecrets: crypto.AuthSecrets;
   opts: Required<
    Omit<GuestOrderAdapterOptions, keyof crypto.AuthSecrets>
   >;
   dependencies: defaultAdapter.OrderDefaultAdapterDependencies;
   dataServices: {
    guestOrder: GuestOrderDataService;
   };
   ```

4. Create the handlers. These objects should include the handler function itself, and any validators.

    a. The handler function should accept a `logger` and `context` as arguments and then return an object with `data` and `status`.

    ```typescript
    this.getGuestOrder = {
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
      ...
    };
    ```

    ```typescript
    export async function getGuestOrderHandler(
      guestOrderService: Pick<GuestOrderDataService, 'getOneGuestOrderByOrgId' | 'prepareGuestOrderResponse'>,
      logger: Logger,
      context: adapter.AdapterHandlerContext
    ) {
      const { params } = context;
      ...
      return {
        data: expandedGuestOrder,
        status: util.StatusCodes.OK,
      };
    }
    ```

    b. The validators assure that the requests match or follow a set of rules. Common validators are `authentication` and `authorization` which make sure the user is logged in and is allowed access to the service. You can also use validators to check if an item exists. For example, you can use authorization to make sure the user is an admin, and if the organization exists in the params.

    ```typescript
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
    ```

    c. If you aren't using any of the standard handlers, you can use the `notFoundHandler` handler.
    ```typescript
    this.createOrder = {
      handler: adapter.notFoundHandler,
      validators: {},
    };
    ```