import {
  UserDefaultAdapterRestSdk,
  CatalogDefaultAdapterRestSdk,
  OrganizationDefaultAdapterRestSdk,
} from '@basaldev/blocks-default-adapter-api';
import { mongo, crypto } from '@basaldev/blocks-backend-sdk';
import { CreateProductDto } from '@basaldev/blocks-default-adapter-api';
import {
  ProductResponse,
} from '@basaldev/blocks-default-adapter-api/dist/catalog.type';
import { authSecrets } from './setup-tests';

export const tokenVerification: crypto.TokenVerification = {
  domain: 'localhost',
  fingerprint: 'aaaaaaaaaaa',
  ip: '::ffff:127.0.0.1',
};

export interface CreateProductVariant {
  sku: string;
  title: string;
  description: string;
}

export interface CreateProductPayloadItem {
  categoryId: string;
  organizationId: string;
  productName: string;
  variants: CreateProductVariant[];
}

export async function createUser(
  userAPI: UserDefaultAdapterRestSdk,
  data: { email: string; name: string }
) {
  const user = await userAPI.createUser({
    avatar: `http://testUserId.avatar.mock.com/avatars/testUserId`,
    email: data.email,
    name: data.name,
    password: 'abcdefg123',
    typeId: '001',
  });
  const token = crypto.generateUserAccessToken(
    authSecrets,
    user.id,
    tokenVerification
  );
  return {
    user,
    token,
  };
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

  const token = crypto.generateUserAccessToken(
    authSecrets,
    adminUser.id,
    tokenVerification
  );
  return {
    user: {
      ...adminUser,
      typeId: '100',
    },
    token: token,
  };
}

export async function createOrganization(
  db: mongo.Db,
  organizationAPI: OrganizationDefaultAdapterRestSdk,
  ownerId: string,
  orgName?: string
) {
  const organization = await organizationAPI.createOrganization({
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

  await db.collection('organizations').updateOne({ id: organization.id }, { $set: { status: 'normal' } });
  return organization;
}

export async function createCategory(db: mongo.Db, name: string, description?: string) {
  const result = await db.collection('categories').insertOne({
    description: description ?? 'description',
    icon: null,
    name,
  });
  return result.insertedId.toString();
}

export async function createProduct(
  catalogAPI: CatalogDefaultAdapterRestSdk,
  payloadItem: CreateProductPayloadItem,
  payloadOverrides?: Partial<CreateProductDto>
): Promise<ProductResponse> {
  const date: Date = new Date();
  const firstDay = getFirstDayOfMonth(date.getFullYear(), date.getMonth());
  const lastDay = getLastDayOfMonth(date.getFullYear(), date.getMonth());
  const payload = {
    additionalInformation: '',
    categoryId: payloadItem.categoryId,
    description: '',
    dimensions: '',
    features: [],
    locationIds: [],
    name: payloadItem.productName,
    publication: {
      since: firstDay,
      status: 'ACTIVE' as const,
      until: lastDay,
    },
    tags: ['tag1', 'tag2'],
    variantNote: '',
    variants: payloadItem.variants,
    ...payloadOverrides,
  };

  const product = await catalogAPI.createProduct({
    orgId: payloadItem.organizationId,
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
