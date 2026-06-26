'use client';

import Link from 'next/link';
import { ArrowUpRight, FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';

import { buttonClassName } from '@/components/ui/button';
import { fetchSiteContent, type SiteContent } from '@/lib/site-content';
import styles from '../projects.module.css';

type ProjectListItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  external: boolean;
};

function toProjectItems(content: SiteContent): ProjectListItem[] {
  return [
    ...content.tools.map((tool) => ({
      id: `tool-${tool.id}`,
      title: tool.title,
      body: tool.body,
      href: tool.href,
      external: tool.external,
    })),
    ...content.projects.map((project) => ({
      id: `project-${project.id}`,
      title: project.title,
      body: project.body,
      href: project.href,
      external: project.external,
    })),
  ];
}

export function ProjectIndexList() {
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadContent() {
      try {
        const content = await fetchSiteContent(controller.signal);
        setItems(toProjectItems(content));
        setError('');
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : '无法读取项目内容。');
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

  if (error) {
    return <p className={styles.notice}>{error}</p>;
  }

  if (!loading && !items.length) {
    return <p className={styles.notice}>暂无项目。</p>;
  }

  return (
    <div className={styles.cardList}>
      {items.map((item) => (
        <div className={styles.card} key={item.id}>
          <span>
            <FlaskConical size={20} />
          </span>
          <div>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </div>
          {item.external ? (
            <a className={buttonClassName({ size: 'sm' })} href={item.href} rel="noreferrer" target="_blank">
              GitHub <ArrowUpRight size={14} />
            </a>
          ) : (
            <Link className={buttonClassName({ size: 'sm' })} href={item.href}>
              打开 <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
