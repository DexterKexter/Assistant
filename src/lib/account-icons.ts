import { Banknote, Bitcoin, Briefcase, Building2, Coins, CreditCard, Globe, HandCoins, Landmark, PiggyBank, Receipt, Smartphone, Vault, Wallet } from 'lucide-react'

// Icons an account type can have. Keys are stored in account_types.icon.
export const ACCOUNT_ICONS = {
  landmark: Landmark, banknote: Banknote, card: CreditCard, wallet: Wallet, piggy: PiggyBank, coins: Coins, phone: Smartphone,
  building: Building2, briefcase: Briefcase, globe: Globe, vault: Vault, handcoins: HandCoins, receipt: Receipt, crypto: Bitcoin,
} as const
export type AccountIcon = keyof typeof ACCOUNT_ICONS
export const accountIcon = (key: string | undefined) => ACCOUNT_ICONS[key as AccountIcon] ?? Wallet
