import Image from "next/image";
import styles from "./DeviceMockup.module.css";

const CHART_BARS = [45, 62, 54, 78, 70, 88];
const LAPTOP_ROWS = [86, 72, 60];

/** Simplified illustration of the app on a laptop and a phone. */
export default function DeviceMockup({ label }: { label: string }) {
  return (
    <div className={styles.devices} role="img" aria-label={label}>
      <div className={styles.laptop}>
        <div className={styles.screen}>
          <div className={styles.app}>
            <div className={styles.sidebar}>
              <Image src="/logo-only.png" alt="" width={18} height={18} className={styles.sidebarLogo} />
              {Array.from({ length: 5 }).map((_, i) => (
                <i key={i} className={styles.sidebarItem} />
              ))}
            </div>
            <div className={styles.main}>
              <div className={styles.titleRow}>
                <b className={styles.title} />
                <span className={styles.titleAction} />
              </div>
              <div className={styles.tiles}>
                <div className={styles.tile} />
                <div className={styles.tile} />
                <div className={styles.tile} />
              </div>
              <div className={styles.chart}>
                {CHART_BARS.map((h, i) => (
                  <span key={i} className={styles.bar} style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className={styles.rows}>
                {LAPTOP_ROWS.map((w, i) => (
                  <i key={i} className={styles.row} style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.base} />
      </div>

      <div className={styles.phone}>
        <div className={styles.phoneScreen}>
          <div className={styles.phoneTop}>
            <Image src="/logo-only.png" alt="" width={12} height={12} className={styles.phoneLogo} />
          </div>
          <svg className={styles.ring} viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#eceff1" strokeWidth="4" />
            <circle
              cx="18" cy="18" r="15" fill="none" stroke="#b88f14" strokeWidth="4"
              strokeDasharray="73 94" transform="rotate(-90 18 18)"
            />
          </svg>
          <div className={styles.phoneRow} />
          <div className={`${styles.phoneRow} ${styles.phoneRowShort}`} />
          <div className={styles.phoneRow} />
          <div className={`${styles.phoneRow} ${styles.phoneRowShort}`} />
        </div>
      </div>
    </div>
  );
}
