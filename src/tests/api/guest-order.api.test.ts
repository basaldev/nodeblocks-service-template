import { setupTests, NodeblocksServices } from '../setup-tests';
import {
  createUser,
  createAdminUser,
  createOrganization,
  createCategory,
  createProduct,
  tokenVerification,
} from '../create-data';
import { Organization, ProductResponse, ProductVariantResponse, UserResponse } from '@basaldev/blocks-default-adapter-api';
import { util } from '@basaldev/blocks-backend-sdk';
import { GuestOrder } from '../../adapter/guest-orders/types';
import request from 'supertest';

describe('Guest Order API', () => {
  let blockServices: NodeblocksServices;
  let organization: Organization;
  let product: ProductResponse;
  let adminUserInfo: {
    user: UserResponse,
    token: string,
  };
  let regularUserInfo: {
    user: UserResponse,
    token: string,
  };
  let guestOrders: GuestOrder[] = [];

  const dummyAdminUserEmail = 'admin@dummy.com';
  const dummyAdminUserName = 'Dummy Admin';
  const dummyRegularUserEmail = 'regular@dummy.com';
  const dummyRegularUserName = 'Dummy Regular';
  const dummyCategoryName = 'dummy-category';
  const dummyProductName = 'Dummy Product';
  const dummyVariantSku = 'dummy-sku-1';
  const dummyVariantTitle = 'Dummy SKU Title';
  const dummyVariantDescription = 'Dummy Description';
  const dummyCustomer = {
    name: "Dummy Name",
    nameKana: "ダミー",
    addressLine1: "1-2-3 Dummy",
    phone: "55-555-5555",
    email: "Dummy@name.com",
  };

  beforeAll(async () => {
    blockServices = await setupTests();

    adminUserInfo = await createAdminUser(
      blockServices.userAPI,
      blockServices.db,
      {
        email: dummyAdminUserEmail,
        name: dummyAdminUserName,
      }
    );
    regularUserInfo = await createUser(
      blockServices.userAPI,
      {
        email: dummyRegularUserEmail,
        name: dummyRegularUserName,
      }
    );

    organization = await createOrganization(
      blockServices.db,
      blockServices.organizationAPI,
      adminUserInfo.user.id
    );

    const categoryId = await createCategory(
      blockServices.db,
      dummyCategoryName
    );

    product = await createProduct(
      blockServices.catalogAPI,
      {
        categoryId: categoryId,
        organizationId: organization.id,
        productName: dummyProductName,
        variants: [{
          sku: dummyVariantSku,
          title: dummyVariantTitle,
          description: dummyVariantDescription,
        }],
      }
    );

    const guestOrderResponse = await request(blockServices.guestOrderServer)
      .post(`/orgs/${organization.id}/guest/orders`)
      .set('Accept', 'application/json')
      .send({
        items: [{
          productId: product.id,
          variantId: (product.variants[0] as ProductVariantResponse).id,
          quantity: 1
        }],
        customer: dummyCustomer,
      })
      .expect(201);
    guestOrders.push(guestOrderResponse.body);
  });

  afterAll(async () => {
    await blockServices.db.collection('guest_orders').deleteMany({});
    await blockServices.db.collection('products').deleteMany({});
    await blockServices.db.collection('productVariants').deleteMany({});
    await blockServices.db.collection('organizations').deleteMany({});
    await blockServices.db.collection('categories').deleteMany({});
    await blockServices.db.collection('users').deleteMany({});
    blockServices.guestOrderServer.close();
    blockServices.catalogServer.close();
    blockServices.organizationServer.close();
  });

  describe('Create Guest Order', () => {
    it('should return 201 and successfully create a guest order', async () => {
      const guestOrderPayload = {
        items: [{
          productId: product.id,
          variantId: (product.variants[0] as ProductVariantResponse).id,
          quantity: 3
        }],
        customer: dummyCustomer,
      };

      await request(blockServices.guestOrderServer)
        .post(`/orgs/${organization.id}/guest/orders`)
        .set('Accept', 'application/json')
        .send(guestOrderPayload)
        .expect(201);
    });

    it('should return 404 error when organization does not exist', async () => {
      const guestOrderPayload = {
        items: [{
          productId: product.id,
          variantId: (product.variants[0] as ProductVariantResponse).id,
          quantity: 3
        }],
        customer: dummyCustomer,
      };

      await request(blockServices.guestOrderServer)
        .post(`/orgs/non-existent-org/guest/orders`)
        .set('Accept', 'application/json')
        .send(guestOrderPayload)
        .expect(404);
    });

    it('should return 400 error when body is invalid', async () => {
      const guestOrderPayload = {
        guestOrder: 'incorrect',
      };

      await request(blockServices.guestOrderServer)
        .post(`/orgs/${organization.id}/guest/orders`)
        .set('Accept', 'application/json')
        .send(guestOrderPayload)
        .expect(400);
    });

    it('should return 400 error when product does not contain variant', async () => {
      const guestOrderPayload = {
        items: [{
          productId: product.id,
          variantId: 'non-existent-variant-id',
          quantity: 1
        }],
        customer: dummyCustomer,
      };

      await request(blockServices.guestOrderServer)
        .post(`/orgs/${organization.id}/guest/orders`)
        .set('Accept', 'application/json')
        .send(guestOrderPayload)
        .expect(400);
    });
  });

  describe('List Guest Orders', () => {
    it('should return list of guest orders', async () => {
      const response = await request(blockServices.guestOrderServer)
        .get(`/orgs/${organization.id}/guest/orders`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${adminUserInfo.token}`)
        .set(util.X_NB_FINGERPRINT, tokenVerification.fingerprint)
        .expect(200);

      expect(response.body.value[0]).toEqual(guestOrders[0]);
    });

    it('should return 401 when user is not logged in', async () => {
      await request(blockServices.guestOrderServer)
        .get(`/orgs/${organization.id}/guest/orders`)
        .set('Accept', 'application/json')
        .expect(401);
    });

    it('should return 403 when user is not an admin', async () => {
      await request(blockServices.guestOrderServer)
        .get(`/orgs/${organization.id}/guest/orders`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${regularUserInfo.token}`)
        .set(util.X_NB_FINGERPRINT, tokenVerification.fingerprint)
        .expect(403);
    });

    it('should return 404 error when organization does not exist', async () => {
      await request(blockServices.guestOrderServer)
        .get(`/orgs/non-existent-org/guest/orders`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${adminUserInfo.token}`)
        .set(util.X_NB_FINGERPRINT, tokenVerification.fingerprint)
        .expect(404);
    });
  });

  describe('Get Guest Order', () => {
    it('should get a guest order', async () => {
      const response = await request(blockServices.guestOrderServer)
        .get(`/orgs/${organization.id}/guest/orders/${guestOrders[0].id}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${adminUserInfo.token}`)
        .set(util.X_NB_FINGERPRINT, tokenVerification.fingerprint)
        .expect(200);

      expect(response.body).toEqual(guestOrders[0]);
    });

    it('should get a guest order with expand items', async () => {
      const response = await request(blockServices.guestOrderServer)
        .get(`/orgs/${organization.id}/guest/orders/${guestOrders[0].id}?$expand=organization,lineItems.product,lineItems.variant`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${adminUserInfo.token}`)
        .set(util.X_NB_FINGERPRINT, tokenVerification.fingerprint)
        .expect(200);

      expect(response.body).toMatchObject({
        ...guestOrders[0],
        lineItems: [{
          productName: product.name,
          quantity: 1,
          sku: (product.variants[0] as ProductVariantResponse).sku,
          variantTitle: dummyVariantTitle,
          product,
          variants: {
            description: (product.variants[0] as ProductVariantResponse).description,
            id: (product.variants[0] as ProductVariantResponse).id,
            productId: (product.variants[0] as ProductVariantResponse).productId,
            sku: (product.variants[0] as ProductVariantResponse).sku,
            title: (product.variants[0] as ProductVariantResponse).title,
          },
        }],
        organization: {
          ...organization,
          status: 'normal',
        },
      });
    });

    it('should return 401 when user is not logged in', async () => {
      await request(blockServices.guestOrderServer)
        .get(`/orgs/${organization.id}/guest/orders/${guestOrders[0].id}`)
        .set('Accept', 'application/json')
        .expect(401);
    });

    it('should return 403 when user is not an admin', async () => {
      await request(blockServices.guestOrderServer)
        .get(`/orgs/${organization.id}/guest/orders/${guestOrders[0].id}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${regularUserInfo.token}`)
        .set(util.X_NB_FINGERPRINT, tokenVerification.fingerprint)
        .expect(403);
    });

    it('should return 404 error when guest order does not belong to organization', async () => {
      await request(blockServices.guestOrderServer)
        .get(`/orgs/different-org/guest/orders/${guestOrders[0].id}`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${adminUserInfo.token}`)
        .set(util.X_NB_FINGERPRINT, tokenVerification.fingerprint)
        .expect(404);
    });
  });
});
