import { LandingHeader } from './components/LandingHeader.jsx'
import { HeroSection, ProblemSection } from './components/HeroSection.jsx'
import { PillarsSection } from './components/PillarsSection.jsx'
import { FeaturesSection } from './components/FeaturesSection.jsx'
import {
  HowItWorksSection,
  TrustSection,
  CtaSection,
} from './components/HowItWorksSection.jsx'
import { FaqSection, LandingFooter } from './components/FaqSection.jsx'

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-planner-cream">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProblemSection />
        <PillarsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TrustSection />
        <CtaSection />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  )
}
