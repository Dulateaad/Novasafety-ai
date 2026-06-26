import { AppLogo } from '../components/AppLogo'
import { useLanguage } from '../context/LanguageContext'

export function HelpPage() {
  const { t } = useLanguage()
  const h = t.helpPage

  return (
    <div className="page help-page">
      <header className="help-hero card">
        <div className="help-hero__text">
          <p className="help-hero__brand">{h.brand}</p>
          <h1>{h.title}</h1>
          <p className="help-hero__lead muted">{h.lead}</p>
        </div>
        <div className="help-hero__logo">
          <AppLogo size="lg" variant="sidebar" className="brand-mark__logo--help" />
        </div>
      </header>

      <section className="help-section card help-intro">
        <h2>{h.whatIsTitle}</h2>
        <p>{h.whatIsBody}</p>
      </section>

      <section className="help-section card">
        <h2 className="help-section__title">
          <span className="help-section__icon" aria-hidden>
            👥
          </span>
          {h.rolesTitle}
        </h2>
        <ul className="help-role-grid">
          {h.roles.map((role) => (
            <li key={role.title} className="help-role-card card">
              <div className="help-role-card__head">
                <div>
                  <h3>{role.title}</h3>
                  {role.badge ? (
                    <span className={`help-badge help-badge--${role.badgeKind ?? 'role'}`}>
                      {role.badge}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="help-role-card__text">{role.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="help-section card">
        <h2 className="help-section__title">
          <span className="help-section__icon" aria-hidden>
            🔄
          </span>
          {h.processTitle}
        </h2>
        <ol className="help-steps">
          {h.steps.map((step, index) => (
            <li key={step.title} className="help-step">
              <span className="help-step__num" aria-hidden>
                {index + 1}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="help-section card">
        <h2 className="help-section__title">
          <span className="help-section__icon" aria-hidden>
            ⚡
          </span>
          {h.featuresTitle}
        </h2>
        <ul className="help-feature-grid">
          {h.features.map((feature) => (
            <li key={feature.title} className="help-feature-card card">
              <div className="help-feature-card__head">
                <span className="help-feature-card__emoji" aria-hidden>
                  {feature.icon}
                </span>
                <div>
                  <h3>{feature.title}</h3>
                  {feature.live ? (
                    <span className="help-badge help-badge--live">{h.liveBadge}</span>
                  ) : null}
                </div>
              </div>
              <p>{feature.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="help-section card">
        <h2 className="help-section__title">
          <span className="help-section__icon" aria-hidden>
            🛑
          </span>
          {h.workStopTitle}
        </h2>
        <ul className="help-workstop-grid">
          {h.workStop.map((item) => (
            <li key={item.title} className="help-workstop-card card">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="help-cta card">
        <h2>{h.ctaTitle}</h2>
        <p className="muted">{h.ctaSubtitle}</p>
        <a
          className="btn primary help-cta__btn"
          href={`mailto:${h.supportEmail}?subject=${encodeURIComponent(h.title)}`}
        >
          {h.ctaButton}
        </a>
      </section>
    </div>
  )
}
