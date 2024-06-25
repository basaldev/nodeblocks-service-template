import { setupTests, NodeblocksServices } from '../setup-tests';
import request from 'supertest';

describe('Guest Order API', () => {
  let blockServices: NodeblocksServices;

  beforeAll(async () => {
    blockServices = await setupTests();
  });

  afterAll(async () => {
    blockServices.guestOrderServer.close();
    blockServices.catalogServer.close();
    blockServices.organizationServer.close();
  });

  describe('POST /orgs/:orgId/guest/orders', () => {
    it('should create a guest order successfully', async () => {
      const response = await request(blockServices.guestOrderServer)
        .post(`/orgs/${orgId}/orders`)
        .set('Accept', 'application/json')
        .send(payload)
        .expect(201);
    });
  });
});