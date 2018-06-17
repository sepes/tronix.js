const fetch = require('node-fetch');

module.exports.getNodes = async () => {
  try {
    const nodes = await fetch('https://api.tronscan.org/api/node').then(res => res.json());
    const nodesGrpc = nodes.nodes.filter(node => node.grpcEnabled);
    return nodesGrpc;
  } catch (err) {
    throw err;
  }
};
