import {
  CalendarDays,
  MapPin,
  Share2,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type LandingFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
  featured?: boolean;
};

export type HowItWorksStep = {
  number: number;
  title: string;
  description: string;
};

export type HeroBenefit = {
  label: string;
  icon: LucideIcon;
};

export const heroBenefits: HeroBenefit[] = [
  {
    label: "Agendamento Automático",
    icon: CalendarDays,
  },
  {
    label: "Pagamento Integrado",
    icon: Wallet,
  },
  {
    label: "Gestão de Times",
    icon: Users,
  },
];

export const playerFeatures: LandingFeature[] = [
  {
    title: "Divisão de Custos Completa",
    description:
      "Rache o valor da quadra somando de forma simples o valor pago para o goleiro contratado e a churrasqueira, quando cobrada.",
    icon: Wallet,
    featured: true,
  },
  {
    title: "Churrasco sem Estresse",
    description:
      "Divida o custo do churras antes ou depois da partida. Basta definir o valor total e enviar o link de pagamento Pix para os participantes.",
    icon: Share2,
  },
  {
    title: "Mensalidades Fixas",
    description:
      "Controle automático de pagamentos mensais para times que jogam toda semana. Chega de ficar cobrando jogador no privado.",
    icon: CalendarDays,
  },
  {
    title: "Convidados e Caixinha",
    description:
      "Cobre valores avulsos automaticamente de convidados que substituem mensalistas faltosos, enviando o valor direto para o caixinha do time.",
    icon: Users,
  },
  {
    title: "Votação de MVP",
    description:
      "Abra votações ao término da partida para que todos escolham o melhor jogador de forma participativa e divertida.",
    icon: Trophy,
    featured: true,
  },
  {
    title: "Ranking de Goleadores",
    description:
      "Mantenha uma tabela de artilharia dinâmica e atualizada para estimular a competitividade saudável no grupo.",
    icon: Trophy,
  },
  {
    title: "Melhor do Mês",
    description:
      "Estimule a presença: cada vitória do time rende 3 pontos para todos os presentes e empate rende 1 ponto para ambos os lados.",
    icon: ShieldCheck,
  },
  {
    title: "Relatórios no WhatsApp",
    description:
      "Receba relatórios e informações do seu time diretamente no WhatsApp após as partidas.",
    icon: Share2,
  },
];

export const ownerFeatures: LandingFeature[] = [
  {
    title: "Site de Reservas Online",
    description:
      "Disponibilizamos um sistema automatizado de agendamento online para facilitar as reservas do seu complexo.",
    icon: MapPin,
  },
  {
    title: "Quadras e Churrasqueiras",
    description:
      "Controle horários e reservas para suas quadras e áreas de lazer em um único lugar.",
    icon: CalendarDays,
  },
  {
    title: "Bar & Estoque Integrados",
    description:
      "Gerencie vendas de bebidas, lanches e estoque de forma simples dentro da sua arena.",
    icon: ShieldCheck,
  },
  {
    title: "Gestão de Pagamentos",
    description:
      "Controle pagamentos, caixa, confirmações e cancelamentos de forma centralizada.",
    icon: Wallet,
  },
];

export const howItWorksSteps: HowItWorksStep[] = [
  {
    number: 1,
    title: "Encontre & Reserve",
    description:
      "Escolha a quadra, visualize os horários disponíveis e monte a sua reserva.",
  },
  {
    number: 2,
    title: "Convide & Rache",
    description:
      "Compartilhe o jogo com seus amigos. Cada atleta confirma presença e acompanha sua participação.",
  },
  {
    number: 3,
    title: "Divida & Jogue",
    description:
      "Organize os jogadores, acompanhe a reserva e deixe a burocracia com o Joga Junto.",
  },
];
