const {EmptyMessage, NumberMessage} = require("../protocol/api/api_pb");
const {getBase58CheckAddress, signTransaction, passwordToAddress} = require("../utils/crypto");
const {base64DecodeFromString, byteArray2hexStr, bytesToString} = require("../utils/bytes");
const deserializeTransaction = require("../protocol/serializer").deserializeTransaction;
const {Transaction, Account} = require("../protocol/core/Tron_pb");
const stringToBytes = require("../lib/code").stringToBytes;

class GrpcClient {

  constructor(options) {
    this.hostname = options.hostname;
    this.port = options.port;

    const {WalletClient} = require("../protocol/api/api_grpc_pb");
    const caller = require('grpc-caller');

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
    return await this.api.listWitnesses(new EmptyMessage())
      .then(x => x.getWitnessesList());
  }

  /**
   * Retrieve all connected nodes
   *
   * @returns {Promise<*>}
   */
  async getNodes() {
    return await this.api.listNodes(new EmptyMessage())
      .then(x => x.getNodesList());
  }

  /**
   * Retrieve all accounts
   *
   * @returns {Promise<*>}
   */
  async getAccounts() {
    const accountList = await this.api.listAccounts(new EmptyMessage())
      .then(x => x.getAccountsList());
      return accountList.map(account => {
        const computedAccount = account.toObject();
        computedAccount.address = getBase58CheckAddress(Array.from(account.getAddress()));
        computedAccount.votesList.map(vote => {
          vote.voteAddress = passwordToAddress(vote.voteAddress);
          return vote;
        });
        computedAccount.balance = account.getBalance() / 1000000;
        computedAccount.assetMap = computedAccount.assetMap.map(asset => {
          return {
            name: asset[0],
            balance: asset[1]
          }
        });
        return computedAccount;
      });
    }

  /**
   * Retrieves a account by the given address
   *
   * @param {address} string account address
   * @returns {Promise<*>}
   */
  async getAccount(address) {
    let accountArg = new Account();
    accountArg.setAddress(address);

    const accountRaw = await this.api.getAccount(accountArg);
    const account = accountRaw.toObject();
    return account;
  }

  /**
   * Retrieves a block by the given number
   *
   * @param {number} number block number
   * @returns {Promise<*>}
   */
  async getBlockByNumber(number) {
    let message = new NumberMessage();
    message.setNum(number);
    const blockRaw = await this.api.getBlockByNum(message);
    const block = blockRaw.toObject();
    const rawData = blockRaw.getBlockHeader().getRawData();
    block.transactionsList = blockRaw.getTransactionsList().map(tx => {
      return deserializeTransaction(tx)[0];
    });
    block.transactionsCount = block.transactionsList.length;
    block.totalTrx = block.transactionsList.reduce((t, n) => t + n.amount, 0);
    block.size = block.blockHeader.witnessSignature.length;
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
    lastBlock.transactionsList = lastBlockRaw.getTransactionsList().map(tx => {
      return deserializeTransaction(tx)[0];
    });
    lastBlock.transactionsCount = lastBlock.transactionsList.length;
    lastBlock.totalTrx = lastBlock.transactionsList.reduce((t, n) => t + n.amount, 0);
    lastBlock.size = lastBlock.blockHeader.witnessSignature.length;
    lastBlock.time = rawData.getTimestamp();
    lastBlock.witnessAddress = getBase58CheckAddress(Array.from(rawData.getWitnessAddress())),
    lastBlock.number = rawData.getNumber();
    lastBlock.parentHash = byteArray2hexStr(rawData.getParenthash());
    delete lastBlock.blockHeader;
    return lastBlock;
  }

}

module.exports = GrpcClient;
