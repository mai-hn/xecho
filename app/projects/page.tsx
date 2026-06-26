import { ProjectIndexList } from './_components/project-index-list';
import styles from './projects.module.css';

export default function ProjectsPage() {
  return (
    <section className={styles.projectsIndex}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Projects / Lab</p>
        <h1>项目工作台</h1>
        <ProjectIndexList />
      </div>
    </section>
  );
}
