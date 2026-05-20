export type Plataforma = "meta_ads" | "google_ads";

export interface PlatformInfo {
  id: Plataforma;
  nome: string;
  abrev: string;
  icon: string;
  iconBg: string;
  descricao: string;
}

export const PLATFORMS: Record<Plataforma, PlatformInfo> = {
  meta_ads: {
    id: "meta_ads",
    nome: "Meta Ads",
    abrev: "Meta",
    icon: "ti-brand-meta",
    iconBg: "linear-gradient(135deg, #1877F2, #4FB1F0)",
    descricao: "Facebook, Instagram, Messenger, WhatsApp Ads",
  },
  google_ads: {
    id: "google_ads",
    nome: "Google Ads",
    abrev: "Google",
    icon: "ti-brand-google",
    iconBg: "linear-gradient(135deg, #4285F4, #34A853)",
    descricao: "Search, Display, YouTube, Discovery",
  },
};

export const PLATFORM_LIST: PlatformInfo[] = Object.values(PLATFORMS);
