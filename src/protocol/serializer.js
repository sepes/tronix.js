const { getBase58CheckAddress, SHA256 } = require('../utils/crypto');
const { byteArray2hexStr } = require('../utils/bytes');
const { Transaction } = require('../protocol/core/Tron_pb');
const {
  AccountCreateContract,//To delete in a future?
  TransferContract,
  TransferAssetContract,
  VoteAssetContract,
  VoteWitnessContract, 
  AssetIssueContract,
  DeployContract,
  WitnessUpdateContract,
  ParticipateAssetIssueContract,
  FreezeBalanceContract, 
  UnfreezeBalanceContract ,
  WithdrawBalanceContract,
  UnfreezeAssetContract,
  UpdateAssetContract,
  CustomContract
} = require('../protocol/core/Contract_pb');

const ContractType =  Transaction.Contract.ContractType;
const ContractTable = {};
ContractTable[ContractType.ACCOUNTCREATECONTRACT] =           [AccountCreateContract.deserializeBinary,'protocol.AccountCreateContract']
ContractTable[ContractType.TRANSFERCONTRACT] =                [TransferContract.deserializeBinary,'protocol.TransferContract']
ContractTable[ContractType.TRANSFERASSETCONTRACT] =           [TransferAssetContract.deserializeBinary,'protocol.TransferAssetContract']
ContractTable[ContractType.VOTEASSETCONTRACT] =               [VoteAssetContract.deserializeBinary,'protocol.VoteAssetContract']
ContractTable[ContractType.VOTEWITNESSCONTRACT] =             [VoteWitnessContract.deserializeBinary,'protocol.VoteWitnessContract']
ContractTable[ContractType.ASSETISSUECONTRACT] =              [AssetIssueContract.deserializeBinary,'protocol.AssetIssueContract']
ContractTable[ContractType.DEPLOYCONTRACT] =                  [DeployContract.deserializeBinary,'protocol.DeployContract']
ContractTable[ContractType.WITNESSUPDATECONTRACT] =           [WitnessUpdateContract.deserializeBinary,'protocol.WitnessUpdateContract']
ContractTable[ContractType.PARTICIPATEASSETISSUECONTRACT] =   [ParticipateAssetIssueContract.deserializeBinary,'protocol.ParticipateAssetIssueContract']
ContractTable[ContractType.FREEZEBALANCECONTRACT] =           [FreezeBalanceContract.deserializeBinary,'protocol.FreezeBalanceContract']
ContractTable[ContractType.UNFREEZEBALANCECONTRACT] =         [UnfreezeBalanceContract.deserializeBinary,'protocol.UnfreezeBalanceContract']
ContractTable[ContractType.WITHDRAWBALANCECONTRACT] =         [WithdrawBalanceContract.deserializeBinary,'protocol.WithdrawBalanceContract']
ContractTable[ContractType.UNFREEZEASSETCONTRACT] =           [UnfreezeAssetContract.deserializeBinary,'protocol.UnfreezeAssetContract']
ContractTable[ContractType.UPDATEASSETCONTRACT] =             [UpdateAssetContract.deserializeBinary,'protocol.UpdateAssetContract']
/*not defined right now 
  ContractTable[ContractType.CUSTOMCONTRACT] =                  [CustomContract.deserializeBinary,'protocol.CustomContract']
*/

function deserializeTransaction(tx) {
  try {
    const contractType = Transaction.Contract.ContractType;
    const contractList = tx.getRawData().getContractList();
    const transactions = [];

    contractList.forEach((contract) => {
      const any = contract.getParameter();

      const contractType = contract.getType();
      let transaction = any.unpack(ContractTable[contractType][0], ContractTable[contractType][1]);
      transaction = transaction.toObject();
      //transaction.amount = obje.amount / 1000000; //TODO maybe remove in a future

      transaction.hash = byteArray2hexStr(SHA256(tx.getRawData().serializeBinary()))
      transaction.time = tx.getRawData().getTimestamp();
      transactions.push(transaction);
    });

    return transactions;
  } catch (err) {
    return [null];
  }
}

module.exports = {
  deserializeTransaction,
};
