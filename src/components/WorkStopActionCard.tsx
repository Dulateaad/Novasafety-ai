import { INSPECTOR_ROLE_TITLE } from '../types/domain'

export function WorkStopActionCard(props: { onOpen: () => void; disabled?: boolean }) {
  const { onOpen, disabled } = props

  return (
    <section className="work-stop-action" aria-labelledby="work-stop-action-title">
      <div className="work-stop-action__inner">
        <div className="work-stop-action__head">
          <span className="work-stop-action__icon" aria-hidden>
            ⏸
          </span>
          <div className="work-stop-action__head-text">
            <span className="work-stop-action__eyebrow">Экстренный сигнал</span>
            <h2 id="work-stop-action-title" className="work-stop-action__title">
              Остановить работу
            </h2>
            <p className="work-stop-action__desc">
              Любой участник наряда может немедленно приостановить работы на объекте.
              {INSPECTOR_ROLE_TITLE} получит уведомление и примет решение.
            </p>
          </div>
        </div>

        <ol className="work-stop-action__steps">
          <li>Укажите причину остановки (обязательно)</li>
          <li>При необходимости приложите фото</li>
          <li>Ожидайте решения инспектора — без эскалации</li>
        </ol>

        <div className="work-stop-action__footer">
          <button
            type="button"
            className="btn work-stop-action__btn"
            disabled={disabled}
            onClick={onOpen}
          >
            Остановить работу
          </button>
          <p className="work-stop-action__note muted xsmall">
            Доступно участникам наряда · не требует отдельной роли
          </p>
        </div>
      </div>
    </section>
  )
}
