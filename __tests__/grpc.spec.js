const { getTronscanNodes } = require('../src/utils/nodes');
const { GrpcClient } = require('../src');

describe('GrpcClient', async () => {
  let testNode;
  let client;

  beforeAll(async () => {
    testNode = await getTronscanNodes();

    client = new GrpcClient({
      hostname: testNode[0].ip,
      port: 50051,
    });
  });

  it('should retrieve the last block', async () => {
    const block = await client.getLatestBlock();
    expect(block).toBeDefined();
    const blockByNumber = await client.getBlockByNumber(block.number);
    expect(blockByNumber).toBeDefined();
  });

  it('should retrieve a list of witnesses', async () => {
    const witnesses = await client.getWitnesses();
    expect(witnesses.length).toBeGreaterThan(0);
  });
});
