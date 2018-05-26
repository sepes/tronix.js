const { getBase58CheckAddress, SHA256 } = require('../utils/crypto');
const { byteArray2hexStr } = require('../utils/bytes');
const { Transaction } = require('../protocol/core/Tron_pb');
const { TransferContract } = require('../protocol/core/Contract_pb');


function deserializeTransaction(tx) {
  const contractType = Transaction.Contract.ContractType;

  const contractList = tx.getRawData().getContractList();

  const transactions = [];

  contractList.forEach((contract) => {
    const any = contract.getParameter();

    switch (contract.getType()) {
      case contractType.ACCOUNTCREATECONTRACT: {
        // contractType = contractType .ACCOUNTCREATECONTRACT;

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
}

module.exports = {
  deserializeTransaction,
};
