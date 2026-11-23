export const SUPPORTED_CHAINS = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    shortName: 'ETH',
    moralisChain: '0x1',
    nativeSymbol: 'ETH',
    nativeName: 'Ethereum',
    nativeDecimals: 18,
    wrappedNativeAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    explorerAddressUrl: 'https://etherscan.io/address/',
    explorerTxUrl: 'https://etherscan.io/tx/',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    shortName: 'POL',
    moralisChain: '0x89',
    nativeSymbol: 'POL',
    nativeName: 'Polygon',
    nativeDecimals: 18,
    wrappedNativeAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    explorerAddressUrl: 'https://polygonscan.com/address/',
    explorerTxUrl: 'https://polygonscan.com/tx/',
  },
  {
    id: 'bnb',
    name: 'BNB Chain',
    shortName: 'BNB',
    moralisChain: '0x38',
    nativeSymbol: 'BNB',
    nativeName: 'BNB',
    nativeDecimals: 18,
    wrappedNativeAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    explorerAddressUrl: 'https://bscscan.com/address/',
    explorerTxUrl: 'https://bscscan.com/tx/',
  },
  {
    id: 'base',
    name: 'Base',
    shortName: 'BASE',
    moralisChain: '0x2105',
    nativeSymbol: 'ETH',
    nativeName: 'Ethereum',
    nativeDecimals: 18,
    wrappedNativeAddress: '0x4200000000000000000000000000000000000006',
    explorerAddressUrl: 'https://basescan.org/address/',
    explorerTxUrl: 'https://basescan.org/tx/',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    shortName: 'ARB',
    moralisChain: '0xa4b1',
    nativeSymbol: 'ETH',
    nativeName: 'Ethereum',
    nativeDecimals: 18,
    wrappedNativeAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    explorerAddressUrl: 'https://arbiscan.io/address/',
    explorerTxUrl: 'https://arbiscan.io/tx/',
  },
] as const;

export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]['id'];
export type SupportedChainConfig = (typeof SUPPORTED_CHAINS)[number];

export const SUPPORTED_CHAIN_IDS = SUPPORTED_CHAINS.map((chain) => chain.id);

export function getChainConfig(chainId: string) {
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
}

export function getExplorerAddressUrl(chainId: string, address: string) {
  const chain = getChainConfig(chainId);
  return chain ? `${chain.explorerAddressUrl}${address}` : '';
}

export function getExplorerTxUrl(chainId: string, hash: string) {
  const chain = getChainConfig(chainId);
  return chain ? `${chain.explorerTxUrl}${hash}` : '';
}
