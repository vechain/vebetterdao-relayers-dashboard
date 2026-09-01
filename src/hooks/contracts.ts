import { getConfig } from "@/config"
import type { EnvConfig } from "@/config"
import { RelayerRewardsPool__factory } from "@vechain/vebetterdao-contracts/factories/RelayerRewardsPool__factory"
import { XAllocationVoting__factory } from "@vechain/vebetterdao-contracts/factories/XAllocationVoting__factory"
import { NavigatorRegistry__factory } from "@vechain/vebetterdao-contracts/factories/navigator/NavigatorRegistry__factory"

const env = (process.env.NEXT_PUBLIC_APP_ENV ?? "mainnet") as EnvConfig
const config = getConfig(env)

export const relayerPoolAddress = config.relayerRewardsPoolContractAddress as `0x${string}`
export const xAllocationAddress = config.xAllocationVotingContractAddress as `0x${string}`
export const navigatorRegistryAddress = config.navigatorRegistryContractAddress as `0x${string}`
export const relayerPoolAbi = RelayerRewardsPool__factory.abi
export const xAllocationAbi = XAllocationVoting__factory.abi
export const navigatorRegistryAbi = NavigatorRegistry__factory.abi
