const {
  FreezeBalanceContract, UnfreezeBalanceContract, WitnessCreateContract, TransferContract,
} = require('../protocol/core/Contract_pb');
const { getBase58CheckAddress, SHA256, decode58Check } = require('./crypto');
const { base64DecodeFromString } = require('../lib/code');
const { Transaction } = require('../protocol/core/Tron_pb');
const { byteArray2hexStr } = require('../utils/bytes');
const google_protobuf_any_pb = require('google-protobuf/google/protobuf/any_pb.js');


function encodeString(str) {
  return Uint8Array.from(base64DecodeFromString(btoa(str)));
}

function buildTransferContract(message, contractType, typeName) {
  const anyValue = new google_protobuf_any_pb.Any();
  anyValue.pack(message.serializeBinary(), `protocol.${typeName}`);

  const contract = new Transaction.Contract();
  contract.setType(contractType);
  contract.setParameter(anyValue);

  const raw = new Transaction.raw();
  raw.addContract(contract);
  raw.setTimestamp(new Date().getTime() * 1000000);

  const transaction = new Transaction();
  transaction.setRawData(raw);

  return transaction;
}

/**
 * Freeze balance
 *
 * @param address From which address to freze
 * @param amount The amount of TRX to freeze
 * @param duration Duration in days
 */
function buildFreezeBalance(address, amount, duration) {
  const contract = new FreezeBalanceContract();

  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));
  contract.setFrozenBalance(amount);
  contract.setFrozenDuration(duration);

  return buildTransferContract(
    contract,
    Transaction.Contract.ContractType.FREEZEBALANCECONTRACT,
    'FreezeBalanceContract',
  );
}

/**
 * Unfreeze balance
 *
 * @param address From which address to freze
 */
function buildUnfreezeBalance(address) {
  const contract = new UnfreezeBalanceContract();

  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));

  return buildTransferContract(
    contract,
    Transaction.Contract.ContractType.UNFREEZEBALANCECONTRACT,
    'UnfreezeBalanceContract',
  );
}

/**
 * Unfreeze balance
 *
 * @param address From which address to freze
 * @param url url
 */
function buildApplyForDelegate(address, url) {
  const contract = new WitnessCreateContract();

  contract.setOwnerAddress(Uint8Array.from(decode58Check(address)));
  contract.setUrl(encodeString(url));

  return buildTransferContract(
    contract,
    Transaction.Contract.ContractType.WITNESSCREATECONTRACT,
    'WitnessCreateContract',
  );
}


function deserializeTransaction(tx) {
  try {
    const contractType = Transaction.Contract.ContractType;

    const contractList = tx.getRawData().getContractList();

    const transactions = [];

    contractList.forEach((contract) => {
      const any = contract.getParameter();

      switch (contract.getType()) {
        case contractType.ACCOUNTCREATECONTRACT: {
          const obje = any.unpack(AccountCreateContract.deserializeBinary, 'protocol.AccountCreateContract');
          transactions.push({});
        }
          break;

        default:
        case contractType.TRANSFERCONTRACT: {
        // let contractType = contractType .TRANSFERCONTRACT;

          const obje = any.unpack(TransferContract.deserializeBinary, 'protocol.TransferContract');

          const owner = obje.getOwnerAddress();
          const ownerHex = getBase58CheckAddress(Array.from(owner));

          const to = obje.getToAddress();
          const toHex = getBase58CheckAddress(Array.from(to));

          const amount = obje.getAmount() / 1000000;

          const rawData = tx.getRawData();
          const hash = byteArray2hexStr(SHA256(rawData.serializeBinary()));

          transactions.push({
            hash,
            from: ownerHex,
            to: toHex,
            amount,
            time: tx.getRawData().getTimestamp(),
            data: rawData.getData(),
            scripts: rawData.getScripts(),
          });
        }
          break;
      }
    });

    return transactions;
  } catch (err) {
    return [null];
  }
}

function deserializeTransactions(transactionsList = []) {
  return transactionsList.filter(t => !!t).map(tx => deserializeTransaction(tx)[0]);
}

module.exports = {
  buildFreezeBalance,
  buildUnfreezeBalance,
  buildApplyForDelegate,
  deserializeTransaction,
  deserializeTransactions,
};
