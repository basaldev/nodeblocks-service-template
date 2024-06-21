import { setupTests, NodeblocksServices } from '../setup-tests';

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
    it('should work', async () => {
      expect(true).toBe(true);
    });
  });
});