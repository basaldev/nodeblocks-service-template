import {
  UserDefaultAdapterRestSdk,
  CatalogDefaultAdapterRestSdk,
  OrganizationDefaultAdapterRestSdk,
} from '@basaldev/blocks-default-adapter-api';
import { ProductItem } from '../../src/adapter/guest-orders/types';
import {
  defaultAdapter as CatalogAdapter,
  createNodeblocksCatalogApp,
} from '@basaldev/blocks-catalog-service';

import { Logger, mongo } from '@basaldev/blocks-backend-sdk';
import { CreateProductDto } from '@basaldev/blocks-default-adapter-api';
import {
  ProductResponse,
  ProductVariantResponse,
} from '@basaldev/blocks-default-adapter-api/dist/catalog.type';

export async function createUser(
  userAPI: UserDefaultAdapterRestSdk,
  data: { email: string; name: string }
) {
  return await userAPI.createUser({
    avatar: `http://testUserId.avatar.mock.com/avatars/testUserId`,
    email: data.email,
    name: data.name,
    password: 'abcdefg123',
    typeId: '001',
  });
}

export async function createCustomer(
  userAPI: UserDefaultAdapterRestSdk,
  data: { email: string; name: string }
) {
  return await userAPI.createUser({
    avatar: `http://testUserId.avatar.mock.com/avatars/testUserId`,
    email: data.email,
    name: data.name,
    password: 'abcdefg123',
    typeId: '000',
  });
}

export async function createAdminUser(
  userAPI: UserDefaultAdapterRestSdk,
  db: mongo.Db,
  data: { email: string; name: string }
) {
  const adminUser = await userAPI.createUser({
    avatar: `http://testUserId.avatar.mock.com/avatars/testUserId`,
    email: data.email,
    name: data.name,
    password: 'abcdefg123',
    typeId: '001',
  });
  await db
    .collection('users')
    .updateOne({ id: adminUser.id }, { $set: { typeId: '100' } });
  return {
    ...adminUser,
    typeId: '100',
  };
}

export async function createOrganization(
  organizationAPI: OrganizationDefaultAdapterRestSdk,
  ownerId: string,
  orgName?: string
) {
  return await organizationAPI.createOrganization({
    addressLine1: 'Tokyo',
    certifiedQualifications: [],
    description: 'org description',
    name: orgName || 'testCompany',
    numberOfProjects: '50',
    ownerId,
    phoneNumber: '090-0000-0000',
    postalCode: '1500000',
    qualifications: [],
    size: '50',
    typeId: '001',
  });
}

export async function createCategory(db: mongo.Db, name: string, description?: string) {
  const result = await db.collection('categories').insertOne({
    description: description ?? 'description',
    icon: null,
    name,
  });
  return result.insertedId;
}

export async function createProduct(
  categoryId: string,
  catalogAPI: CatalogDefaultAdapterRestSdk,
  orgId: string,
  productItem: ProductItem,
  payloadOverrides?: Partial<CreateProductDto>
): Promise<ProductResponse> {
  const date: Date = new Date();
  const firstDay = getFirstDayOfMonth(date.getFullYear(), date.getMonth());
  const lastDay = getLastDayOfMonth(date.getFullYear(), date.getMonth());
  const payload = {
    additionalInformation: '',
    categoryId,
    description: '',
    dimensions: '',
    features: [],
    locationIds: [],
    name: productItem.productName,
    publication: {
      since: firstDay,
      status: 'ACTIVE' as const,
      until: lastDay,
    },
    organizationId: orgId,
    tags: ['tag1', 'tag2'],
    variantNote: '',
    variants: productItem.variantTitles.map((variantTitle) => ({
      price: { amount: 1000, currency: 'JPY', taxIncluded: true },
      sku: `SKU-${variantTitle}`,
      title: variantTitle,
    })),
    ...payloadOverrides,
  };

  const product = await catalogAPI.createProduct({
    orgId,
    product: payload,
  });

  return await catalogAPI.getOneProduct({
    expand: 'variants',
    productId: product.id,
  });
}

export function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

export function getLastDayOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0);
}






export const customerData: type.CustomerPayload = {
  addressLine1: 'testAddressLine1',
  addressLine2: 'testAddressLine2',
  addressLine3: 'testAddressLine3',
  age: '20',
  email: 'test@test.com',
  name: 'testName',
  nameKana: 'testNameKana',
  phone: '111-111-1111',
  preferredContactMethod: 'testPreferredContactMethod',
  preferredTimeToContact: 'testPreferredTimeToContact',
};

export const productItems: type.ProductItem[] = [
  {
    productName: 'testProduct_1',
    variantTitles: ['testVariant_1-1', 'testVariant_1-2'],
  },
  {
    productName: 'testProduct_2',
    variantTitles: ['testVariant_2-1'],
  },
];

export async function createProductsAndGetExpectedTotals(
  orgId: string,
  productItems: type.ProductItem[],
  logger: Logger
): Promise<
  [
    {
      customer: typeof customerData;
      items: {
        productId: string;
        quantity: number;
        variantId: string;
      }[];
    },
    ProductResponse[],
    {
      itemTotals: {
        amount: number;
        tax: number;
      }[];
      subtotalPrice: number;
      totalPrice: number;
      totalTax: number;
    },
  ]
> {
  const products = await createProducts(logger, orgId, productItems);

  await globalThis.db
    .collection('products')
    .updateMany({}, { $set: { 'publication.status': 'ACTIVE' } });

  const item1 = products[0];
  const itemsTestData = [
    {
      productId: item1.id,
      quantity: 2,
      variantId: (item1.variants[0] as ProductVariantResponse).id,
    },
    {
      productId: item1.id,
      quantity: 3,
      variantId: (item1.variants[1] as ProductVariantResponse).id,
    },
  ];

  const expectedTotals = {
    itemTotals: [
      {
        amount: 1000,
        tax: 100,
      },
      {
        amount: 1000,
        tax: 100,
      },
    ],
    subtotalPrice: 5000,
    totalPrice: 5500,
    totalTax: 500,
  };

  if (products[1]) {
    const item2 = products[1];
    itemsTestData.push({
      productId: item2.id,
      quantity: 8,
      variantId: (item2.variants[0] as ProductVariantResponse).id,
    });
    expectedTotals.itemTotals.push({
      amount: 1000,
      tax: 100,
    });
    expectedTotals.subtotalPrice += 8000;
    expectedTotals.totalPrice += 8800;
    expectedTotals.totalTax += 800;
  }

  return [
    {
      customer: customerData,
      items: itemsTestData,
    },
    products,
    expectedTotals,
  ];
}
