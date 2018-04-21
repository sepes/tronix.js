const {HttpClient} = require("../src");
const assert = require("assert");

describe('http client', () => {

  // return;

  let client = new HttpClient();

  it('show latest block', async () => {
    let latestBlock = await client.getLatestBlock();
  });

  it('show latest 7 blocks', async () => {
    let lastBlocks = await client.getLastBlocks(2);
    lastBlocks.forEach(block => {
      console.log("BLOCK: ", block.number);
    });
  });

  it('show account info', async () => {
    let accountInfo = await client.getAccount('27SY3bmDpWTJEMGCzbRbbtEvjTMgzDibC8C');
  });

});
