import Link from 'next/link';
import { ArrowUpRight, FlaskConical } from 'lucide-react';

import { buttonClassName } from '@/components/ui/button';
import styles from './projects.module.css';

export default function ProjectsPage() {
  return (
    <section className={styles.projectsIndex}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Projects / Lab</p>
        <h1>项目工作台</h1>
        <p>这里放置 xEcho 的产品实验和内部工具。模型测试控制台已经移动到项目子路由。</p>
        <div className={styles.card}>
          <span>
            <FlaskConical size={20} />
          </span>
          <div>
            <h2>模型测试控制台</h2>
            <p>配置 OpenAI 兼容 API、拉取模型、批量测试并查看图表和请求响应详情。</p>
          </div>
          <Link className={buttonClassName({ size: 'sm' })} href="/projects/model-test">
            打开 <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
