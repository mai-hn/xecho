'use client';

import Link from 'next/link';
import { ArrowUpRight, FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';

import { fetchSiteContent, type SiteContent } from '@/lib/site-content';
import styles from '../page.module.css';
import { Reveal } from './reveal';

const iconMap = {
  flask: FlaskConical,
};

export function SiteContentSections() {
  const [content, setContent] = useState<SiteContent>({ projects: [], tools: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadContent() {
      try {
        const nextContent = await fetchSiteContent(controller.signal);
        setContent(nextContent);
        setError('');
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : '无法读取站点内容。');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadContent();

    return () => controller.abort();
  }, []);

  return (
    <>
      <section id="projects" className={styles.section}>
        <Reveal className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>&#39033;&#30446;</p>
          <h2>Selected systems, shaped from idea to interface.</h2>
        </Reveal>
        {error ? <p className={styles.contentNotice}>{error}</p> : null}
        <div className={styles.projectGrid}>
          {content.projects.map((project, index) => (
            <Reveal key={project.id} delay={index * 0.08} className={styles.projectCard}>
              <span className={styles.cardIndex}>0{index + 1}</span>
              <p className={styles.cardMeta}>{project.meta}</p>
              <h3>{project.title}</h3>
              <p>{project.body}</p>
              <a href={project.href} rel="noreferrer" target={project.external ? '_blank' : undefined}>
                {project.external ? 'GitHub' : 'Open'} <ArrowUpRight size={15} />
              </a>
            </Reveal>
          ))}
        </div>
        {!loading && !content.projects.length && !error ? <p className={styles.contentNotice}>暂无项目。</p> : null}
      </section>

      <section id="tools" className={`${styles.section} ${styles.toolsSection}`}>
        <Reveal className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>&#24037;&#20855;</p>
          <h2>A compact toolkit for modern product surfaces.</h2>
        </Reveal>
        <div className={styles.toolGrid}>
          {content.tools.map((tool, index) => {
            const Icon = iconMap[tool.icon as keyof typeof iconMap] ?? FlaskConical;
            const contentNode = (
              <>
                <span className={styles.toolIcon}>
                  <Icon size={20} />
                </span>
                <h3>{tool.title}</h3>
                <p>{tool.body}</p>
                <span className={styles.toolCta}>
                  {tool.external ? 'Open link' : 'Open route'} <ArrowUpRight size={14} />
                </span>
              </>
            );

            return (
              <Reveal key={tool.id} delay={index * 0.08}>
                {tool.external ? (
                  <a className={`${styles.toolCard} ${styles.toolCardLink}`} href={tool.href} rel="noreferrer" target="_blank">
                    {contentNode}
                  </a>
                ) : (
                  <Link className={`${styles.toolCard} ${styles.toolCardLink}`} href={tool.href}>
                    {contentNode}
                  </Link>
                )}
              </Reveal>
            );
          })}
        </div>
        {!loading && !content.tools.length && !error ? <p className={styles.contentNotice}>暂无工具。</p> : null}
      </section>
    </>
  );
}
