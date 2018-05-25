const {
  EmptyMessage, NumberMessage, BytesMessage, TimeMessage,
} = require('../protocol/api/api_pb');
const {
  getBase58CheckAddress, passwordToAddress, decode58Check,
} = require('../utils/crypto');
const { byteArray2hexStr, bytesToString } = require('../utils/bytes');
const { deserializeTransaction } = require('../protocol/serializer');
const { Account } = require('../protocol/core/Tron_pb');
const { WalletSolidityClient } = require('../protocol/api/api_grpc_pb');
const caller = require('grpc-caller');
const { stringToBytes, hexStr2byteArray } = require('../lib/code');

class SolidityGrpcClient {
  constructor(options) {
    this.hostname = options.hostname;
    this.port = options.port;

    /**
     * @type {WalletClient}
     */
    this.api = caller(`${this.hostname}:${this.port}`, WalletSolidityClient);
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
      abbr: ai.getAbbr(),
    }));
    return assetsList;
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
      abbr: assetIssue.getAbbr(),
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
    const block = blockRaw.toObject();
    const rawData = blockRaw.getBlockHeader().getRawData();
    block.transactionsList = blockRaw.getTransactionsList().map(tx => deserializeTransaction(tx)[0]);
    block.transactionsCount = block.transactionsList.length;
    block.totalTrx = block.transactionsList.reduce((t, n) => t + ((n && n.amount) ? n.amount : 0), 0);
    block.size = blockRaw.serializeBinary().length;
    block.time = rawData.getTimestamp();
    block.witnessAddress = getBase58CheckAddress(Array.from(rawData.getWitnessAddress())),
    block.number = rawData.getNumber();
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
    lastBlock.transactionsList = lastBlockRaw.getTransactionsList().map(tx => deserializeTransaction(tx)[0]);
    lastBlock.transactionsCount = lastBlock.transactionsList.length;
    lastBlock.totalTrx = lastBlock.transactionsList.reduce((t, n) => t + ((n && n.amount) ? n.amount : 0), 0);
    lastBlock.size = rawData.serializeBinary().length;
    lastBlock.time = rawData.getTimestamp();
    lastBlock.witnessAddress = getBase58CheckAddress(Array.from(rawData.getWitnessAddress())),
    lastBlock.number = rawData.getNumber();
    lastBlock.parentHash = byteArray2hexStr(rawData.getParenthash());
    delete lastBlock.blockHeader;
    return lastBlock;
  }

  async getTransactionById(txHash) {
    const txByte = new BytesMessage();
    txByte.setValue(new Uint8Array(hexStr2byteArray(txHash)));
    const transaction = await this.api.getTransactionById(txByte);
    return transaction.toObject();
  }

  async getTransactionsToThis(address) {
    const accountArg = new Account();
    accountArg.setAddress(new Uint8Array(decode58Check(address)));
    const accountRaw = await this.api.getTransactionsToThis(accountArg);
    const account = accountRaw.getTransactionList().map(tx => deserializeTransaction(tx)[0]);
    return account.filter(x => !!x);
  }

  async getTransactionsFromThis(address) {
    const accountArg = new Account();
    accountArg.setAddress(new Uint8Array(decode58Check(address)));
    const accountRaw = await this.api.getTransactionsFromThis(accountArg);
    const account = accountRaw.getTransactionList().map(tx => deserializeTransaction(tx)[0]);
    return account.filter(x => !!x);
  }

  async getTransactionsByTimestamp(init, end) {
    const timeArg = new TimeMessage();
    timeArg.setBegininmilliseconds(init);
    timeArg.setEndinmilliseconds(end);
    const txBwTime = await this.api.getTransactionsByTimestamp(timeArg);
    const txs = txBwTime.getTransactionList().map(tx => deserializeTransaction(tx)[0]);
    return txs.filter(x => !!x);
  }

  async getTotalTransaction() {
    const totalTransactions = await this.api.totalTransaction(new EmptyMessage());
    return totalTransactions.toObject().num;
  }
}

module.exports = SolidityGrpcClient;
