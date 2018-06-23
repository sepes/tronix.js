const {
  EmptyMessage, NumberMessage, BytesMessage, BlockLimit,
} = require('../protocol/api/api_pb');
const {
  getBase58CheckAddress, passwordToAddress, decode58Check,
} = require('../utils/crypto');
const { bytesToString } = require('../utils/bytes');
const { deserializeTransaction } = require('../utils/transaction');
const { Account } = require('../protocol/core/Tron_pb');
const { WalletClient } = require('../protocol/api/api_grpc_pb');
const caller = require('grpc-caller');
const { stringToBytes, hexStr2byteArray } = require('../lib/code');
const { deserializeBlock, deserializeBlocks } = require('../utils/block');

class GrpcClient {
  constructor(options) {
    this.hostname = options.hostname;
    this.port = options.port || 50051;

    /**
     * @type {WalletClient}
     */
    this.api = caller(`${this.hostname}:${this.port}`, WalletClient);
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
   * Retrieve all connected nodes
   *
   * @returns {Promise<*>}
   */
  getNodes() {
    return this.api.listNodes(new EmptyMessage())
      .then(x => x.getNodesList());
  }

  async getAssetIssueList() {
    const assetsListRaw = await this.api.getAssetIssueList(new EmptyMessage())
      .then(x => x.getAssetissueList());
    return assetsListRaw.map(ai => ({
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
  }

  async getAssetIssueByName(assetName) {
    const assetByte = new BytesMessage();
    assetByte.setValue(new Uint8Array(stringToBytes(assetName)));

    const assetIssue = await this.api.getAssetIssueByName(assetByte);
    return {
      ownerAddress: getBase58CheckAddress(Array.from(assetIssue.getOwnerAddress())),
      url: bytesToString(assetIssue.getUrl()),
      name: bytesToString(assetIssue.getName()),
      description: bytesToString(assetIssue.getDescription()),
      startTime: assetIssue.getStartTime(),
      endTime: assetIssue.getEndTime(),
      voteScore: assetIssue.getVoteScore(),
      totalSupply: assetIssue.getTotalSupply(),
      trxNum: assetIssue.getTrxNum() / 1000,
      num: assetIssue.getNum(),
      frozenSupplyList: assetIssue.getFrozenSupplyList(),
      abbr: bytesToString(assetIssue.getAbbr()),
    };
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
    return deserializeBlock(blockRaw);
  }

  async getBlockByLimitNext(start, end) {
    const message = new BlockLimit();
    message.setStartnum(start);
    message.setEndnum(end);
    const blocksRaw = await this.api.getBlockByLimitNext(message);
    return deserializeBlocks(blocksRaw);
  }

  async getBlockByLatestNum(limit = 1) {
    const message = new NumberMessage();
    message.setNum(limit);
    const blocksRaw = await this.api.getBlockByLatestNum(message);
    return deserializeBlocks(blocksRaw);
  }

  /**
   * Retrieve latest block
   *
   * @returns {Promise<*>}
   */
  async getLatestBlock() {
    const lastBlockRaw = await this.api.getNowBlock(new EmptyMessage());
    return deserializeBlock(lastBlockRaw);
  }

  async getTransactionById(txHash) {
    const txByte = new BytesMessage();
    txByte.setValue(new Uint8Array(hexStr2byteArray(txHash.toUpperCase())));
    const transaction = await this.api.getTransactionById(txByte);
    return deserializeTransaction(transaction)[0];
  }

  async getTotalTransaction() {
    const totalTransactions = await this.api.totalTransaction(new EmptyMessage());
    return totalTransactions.toObject().num;
  }

  async getNextMaintenanceTime() {
    const nextMaintenanceTime = await this.api.getNextMaintenanceTime(new EmptyMessage());
    return nextMaintenanceTime.toObject();
  }

  async broadcastTransaction(transaction) {
    const broadcastTransactionAnswer = await this.api.broadcastTransaction(transaction);
    return broadcastTransactionAnswer.toObject();
  }
}

module.exports = GrpcClient;
