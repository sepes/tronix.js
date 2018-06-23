const { decode58Check, SHA256, ECKeySign } = require('./crypto');
const { longToByteArray } = require('./bytes');
const { hexStr2byteArray } = require('../lib/code');

const { Transaction } = require('../protocol/core/Tron_pb');
const google_protobuf_any_pb = require('google-protobuf/google/protobuf/any_pb.js');
const { base64DecodeFromString } = require('../lib/code');
const {
  TransferContract,
  TransferAssetContract,
  AccountUpdateContract,
  VoteWitnessContract,
  ParticipateAssetIssueContract,
  AssetIssueContract,
  FreezeBalanceContract,
  UnfreezeBalanceContract,
  WitnessUpdateContract,
  WithdrawBalanceContract,
  WitnessCreateContract,
  UnfreezeAssetContract,
} = require('../protocol/core/Contract_pb');

function encodeString(str) {
  return Uint8Array.from(base64DecodeFromString(btoa(str)));
}

//TODO find a better place.
function btoa(str) {
  var buffer;

  if (str instanceof Buffer) {
    buffer = str;
  } else {
    buffer = new Buffer(str.toString(), 'binary');
  }

  return buffer.toString('base64');
}

function buildTransferContract(message, contractType, typeName) {
  const anyValue = new google_protobuf_any_pb.Any();
  anyValue.pack(message.serializeBinary(), `protocol.${typeName}`);

  const contract = new Transaction.Contract();
  contract.setType(contractType);
  contract.setParameter(anyValue);

  const raw = new Transaction.raw();
  raw.addContract(contract);
  // raw.setTimestamp(new Date().getTime() * 1000000);

  const transaction = new Transaction();
  transaction.setRawData(raw);
  
  return transaction;
}

/**
 * Build trx transfer transaction
 * @param {string} from address in base 58
 * @param {string} to address in base 58
 * @param {number} amount amount in TRX?
 *
 */
function buildTransferTransaction(from, to, amount) {
  const transferContract = new TransferContract();
  transferContract.setToAddress(Uint8Array.from(decode58Check(to)));
  transferContract.setOwnerAddress(Uint8Array.from(decode58Check(from)));
  transferContract.setAmount(amount * 1000000);
  
  const transaction = buildTransferContract(
    transferContract,
    Transaction.Contract.ContractType.TRANSFERCONTRACT,
    'TransferContract',
  );

  return transaction;
}

/**
 * Build token transfer transaction
 * @param {string} token token name
 * @param {string} from address in base 58
 * @param {string} to address in base 58
 * @param {number} amount amount in suns //TODO check if TRX?
 *
 */
function buildTransferAssetTransaction(token, from, to, amount) {
  const transferContract = new TransferAssetContract();
  transferContract.setToAddress(Uint8Array.from(decode58Check(to)));
  transferContract.setOwnerAddress(Uint8Array.from(decode58Check(from)));
  transferContract.setAmount(amount);
  transferContract.setAssetName(encodeString(token));

  const transaction = buildTransferContract(
    transferContract,
    Transaction.Contract.ContractType.TRANSFERASSETCONTRACT,
    'TransferAssetContract',
  );

  return transaction;
}

/**
 * Update account transaction (you can just update with your name 1 time)
 * @param {string} address address in base 58
 * @param {string} name name string //TODO check the limit
 *
 */
function buildAccountUpdateTransaction(address, name) {
  const contract = new AccountUpdateContract();
  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));
  contract.setAccountName(encodeString(name));

  const transaction = buildTransferContract(
    contract,
    Transaction.Contract.ContractType.ACCOUNTUPDATECONTRACT,
    'AccountUpdateContract',
  );

  return transaction;
}


/**
 * Create witness transaction
 * @param {string} address address in base 58
 * @param {string} url url for witness //Check the limit
 *
 */
function buildWitnessCreateTransaction(address, url) {
  const contract = new WitnessCreateContract();
  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));
  contract.setUrl(encodeString(url));

  const transaction = buildTransferContract(
    contract,
    Transaction.Contract.ContractType.WITNESSCREATECONTRACT,
    'WitnessCreateContract',
  );

  return transaction;
}

/**
 * Update witness transaction
 * @param {string} address address in base 58
 * @param {string} url url for witness //Check the limit
 *
 */
function buildWitnessUpdateTransaction(address, url) {
  const contract = new WitnessUpdateContract();
  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));
  
  contract.setUpdateUrl(encodeString(url));

  const transaction = buildTransferContract(
    contract,
    Transaction.Contract.ContractType.WITNESSUPDATECONTRACT,
    'WitnessUpdateContract',
  );

  return transaction;
}


/**
 * Widthdraw balance transaction (for block creation rewards)
 * @param {string} address address in base 58
 *
 */
function buildWithdrawBalanceTransaction(address) {
  const contract = new WithdrawBalanceContract();
  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));

  const transaction = buildTransferContract(
    contract,
    Transaction.Contract.ContractType.WITHDRAWBALANCECONTRACT,
    'WithdrawBalanceContract',
  );

  return transaction;
}

/**
 * Votes transaction
 * @param {string} address address in base 58
 * @param {array} votes list of votes of quantity +
 *
 */
function buildVoteTransaction(address, votes) {
  const contract = new VoteWitnessContract();
  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));

  for (const address of Object.keys(votes)) {
    const vote = new VoteWitnessContract.Vote();
    vote.setVoteAddress(Uint8Array.from(decode58Check(address)));
    const numberOfVotes = parseInt(votes[address]);
    if (isNaN(numberOfVotes) || numberOfVotes <= 0) {
      continue;
    }
    vote.setVoteCount(numberOfVotes);
    contract.addVotes(vote);
  }

  const transaction = buildTransferContract(
    contract,
    Transaction.Contract.ContractType.VOTEWITNESSCONTRACT,
    'VoteWitnessContract',
  );

  return transaction;
}

/**
 * Asset participate issue transaction
 * @param {string} address address in base 58
 * @param {array} issuerAddress issuer address in base 58
 * @param {string} token token name //check the chars limit
 *
 */
function buildAssetParticipateTransaction(address, issuerAddress, token, amount) {
  const contract = new ParticipateAssetIssueContract();

  contract.setToAddress(Uint8Array.from(decode58Check(issuerAddress)));
  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));
  contract.setAssetName(encodeString(token));
  contract.setAmount(amount);

  const transaction = buildTransferContract(
    contract,
    Transaction.Contract.ContractType.PARTICIPATEASSETISSUECONTRACT,
    'ParticipateAssetIssueContract',
  );

  return transaction;
}


/**
 * Asset issue transaction
 * @param {object} options options list
 *
 */
function buildAssetIssueTransaction(options) {
  const contract = new AssetIssueContract();
  contract.setOwnerAddress(Uint8Array.from(decode58Check(options.address)));
  contract.setName(encodeString(options.name));
  contract.setAbbr(encodeString(options.shortName));
  contract.setTotalSupply(options.totalSupply);
  contract.setNum(options.num);
  contract.setEndTime(Date.parse(options.endTime));
  contract.setStartTime(Date.parse(options.startTime));
  contract.setTrxNum(options.trxNum);
  contract.setDescription(encodeString(options.description));
  contract.setUrl(encodeString(options.url));
  contract.setPublicFreeAssetNetUsage(0);
  contract.setFreeAssetNetLimit(0);
  contract.setPublicFreeAssetNetLimit(0);

  if (options.frozenSupply) {
    for (const frozenSupply of options.frozenSupply) {
      const frozenSupplyContract = new AssetIssueContract.FrozenSupply();
      frozenSupplyContract.setFrozenAmount(frozenSupply.amount);
      frozenSupplyContract.setFrozenDays(frozenSupply.days);
      contract.addFrozenSupply(frozenSupplyContract);
    }
  }

  const transaction = buildTransferContract(
    contract,
    Transaction.Contract.ContractType.ASSETISSUECONTRACT,
    'AssetIssueContract',
  );

  return transaction;
}

/**
 * Freeze balance
 *
 * @param address From which address to freze
 * @param amount The amount of TRX to freeze
 * @param duration Duration in days
 *
 */
function buildFreezeBalanceTransaction(address, amount, duration) {
  const contract = new FreezeBalanceContract();

  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));
  contract.setFrozenBalance(amount);
  contract.setFrozenDuration(duration);

  const transaction = buildTransferContract(
    contract,
    Transaction.Contract.ContractType.FREEZEBALANCECONTRACT,
    'FreezeBalanceContract',
  );

  return transaction;
}

/**
 * Unfreeze balance
 *
 * @param address From which address to freeze
 *
 */
function buildUnfreezeBalanceTransaction(address) {
  const contract = new UnfreezeBalanceContract();

  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));

  const transaction = buildTransferContract(
    contract,
    Transaction.Contract.ContractType.UNFREEZEBALANCECONTRACT,
    'UnfreezeBalanceContract',
  );

  return transaction;
}

/**
 * Unfreeze Assets
 *
 * @param address From which address to unfreeze
 *
 */
function buildUnfreezeAssetTransaction(address) {
  const contract = new UnfreezeAssetContract();

  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));

  const transaction = buildTransferContract(
    contract,
    Transaction.Contract.ContractType.UNFREEZEASSETCONTRACT,
    'UnfreezeAssetContract',
  );

  return transaction;
}

/**
 * Add block reference to transaction
 * This is a needed step after building the transaction before signing the transaction it to the network.
 * @param {Transaction} transaction a builded non-signed transaction
 * @param {Block} block the block to ref the transaction (usually the current block)
 */
function addBlockReferenceToTransaction(transaction, block) {

  let blockHash = block.hash;
  let blockNum = block.number;

  let numBytes = longToByteArray(blockNum);
  numBytes.reverse();
  let hashBytes = hexStr2byteArray(blockHash);

  let generateBlockId = [...numBytes.slice(0, 8), ...hashBytes.slice(8, hashBytes.length - 1)];
  
  let rawData = transaction.getRawData();
  rawData.setRefBlockHash(Uint8Array.from(generateBlockId.slice(8, 16)));
  rawData.setRefBlockBytes(Uint8Array.from(numBytes.slice(6, 8)));
  rawData.setExpiration(block.time + (60 * 5 * 1000));

  return transaction;
}

/**
 * Sign A Transaction by priKey.
 * signature is 65 bytes, r[32] || s[32] || id[1](<27)
 * @returns  a Transaction object signed
 * @param transaction: a Transaction object unSigned
 * @param priKeyBytes: privateKey for ECC
 */
function signTransaction(transaction, priKeyBytes) {
  if (typeof priKeyBytes === 'string') {
    priKeyBytes = hexStr2byteArray(priKeyBytes);
  }

  const raw = transaction.getRawData();
  const rawBytes = raw.serializeBinary();
  const hashBytes = SHA256(rawBytes);
  const signBytes = ECKeySign(hashBytes, priKeyBytes);
  const uint8Array = new Uint8Array(signBytes);
  const count = raw.getContractList().length;
  for (let i = 0; i < count; i++) {
    transaction.addSignature(uint8Array);
  }

  return transaction;
}

module.exports = {
  buildTransferTransaction,
  buildTransferAssetTransaction,
  buildAccountUpdateTransaction,
  buildAssetParticipateTransaction,
  buildVoteTransaction,
  buildFreezeBalanceTransaction,
  buildUnfreezeBalanceTransaction,
  buildAssetIssueTransaction,
  buildWitnessUpdateTransaction,
  buildWithdrawBalanceTransaction,
  buildWitnessCreateTransaction,
  buildUnfreezeAssetTransaction,
  addBlockReferenceToTransaction,
  signTransaction,
};
