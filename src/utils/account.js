const { byteArray2hexStr } = require('./bytes');
const { getBase58CheckAddress, genPriKey, getAddressFromPriKey } = require('./crypto');

/**
 * Generate a new account
 */
function generateAccount() {
  const priKeyBytes = genPriKey();
  const addressBytes = getAddressFromPriKey(priKeyBytes);
  const address = getBase58CheckAddress(addressBytes);
  const privateKey = byteArray2hexStr(priKeyBytes);

  return {
    privateKey,
    address,
  };
}

module.exports = {
  generateAccount,
};
