import { FeaturesSection } from "@/components/landing/FeaturesSection/FeaturesSection";
import { Footer } from "@/components/landing/Footer/Footer";
import { Header } from "@/components/landing/Header/Header";
import { Hero } from "@/components/landing/Hero/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks/HowItWorks";

import { ownerFeatures, playerFeatures } from "@/data/landing";

export default function Home() {
  return (
    <>
      <Header />

      <main>
        <Hero />

        <HowItWorks />

        <FeaturesSection
          id="para-jogadores"
          title="Para o Capitão e seu Time"
          description="Dê adeus às planilhas e cobranças manuais. Automatize a organização da sua pelada e concentre tudo em um só lugar."
          features={playerFeatures}
        />

        <FeaturesSection
          id="para-quadras"
          title="Para Donos de Quadra"
          description="Modernize e automatize a gestão do seu espaço esportivo com ferramentas pensadas para o dia a dia do complexo."
          features={ownerFeatures}
          compact
        />
      </main>

      <Footer />
    </>
  );
}
