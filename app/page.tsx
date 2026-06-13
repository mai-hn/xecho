import Link from 'next/link';
import { ArrowUpRight, Boxes, BrainCircuit, Cpu, FlaskConical, PenLine, Sparkles, TerminalSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ParticleRays } from './_components/particle-rays';
import { Reveal } from './_components/reveal';
import { Globe } from '@/components/ui/globe';
import { buttonClassName } from '@/components/ui/button';
import styles from './page.module.css';

const projects = [
  {
    title: 'Signal OS',
    meta: 'AI workflow / 2026',
    body: 'A command surface for research, writing, and execution. It turns scattered context into reliable next actions.',
  },
  {
    title: 'Vector Desk',
    meta: 'Design system / 2025',
    body: 'A lightweight component language for dense product teams that need interfaces to stay fast and legible.',
  },
  {
    title: 'Echo Lab',
    meta: 'Prototype studio / 2025',
    body: 'Small experiments in agents, motion, retrieval, and human-computer collaboration.',
  },
];

type Tool = {
  icon: LucideIcon;
  title: string;
  body: string;
  href?: string;
};

const tools: Tool[] = [
  { icon: TerminalSquare, title: 'Codex stack', body: 'Next.js, TypeScript, shadcn, motion, and fast local iteration.' },
  { icon: BrainCircuit, title: 'AI interface', body: 'Prompt systems, evaluation loops, agent workflows, and retrieval products.' },
  {
    icon: FlaskConical,
    title: 'Model tester',
    body: 'OpenAI-compatible API and model benchmark console with charts and request details.',
    href: '/projects/model-test',
  },
  { icon: Boxes, title: 'Product craft', body: 'Information architecture, frontend systems, dashboards, and prototype-to-prod handoff.' },
];

const posts = [
  'How to keep agent products observable without slowing teams down',
  'Designing command palettes for real work, not demo clips',
  'Why white space is infrastructure in technical interfaces',
];

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

      <section id="projects" className={styles.section}>
        <Reveal className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>&#39033;&#30446;</p>
          <h2>Selected systems, shaped from idea to interface.</h2>
        </Reveal>
        <div className={styles.projectGrid}>
          {projects.map((project, index) => (
            <Reveal key={project.title} delay={index * 0.08} className={styles.projectCard}>
              <span className={styles.cardIndex}>0{index + 1}</span>
              <p className={styles.cardMeta}>{project.meta}</p>
              <h3>{project.title}</h3>
              <p>{project.body}</p>
              <a href="#contact">
                Discuss this direction <ArrowUpRight size={15} />
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="tools" className={`${styles.section} ${styles.toolsSection}`}>
        <Reveal className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>&#24037;&#20855;</p>
          <h2>A compact toolkit for modern product surfaces.</h2>
        </Reveal>
        <div className={styles.toolGrid}>
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            const content = (
              <>
                <span className={styles.toolIcon}>
                  <Icon size={20} />
                </span>
                <h3>{tool.title}</h3>
                <p>{tool.body}</p>
                {tool.href ? (
                  <span className={styles.toolCta}>
                    Open route <ArrowUpRight size={14} />
                  </span>
                ) : null}
              </>
            );

            return (
              <Reveal key={tool.title} delay={index * 0.08}>
                {tool.href ? (
                  <Link className={`${styles.toolCard} ${styles.toolCardLink}`} href={tool.href}>
                    {content}
                  </Link>
                ) : (
                  <div className={styles.toolCard}>{content}</div>
                )}
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="blog" className={styles.section}>
        <Reveal className={styles.blogPanel}>
          <div>
            <p className={styles.sectionEyebrow}>&#21338;&#23458;</p>
            <h2>Notes from the build bench.</h2>
            <p className={styles.sectionText}>
              Short essays on interfaces, agent workflows, and the small decisions that make technical products feel calm.
            </p>
          </div>
          <div className={styles.postList}>
            {posts.map((post) => (
              <a key={post} href="#contact" className={styles.postItem}>
                <PenLine size={16} />
                <span>{post}</span>
                <ArrowUpRight size={15} />
              </a>
            ))}
          </div>
        </Reveal>
      </section>

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
