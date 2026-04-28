import styles from "./MetricCard.module.css";

export default function MetricCard({
  title,
  value,
  helper,
  trend = "",
  trendDirection = "neutral",
  emphasis = "default",
}) {
  const cardClassName =
    emphasis === "primary"
      ? `${styles.card} ${styles.cardPrimary}`
      : emphasis === "success"
      ? `${styles.card} ${styles.cardSuccess}`
      : `${styles.card}`;

  return (
    <article className={cardClassName}>
      <p className={styles.title}>{title}</p>
      <p className={styles.value}>{value}</p>
      <p className={styles.helper}>{helper}</p>
      {trend ? (
        <p
          className={`${styles.trend} ${
            trendDirection === "up"
              ? styles.trendUp
              : trendDirection === "down"
              ? styles.trendDown
              : styles.trendNeutral
          }`}
        >
          {trendDirection === "up" ? "↑ " : trendDirection === "down" ? "↓ " : "• "}
          {trend}
        </p>
      ) : null}
    </article>
  );
}
