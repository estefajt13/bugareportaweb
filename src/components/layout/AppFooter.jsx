import styles from "./AppFooter.module.css";

export default function AppFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.copy}>BugaReporta+ - Gestion ciudadana inteligente</p>
      <p className={styles.meta}>Version web en preparacion de integracion de reportes</p>
    </footer>
  );
}
