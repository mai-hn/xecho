import { ArrowUpRight, Cpu, Sparkles } from 'lucide-react';

import { ParticleRays } from './_components/particle-rays';
import { Reveal } from './_components/reveal';
import { SiteContentSections } from './_components/site-content-sections';
import { Globe } from '@/components/ui/globe';
import { buttonClassName } from '@/components/ui/button';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.home}>
      <section id="home" className={styles.hero} aria-label="xEcho hero">
        <ParticleRays />
        <div className={styles.vignette} />
        <Reveal className={styles.heroContent}>
          <p className={styles.kicker}>Independent interface engineer</p>
          <h1 className={styles.title}>xEcho</h1>
          <p className={styles.subtitle}>
            Building clean, animated, AI-native products for teams that care about speed, taste, and precision.
          </p>
          <div className={styles.heroActions}>
            <a className={buttonClassName({ size: 'lg' })} href="#projects">
              View work <ArrowUpRight size={16} />
            </a>
            <a className={buttonClassName({ variant: 'outline', size: 'lg' })} href="#contact">
              Start a project
            </a>
          </div>
        </Reveal>
      </section>

      <section className={styles.signalStrip} aria-label="site metrics">
        <span>Realtime prototypes</span>
        <span>AI workflow systems</span>
        <span>Design-to-code execution</span>
      </section>

      <SiteContentSections />

      <section id="about" className={`${styles.section} ${styles.aboutSection}`}>
        <Reveal className={styles.aboutCopy}>
          <p className={styles.sectionEyebrow}>&#20851;&#20110;</p>
          <h2>I turn ambiguous product ideas into working systems.</h2>
          <p>
            xEcho is a personal studio for interface engineering, AI product prototyping, and front-end systems. The work is
            intentionally narrow: clarify the product loop, design the surface, build the interaction, and make it feel alive.
          </p>
          <div className={styles.aboutBadges}>
            <span>
              <Cpu size={15} /> Next.js
            </span>
            <span>
              <Sparkles size={15} /> Motion
            </span>
            <span>shadcn/ui</span>
            <span>Magic UI</span>
          </div>
        </Reveal>
        <Reveal className={styles.aboutVisual} delay={0.12}>
          <Globe className={styles.globe} />
          <div className={styles.orbitCard}>
            <span>Live signal</span>
            <strong>24 ms</strong>
          </div>
        </Reveal>
      </section>

      <section id="contact" className={styles.contact}>
        <Reveal className={styles.contactInner}>
          <p className={styles.sectionEyebrow}>&#32852;&#31995;</p>
          <h2>Have a product idea that needs a sharp interface?</h2>
          <a className={buttonClassName({ size: 'lg' })} href="mailto:hello@xecho.dev">
            hello@xecho.dev <ArrowUpRight size={16} />
          </a>
        </Reveal>
      </section>
    </div>
  );
}
