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


## 👩🏻‍🔧 Writing an Adapter for a Service

The Adapter is a class that handles the endpoint handlers, validators, and other options and dependencies. Here's an overview of the Adapter Class.

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

3. The basic class properties should be: `adapterName`, `authSecrets`, `opts`, `dependencies`, `dataServices`.

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

## 🥌 Creating Handlers

The handlers contain the logic of the endpoints. Here you would retrieve information, manipulate the data, and return the data. You can also throw `NBError`s that would send a specific HTTP status code.

Here is the `getGuestOrderHandler()` function. It basically receives the `orderId` and the `orgId` from the `params` `context`, fetches the data from the `dataService`, normalizes and/or expands the data, then returns the data and the HTTP status.

```typescript
export async function getGuestOrderHandler(
  guestOrderService: Pick<GuestOrderDataService, 'getOneGuestOrderByOrgId' | 'prepareGuestOrderResponse'>,
  logger: Logger,
  context: adapter.AdapterHandlerContext
) {
  logger.info('getGuestOrderHandler');
  const { params } = context;
  const guestOrder = await guestOrderService.getOneGuestOrderByOrgId(params?.orderId, params?.orgId);
  if (!guestOrder) {
    throw new NBError({
      code: defaultAdapter.ErrorCode.notFound,
      httpCode: util.StatusCodes.NOT_FOUND,
      message: 'operation failed to get an order',
    });
  }

  const expandedGuestOrder = await guestOrderService.prepareGuestOrderResponse(
    get(context, 'query.$expand', '').toString(),
    guestOrder
  );

  return {
    data: expandedGuestOrder,
    status: util.StatusCodes.OK,
  };
}
```

## 🚓 Validators

Validators are basic predicate functions that return OK HTTP status or throws an error. The 2 basic validators are `authentication` and `authorization`. You can create your own custom validators too, but below are 2 common validators.

### Authentication Validator

A common authentication validator is `security.createIsAuthenticatedValidator()` and it exists in `blocks-backend-sdk`. It accepts the authSecrets defined in the environment variables and an authenticate function from `blocks-auth-service`.

```typescript
validators: {
  authentication: security.createIsAuthenticatedValidator(
    this.authSecrets,
    this.opts.authenticate
  ),
  ...
},
```

### Authorization Validator

This authorizes the user to access the endpoint. An example of a common authorization validator is the `createIsAdminUserValidator()` which checks to make sure the user is an admin user.

```typescript
authorization: this.dependencies.userAPI.createIsAdminUserValidator(
 this.authSecrets
),
```

### Some() validator utility

Found in the `blocks-backed-sdk` service, you can use this if you want to validate between 2 or more validators. It will return the first successful (200 or 201) status. It will also return all the errors that was thrown. Simple example:

```typescript
authorization: security.some(
  security.createIsMeValidator(
    userAdapter.authSecrets,
    { name: 'id', type: 'params' },
    userAdapter.opts.authenticate
  ),
  partial(
    defaultAdapter.isAdmin,
    userAdapter.authSecrets,
    userAdapter.opts.authenticate,
    userAdapter.dataServices.user
  ),
  partial(
    isClinic,
    ['010', '001'],
    userAdapter.authSecrets,
    userAdapter.opts.authenticate,
    userAdapter.dataServices.user
  ),
),
```

## 🎼 Schema Validator

This validation makes sure the user has used the correct params, query, or body fields when accessing an endpoint. We use `ajv` for schema validation. And you should add this as a validator using the `security.createValidRequestPredicate()` function in `blocks-backend-sdk`. Below is a simple schema in `ajv` and its usage as a validator.

- ### Schema example
  ```typescript
  export function createSampleItem(
    customFields: util.CustomField[]
  ): JSONSchemaType<CreateSampleItemRequest> {
    return {
      additionalProperties: false,
      properties: {
        customFields: util.createCustomFieldAjvSchemaComponent(customFields),
        sample: { isNotEmpty: true, type: 'string' },
        sampleItems: {
          properties: {
            item: { nullable: true, type: 'string' },
            qty: { nullable: true, type: 'number' },
          },
          type: 'object',
        },
      },
      required: ['sample'],
      type: 'object',
    };
  }
  ```

- ### Validator example
  ```typescript
  validBody: security.createValidRequestPredicate(
    createSampleItem(this.opts.customFields?.sample ?? []),
    'body'
  ),
  ```

## 🛠️ Custom Validator

Aside from the validators mentioned, you can create your own custom validator. You can also use `security.some()` if you so choose. When creating a custom validator, be sure to return a 200 or 201 successful HTTP response or throw an error. Here's an example:

```typescript
export async function guestOrderBelongsToOrganization(
  guestOrderService: Pick<GuestOrderDataService, 'getOneOrder'>,
  organizationAPI: Pick<OrganizationDefaultAdapterAPI, 'getOrganizationById'>,
  orgIdTargetField: security.TargetField,
  orderIdTargetField: security.TargetField,
  logger: Logger,
  context: adapter.AdapterHandlerContext
) {
  const organizationId = get(
    context,
    [orgIdTargetField.type, orgIdTargetField.name],
    null
  );
  const organization = await organizationAPI.getOrganizationById(
    organizationId
  );
  if (!organization) {
    throw new NBError({
      code: defaultAdapter.ErrorCode.notFound,
      httpCode: util.StatusCodes.NOT_FOUND,
      message: `orgId ${organizationId} cannot be found`,
    });
  }

  const orderId = get(
    context,
    [orderIdTargetField.type, orderIdTargetField.name],
    null
  );
  const order = await guestOrderService.getOneOrder(orderId);
  if (!order) {
    throw new NBError({
      code: defaultAdapter.ErrorCode.notFound,
      httpCode: util.StatusCodes.NOT_FOUND,
      message: `orderId ${orderId} cannot be found`,
    });
  }

  if (order.organizationId === organization.id) {
    return util.StatusCodes.OK;
  }

  throw new NBError({
    code: defaultAdapter.ErrorCode.noPermission,
    httpCode: util.StatusCodes.FORBIDDEN,
    message: `order: orderId=${orderId} does not belong to organization: orgId=${organizationId}`,
  });
}
```