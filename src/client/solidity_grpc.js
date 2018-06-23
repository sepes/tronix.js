const {
  EmptyMessage, NumberMessage, AccountPaginated,
} = require('../protocol/api/api_pb');
const {
  getBase58CheckAddress, passwordToAddress, decode58Check,
} = require('../utils/crypto');
const { byteArray2hexStr, bytesToString } = require('../utils/bytes');
const { SHA256 } = require('../utils/crypto');
const { deserializeTransactions } = require('../utils/serializer');
const { Account } = require('../protocol/core/Tron_pb');
const { WalletSolidityClient, WalletExtensionClient } = require('../protocol/api/api_grpc_pb');
const caller = require('grpc-caller');

class SolidityGrpcClient {
  constructor(options) {
    this.hostname = options.hostname;
    this.port = options.port;

    /**
     * @type {WalletClient}
     */
    this.api = caller(`${this.hostname}:${this.port}`, WalletSolidityClient);
    this.api_extension = caller(`${this.hostname}:${this.port}`, WalletExtensionClient);
  }

  async getAssetIssueList() {
    const assetsListRaw = await this.api.getAssetIssueList(new EmptyMessage())
      .then(x => x.getAssetissueList());
    const assetsList = assetsListRaw.map(ai => ({
      ownerAddress: getBase58CheckAddress(Array.from(ai.getOwnerAddress())),
      url: bytesToString(ai.getUrl()),
      name: bytesToString(ai.getName()),
      description: bytesToString(ai.getDescription()),
      startTime: ai.getStartTime(),
      endTime: ai.getEndTime(),
      voteScore: ai.getVoteScore(),
      totalSupply: ai.getTotalSupply(),
      trxNum: ai.getTrxNum() / 1000,
      num: ai.getNum(),
      abbr: bytesToString(ai.getAbbr()),
    }));
    return assetsList;
  }

  /**
   * Retrieve all connected witnesses
   *
   * @returns {Promise<*>}
   */
  async getWitnesses() {
    const witnesses = await this.api.listWitnesses(new EmptyMessage())
      .then(x => x.getWitnessesList());
    return witnesses.map((w) => {
      const witness = w.toObject();
      witness.address = getBase58CheckAddress(Array.from(w.getAddress()));
      return witness;
    });
  }

  /**
   * Retrieves a account by the given address
   *
   * @param {address} string account address
   * @returns {Promise<*>}
   */
  async getAccount(address) {
    const accountArg = new Account();
    accountArg.setAddress(new Uint8Array(decode58Check(address)));
    const accountRaw = await this.api.getAccount(accountArg);
    const account = accountRaw.toObject();
    if (account.accountName.length > 0) {
      account.accountName = bytesToString(Array.from(accountRaw.getAccountName()));
    }
    account.address = getBase58CheckAddress(Array.from(accountRaw.getAddress()));
    account.votesList.map((vote) => {
      vote.voteAddress = passwordToAddress(vote.voteAddress);
      return vote;
    });
    account.balance = accountRaw.getBalance() / 1000000;
    account.assetMap = account.assetMap.map(asset => ({
      name: asset[0],
      balance: asset[1],
    }));
    return account;
  }

  /**
   * Retrieves a block by the given number
   *
   * @param {number} number block number
   * @returns {Promise<*>}
   */
  async getBlockByNumber(number) {
    const message = new NumberMessage();
    message.setNum(number);
    const blockRaw = await this.api.getBlockByNum(message);
    const block = blockRaw.toObject();
    const rawData = blockRaw.getBlockHeader().getRawData();
    block.transactionsList = deserializeTransactions(blockRaw.getTransactionsList());
    block.transactionsCount = block.transactionsList.length;
    block.totalTrx = block.transactionsList.reduce((t, n) => t + ((n && n.amount) ? n.amount : 0), 0);
    block.size = blockRaw.serializeBinary().length;
    block.time = rawData.getTimestamp();
    block.witnessAddress = getBase58CheckAddress(Array.from(rawData.getWitnessAddress())),
    block.number = rawData.getNumber();
    block.hash = byteArray2hexStr(SHA256(rawData.serializeBinary()));
    block.parentHash = byteArray2hexStr(rawData.getParenthash());
    delete block.blockHeader;
    return block;
  }

  /**
   * Retrieve latest block
   *
   * @returns {Promise<*>}
   */
  async getLatestBlock() {
    const lastBlockRaw = await this.api.getNowBlock(new EmptyMessage());
    const lastBlock = lastBlockRaw.toObject();
    const rawData = lastBlockRaw.getBlockHeader().getRawData();
    lastBlock.transactionsList = deserializeTransactions(lastBlockRaw.getTransactionsList());
    lastBlock.transactionsCount = lastBlock.transactionsList.length;
    lastBlock.totalTrx = lastBlock.transactionsList.reduce((t, n) => t + ((n && n.amount) ? n.amount : 0), 0);
    lastBlock.size = rawData.serializeBinary().length;
    lastBlock.time = rawData.getTimestamp();
    lastBlock.witnessAddress = getBase58CheckAddress(Array.from(rawData.getWitnessAddress())),
    lastBlock.number = rawData.getNumber();
    lastBlock.hash = byteArray2hexStr(SHA256(rawData.serializeBinary()));
    lastBlock.parentHash = byteArray2hexStr(rawData.getParenthash());
    delete lastBlock.blockHeader;
    return lastBlock;
  }

  async getTransactionsToThis(address, limit = 1000, offset = 0) {
    const accountArg = new Account();
    accountArg.setAddress(new Uint8Array(decode58Check(address)));
    const accountPag = new AccountPaginated();
    accountPag.setAccount(accountArg);
    accountPag.setLimit(limit);
    accountPag.setOffset(offset);
    const accountRaw = await this.api_extension.getTransactionsToThis(accountPag);
    const account = deserializeTransactions(accountRaw.getTransactionList());
    return account;
  }

  async getTransactionsFromThis(address, limit = 1000, offset = 0) {
    const accountArg = new Account();
    accountArg.setAddress(new Uint8Array(decode58Check(address)));
    const accountPag = new AccountPaginated();
    accountPag.setAccount(accountArg);
    accountPag.setLimit(limit);
    accountPag.setOffset(offset);
    const accountRaw = await this.api_extension.getTransactionsFromThis(accountPag);
    const account = deserializeTransactions(accountRaw.getTransactionList());
    return account;
  }
}

module.exports = SolidityGrpcClient;
