import {
  UserDefaultAdapterRestSdk,
  CatalogDefaultAdapterRestSdk,
  OrganizationDefaultAdapterRestSdk,
} from '@basaldev/blocks-default-adapter-api';
import { ProductItem } from '../../src/adapter/guest-orders/types';

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

// export async function createProduct(
//   categoryId: string,
//   catalogAPI: CatalogDefaultAdapterRestSdk,
//   orgId: string,
//   productItem: ProductItem,
//   payloadOverrides?: Partial<CreateProductDto>
// ): Promise<ProductResponse> {
//   const date: Date = new Date();
//   const firstDay = getFirstDayOfMonth(date.getFullYear(), date.getMonth());
//   const lastDay = getLastDayOfMonth(date.getFullYear(), date.getMonth());
//   const payload = {
//     additionalInformation: '',
//     categoryId,
//     description: '',
//     dimensions: '',
//     features: [],
//     locationIds: [],
//     name: productItem.productName,
//     publication: {
//       since: firstDay,
//       status: 'ACTIVE' as const,
//       until: lastDay,
//     },
//     organizationId: orgId,
//     tags: ['tag1', 'tag2'],
//     variantNote: '',
//     variants: productItem.variantTitles.map((variantTitle) => ({
//       price: { amount: 1000, currency: 'JPY', taxIncluded: true },
//       sku: `SKU-${variantTitle}`,
//       title: variantTitle,
//     })),
//     ...payloadOverrides,
//   };

//   const product = await catalogAPI.createProduct({
//     orgId,
//     product: payload,
//   });

//   return await catalogAPI.getOneProduct({
//     expand: 'variants',
//     productId: product.id,
//   });
// }

export function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

export function getLastDayOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0);
}
