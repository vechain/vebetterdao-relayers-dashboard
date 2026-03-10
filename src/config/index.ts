export type EnvConfig = "testnet-staging" | "mainnet"

type NetworkConfig = {
  id: string
  name: string
  type: "main" | "test"
  defaultNet: boolean
  urls: string[]
  explorerUrl: string
  blockTime: number
  genesis: Record<string, unknown>
}

export type AppConfig = {
  environment: EnvConfig
  xAllocationVotingContractAddress: string
  relayerRewardsPoolContractAddress: string
  voterRewardsContractAddress: string
  emissionsContractAddress: string
  nodeUrl: string
  network: NetworkConfig
  governanceUrl: string
}

const mainnetConfig: AppConfig = {
  environment: "mainnet",
  xAllocationVotingContractAddress: "0x89A00Bb0947a30FF95BEeF77a66AEdE3842Fe5B7",
  relayerRewardsPoolContractAddress: "0x34b56f892c9e977b9ba2e43ba64c27d368ab3c86",
  voterRewardsContractAddress: "0x838A33AF756a6366f93e201423E1425f67eC0Fa7",
  emissionsContractAddress: "0xDf94739bd169C84fe6478D8420Bb807F1f47b135",
  nodeUrl: "https://mainnet.vechain.org",
  governanceUrl: "https://governance.vebetterdao.org",
  network: {
    id: "main",
    name: "main",
    type: "main",
    defaultNet: true,
    urls: [
      "https://mainnet.vechain.org",
      "https://vethor-node.vechain.com",
      "https://mainnet.veblocks.net",
      "https://mainnet.vecha.in",
    ],
    explorerUrl: "https://vechainstats.com",
    blockTime: 10000,
    genesis: {
      number: 0,
      id: "0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a",
      size: 170,
      parentID: "0xffffffff53616c757465202620526573706563742c20457468657265756d2100",
      timestamp: 1530316800,
      gasLimit: 10000000,
      beneficiary: "0x0000000000000000000000000000000000000000",
      gasUsed: 0,
      totalScore: 0,
      txsRoot: "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0",
      txsFeatures: 0,
      stateRoot: "0x09bfdf9e24dd5cd5b63f3c1b5d58b97ff02ca0490214a021ed7d99b93867839c",
      receiptsRoot: "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0",
      signer: "0x0000000000000000000000000000000000000000",
      isTrunk: true,
      transactions: [],
    },
  },
}

const testnetStagingConfig: AppConfig = {
  environment: "testnet-staging",
  xAllocationVotingContractAddress: "0x8800592c463f0b21ae08732559ee8e146db1d7b2",
  relayerRewardsPoolContractAddress: "0x92b5a7484970d9b2ad981e8135ff14e6f996dc04",
  voterRewardsContractAddress: "0x851ef91801899a4e7e4a3174a9300b3e20c957e8",
  emissionsContractAddress: "0x66898f98409db20ed6a1bf0021334b7897eb0688",
  nodeUrl: "https://testnet.vechain.org",
  governanceUrl: "https://staging.testnet.governance.vebetterdao.org",
  network: {
    id: "testnet",
    name: "testnet",
    type: "test",
    defaultNet: true,
    urls: [
      "https://testnet.vechain.org",
      "https://vethor-node-test.vechaindev.com",
      "https://sync-testnet.veblocks.net",
      "https://testnet.vecha.in",
    ],
    explorerUrl: "https://explore-testnet.vechain.org",
    blockTime: 10000,
    genesis: {
      number: 0,
      id: "0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127",
      size: 170,
      parentID: "0xffffffff00000000000000000000000000000000000000000000000000000000",
      timestamp: 1530014400,
      gasLimit: 10000000,
      beneficiary: "0x0000000000000000000000000000000000000000",
      gasUsed: 0,
      totalScore: 0,
      txsRoot: "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0",
      txsFeatures: 0,
      stateRoot: "0x4ec3af0acbad1ae467ad569337d2fe8576fe303928d35b8cdd91de47e9ac84bb",
      receiptsRoot: "0x45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0",
      signer: "0x0000000000000000000000000000000000000000",
      isTrunk: true,
      transactions: [],
    },
  },
}

export function getConfig(env?: EnvConfig): AppConfig {
  const appEnv = env || (process.env.NEXT_PUBLIC_APP_ENV as EnvConfig)
  if (!appEnv) throw new Error("NEXT_PUBLIC_APP_ENV must be set or env must be passed to getConfig()")

  switch (appEnv) {
    case "mainnet":
      return mainnetConfig
    case "testnet-staging":
      return testnetStagingConfig
    default:
      throw new Error(`Unsupported env: ${appEnv}`)
  }
}
