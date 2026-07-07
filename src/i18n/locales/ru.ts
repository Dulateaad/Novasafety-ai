import type { EgovSignRole } from '../../types/egovSignature'
import type { PermitStatus } from '../../types/domain'
import { uiExtRu, type UiExtension } from './uiExt'

const { common: uiCommonExt, notices: uiNoticesExt, ...uiRestRu } = uiExtRu

export type LanguageCode = 'ru' | 'en'

export type Locale = {
  lang: LanguageCode
  langLabel: string
  nav: {
    journal: string
    ndpr: string
    ppr: string
    risk: string
    permissions: string
    matrix: string
  }
  navTab: {
    journal: string
    ndpr: string
    ppr: string
    risk: string
    permissions: string
    matrix: string
  }
  layout: {
    signOut: string
    demoUser: string
    offline: string
    offlineSync: string
    offlineLimited: string
    appNav: string
    homeAria: string
    pushEnable: string
    pushDisable: string
    pushOn: string
    pushOff: string
    pushEnableAria: string
    pushDisableAria: string
    pushEnabled: string
    pushDisabled: string
    pushBlocked: string
    pushFailed: string
    sidebarOpen: string
    sidebarClose: string
    analytics: string
    settings: string
    help: string
    footerCopyright: string
    footerPrivacy: string
    footerTerms: string
  }
  notificationEmail: {
    label: string
    placeholder: string
    save: string
    saving: string
    saved: string
    cleared: string
    invalid: string
    bannerHint: string
    adminTitle: string
    adminHint: string
    adminColName: string
    adminColRole: string
    adminColLogin: string
    adminColNotify: string
    adminExecutorNote: string
    adminSavedFor: string
  }
  common: {
    openPermit: string
    hide: string
    language: string
    created: string
    manual: string
    next: string
    back: string
    all: string
    showAll: string
    untitled: string
    delete: string
    deleting: string
    updated: string
    open: string
    zonePrefix: string
    until: string
    noDeadline: string
    opening: string
  }
  wizard: {
    stepOf: (current: number, total: number) => string
  }
  signing: {
    stepPrefix: string
    action: Record<EgovSignRole, string>
    caption: Record<EgovSignRole, string>
    crewBlocked: string
    signaturesTitle: string
    signaturesHistoryTitle: string
    signaturesHistoryHint: string
    demoMode: string
    rejectPackage: string
    waitingFirst: string
  }
  signingUi: {
    signed: string
    rejected: string
    cancelled: string
    awaitingEsigh: string
    approveEgov: string
    reject: string
    needInternet: string
    youRejected: string
    packageRejected: string
    approvalCancelled: string
    reasonNotSpecified: string
    waitingDefault: string
  }
  signEligibility: {
    notOnApproval: string
    alreadySigned: string
    waitingQueue: string
    allStepsSigned: string
    stepUnavailable: string
    signByRole: string
    wrongAssignee: string
  }
  approval: {
    title: string
    statusTitle: string
    rejectedTitle: string
    flowStandard: string
    flowFire: string
    crewStep: string
    crewSection: string
    crewAfterProducer: string
    crewListEmpty: string
    crewOpenAfterProducer: string
    stepSigned: string
    stepRejected: string
    stepCancelled: string
    stepActive: string
    stepWaiting: string
    crewNow: string
    crewNotRequired: string
    crewDone: string
    crewMemberAcked: string
    crewMemberPending: string
    pendingTitle: string
    pendingHint: string
    openAndApprove: string
    hints: {
      sign_performer: string
      sign_permitter: string
      sign_issuer: string
      sign_lead_expert: string
      sign_ert: string
      issue_permit: string
      issueCoordinator: string
      issueIssuer: string
    }
  }
  invites: {
    signTitle: string
    ackTitle: string
    signHint: string
    ackHint: string
    activeNow: string
    waitingQueue: string
    openAndSign: string
    acknowledge: string
    ackPending: string
    signPending: string
    loginPrefix: string
    rejectedTitle: string
    rejectedHint: string
    rejectedBadge: string
    rejectedReasonFallback: string
  }
  notices: {
    issuedTitle: string
    closureTitle: string
    crewChangedTitle: string
    performerReplacedTitle: string
    ndprExtendedTitle: string
    panelTitle: string
  }
  ert: {
    panelTitle: string
    panelHint: string
    needsReading: string
    gasTestOptional: string
    openGasTest: string
  }
  journal: {
    title: string
    subtitle: string
    createPermit: string
    deleteAll: string
    deleting: string
    cleanupInvites: string
    cleaning: string
    renumber: string
    renumbering: string
    emptyTitle: string
    emptyHintCreate: string
    emptyHintWait: string
    emptyHintPermitter: string
    emptyHintApprover: string
    emptyFilterTitle: string
    emptyFilterIssued: string
    emptyFilterOther: string
    issuedHint: string
    issuedTab: string
    filterAll: string
    filterOnApproval: string
    filterRejected: string
    filterIssued: string
    filterActive: string
    filterClosed: string
    searchPlaceholder: string
    filtersBtn: string
    tabIssued: string
    tabArchive: string
    tabSearch: string
    exportExcel: string
    openAdmin: string
  }
  status: Record<PermitStatus, string>
  pages: {
    pprHowFill: string
    pprChooseMode: string
    pprWithAi: string
    pprNextNdpr: string
    pprAnalyzing: string
    ndprTitle: string
    ndprStep2: string
    ndprGatePpr: string
    riskTitle: string
    riskStep3: string
    riskGateNdpr: string
    permissionsTitle: string
    permissionsGateRisk: string
    permissionsGoRisk: string
    permissionsSubmit: string
    permissionsSubmitting: string
    permissionsFillAll: string
    permissionsAiBusy: string
  }
  matrix: {
    title: string
    subtitle: string
    empty: string
    pending: string
    rejected: string
    open: string
    closed: string
    until: string
    noDeadline: string
    colNum: string
    colTitle: string
    colLocation: string
    colWorkTypes: string
    colZone: string
    colDeadline: string
    colStatus: string
  }
  loadingTips: {
    title: string
    tips: readonly string[]
  }
  detail: {
    actionRequired: string
    signViaEgov: string
    rejectPrompt: string
  }
  roles: {
    issuer: string
    permitter: string
    performer: string
    executor: string
    coordinator: string
    contractor: string
    safety: string
    ert: string
    leadExpert: string
  }
} & UiExtension

export const ru: Locale = {
  lang: 'ru',
  langLabel: 'Русский',
  nav: {
    journal: 'Журнал НДПР',
    ndpr: 'НДПР',
    ppr: 'Исходный документ',
    risk: 'Оценка Риска',
    permissions: 'Разрешения',
    matrix: 'Матрица НД',
  },
  navTab: {
    journal: 'Журнал НДПР',
    ndpr: 'НДПР',
    ppr: 'Исходный документ',
    risk: 'Оценка Риска',
    permissions: 'Разрешения',
    matrix: 'Матрица',
  },
  layout: {
    signOut: 'Выйти',
    demoUser: 'Пользователь (демо)',
    offline: 'Оффлайн: приложение и ранее открытые наряды доступны без сети.',
    offlineSync: ' Изменения сохраняются локально и отправятся при восстановлении связи.',
    offlineLimited: ' Часть данных может быть недоступна до подключения к интернету.',
    appNav: 'Разделы приложения',
    homeAria: 'Журнал НДПР — главная',
    pushEnable: 'Включить push-уведомления',
    pushDisable: 'Отключить push-уведомления',
    pushOn: 'Push ✓',
    pushOff: 'Push',
    pushEnableAria: 'Включить push-уведомления в браузере',
    pushDisableAria: 'Отключить push-уведомления',
    pushEnabled: 'Push-уведомления включены',
    pushDisabled: 'Push-уведомления отключены',
    pushBlocked: 'Браузер заблокировал уведомления. Разрешите их в настройках сайта.',
    pushFailed: 'Не удалось включить push-уведомления',
    sidebarOpen: 'Открыть меню',
    sidebarClose: 'Закрыть меню',
    analytics: 'Аналитика',
    settings: 'Настройки',
    help: 'Справка и поддержка',
    footerCopyright: '© 2026 NOVA SAFETY AI. Все права защищены.',
    footerPrivacy: 'Политика конфиденциальности',
    footerTerms: 'Условия использования',
  },
  notificationEmail: {
    label: 'Email для уведомлений',
    placeholder: 'name@company.kz',
    save: 'Сохранить',
    saving: '…',
    saved: 'Email для уведомлений сохранён',
    cleared: 'Email для уведомлений удалён',
    invalid: 'Укажите реальный email (не @nova.local)',
    bannerHint: 'На эту почту приходят письма о подписи и статусе НДПР.',
    adminTitle: 'Админка · email для уведомлений',
    adminHint:
      'Укажите почту для согласующих, допускающих, выдающих, ERT, инспектора и др. Работникам письма не отправляются.',
    adminColName: 'ФИО',
    adminColRole: 'Роль',
    adminColLogin: 'Логин',
    adminColNotify: 'Email для писем',
    adminExecutorNote: 'работникам email не отправляется',
    adminSavedFor: 'Сохранено для {name}',
  },
  common: {
    openPermit: 'Открыть НДПР',
    hide: 'Скрыть',
    language: 'Язык',
    created: 'Создан',
    manual: 'Вручную',
    next: 'Далее',
    back: 'Назад',
    all: 'Все',
    showAll: 'Показать все',
    untitled: 'Без названия',
    delete: 'Удалить',
    deleting: 'Удаление…',
    updated: 'Обновлён',
    open: 'Открыть',
    zonePrefix: 'Зона',
    until: 'до',
    noDeadline: 'Срок не указан',
    opening: 'Открытие…',
    ...uiCommonExt,
  },
  wizard: {
    stepOf: (current, total) => `шаг ${current} из ${total}`,
  },
  signing: {
    stepPrefix: 'Шаг',
    action: {
      performer: 'Заполнение НДПР',
      ert: 'Согласование (ERT)',
      issuer: 'Выдача',
      permitter: 'Допуск',
      leadExpert: 'Утверждение',
    },
    caption: {
      performer: 'Производитель работ',
      permitter: 'Допускающий',
      issuer: 'Выдающий НД',
      leadExpert: 'Утверждающий НД',
      ert: 'ПАС (Пожарно-аварийная служба)',
    },
    crewBlocked: 'Ожидается ознакомление работников бригады с АБР и оценкой риска.',
    signaturesTitle: 'Подписи и согласования (ЭЦП)',
    signaturesHistoryTitle: 'Согласование и подписи (завершено)',
    signaturesHistoryHint: 'Кто подписал наряд на этапе согласования.',
    demoMode: 'Демо-режим: галочки без юридической ЭЦП.',
    rejectPackage: 'Отклонить пакет',
    waitingFirst: 'Сначала завершите {step}',
  },
  signingUi: {
    signed: 'Согласовано ЭЦП',
    rejected: 'Отклонено',
    cancelled: 'Отменено',
    awaitingEsigh: 'Ожидает ЭЦП',
    approveEgov: 'Согласовать (ЭЦП eGov)',
    reject: 'Отклонить',
    needInternet: 'Для QR-подписи нужен интернет.',
    youRejected: 'Вы отклонили пакет',
    packageRejected: 'Пакет отклонён на этом этапе',
    approvalCancelled: 'Согласование отменено',
    reasonNotSpecified: 'Причина не указана.',
    waitingDefault: 'Подпись ставит назначенное лицо этой роли, когда наступит его очередь.',
  },
  signEligibility: {
    notOnApproval: 'Наряд не на этапе «На согласовании».',
    alreadySigned: 'Этот этап уже подписан.',
    waitingQueue: 'Ожидает очереди (сейчас шаг {step}).',
    allStepsSigned: 'Все обязательные этапы подписаны.',
    stepUnavailable: 'Подпись этого этапа пока недоступна.',
    signByRole: 'Подпись ставит {role} ({assignee}). Вы вошли как {yourRole}.',
    wrongAssignee:
      'В наряде указан другой {role}: {assignee}. Ваш профиль: {yourName}. Попросите координатора назначить вас в карточке наряда.',
  },
  approval: {
    title: 'Согласование',
    statusTitle: 'Статус согласования НДПР',
    rejectedTitle: 'Согласование отклонено',
    flowStandard:
      '1) Производитель подписывает НДПР → 2) работники ознакомляются → 3) согласующие (выдающий, допускающий, утверждающий).',
    flowFire:
      '1) Производитель подписывает НДПР → 2) работники ознакомляются → 3) согласующие (при огневых — ERT Nash с газотестом, выдающий, допускающий, утверждающий).',
    crewStep: 'Шаг 2: Ознакомление работников бригады с АБР и оценкой риска',
    crewSection: 'Работники — ознакомление с АБР и оценкой рисков',
    crewAfterProducer: 'После подписи производителя',
    crewListEmpty: 'Список работников не указан.',
    crewOpenAfterProducer: 'Ознакомление откроется после подписи производителя работ (шаг 1).',
    stepSigned: 'Подписано',
    stepRejected: 'Отклонено',
    stepCancelled: 'Отменено',
    stepActive: 'Сейчас',
    stepWaiting: 'Ожидает',
    crewNow: 'Сейчас',
    crewNotRequired: 'Не требуется',
    crewDone: 'Завершено',
    crewMemberAcked: 'ознакомлен',
    crewMemberPending: 'ожидает ознакомления',
    pendingTitle: 'Ожидают вашего согласования',
    pendingHint: 'Наряды со статусом «На согласовании», где нужна ваша подпись или выдача.',
    openAndApprove: 'Открыть и согласовать',
    hints: {
      sign_performer: 'Откройте карточку → шаг 1 (производитель) → «Согласовать (ЭЦП eGov)».',
      sign_permitter: 'После ознакомления бригады → допускающий → «Согласовать (ЭЦП eGov)».',
      sign_issuer: 'После ознакомления бригады → выдающий → «Согласовать (ЭЦП eGov)».',
      sign_lead_expert: 'После ознакомления бригады → утверждающий → «Согласовать (ЭЦП eGov)».',
      sign_ert: 'После ознакомления бригады → ERT Nash (ПАС) → «Согласовать (ЭЦП eGov)».',
      issue_permit: 'Все этапы согласования завершены — наряд будет выдан автоматически после последней подписи.',
      issueCoordinator: 'Можно выдать наряд-допуск',
      issueIssuer: 'Выдать наряд-допуск',
    },
  },
  invites: {
    signTitle: 'Требуется ваша подпись',
    ackTitle: 'Требуется ознакомление',
    signHint:
      'Вам назначена подпись единого PDF-пакета: НДПР, Анализ безопасности работ и Оценка Риска. Войдите под своей учётной записью и подпишите через eGov Mobile.',
    ackHint:
      'Вам назначено ознакомление с АБР и оценкой риска по наряд-допуску. Откройте наряд и подтвердите через eGov Mobile.',
    activeNow: '● Сейчас',
    waitingQueue: '○ Ожидает очереди',
    openAndSign: 'Открыть и подписать',
    acknowledge: 'Ознакомиться',
    ackPending: 'Ознакомление доступно после формирования пакета НДПР.',
    signPending: 'Подпись станет доступна после предыдущих этапов согласования.',
    loginPrefix: 'вход:',
    rejectedTitle: 'Согласование отклонено',
    rejectedHint:
      'Пакет НДПР отклонён на этапе согласования. Ваша подпись больше не требуется — ниже указана причина.',
    rejectedBadge: '✕ Отклонено',
    rejectedReasonFallback: 'Причина отклонения указана в карточке НДПР.',
  },
  notices: {
    issuedTitle: 'НДПР открыт для всех',
    closureTitle: 'Закрытие разрешений сохранено',
    crewChangedTitle: 'Изменён состав бригады',
    performerReplacedTitle: 'Замена производителя работ',
    ndprExtendedTitle: 'Продление НДПР',
    panelTitle: 'Уведомления по НДПР',
    ...uiNoticesExt,
  },
  ert: {
    panelTitle: 'Задание: журнал газотестов (ERT)',
    panelHint:
      'Заполните таблицу газотеста в PDF разрешений по выданным нарядам ниже. Данные сохраняются в разрешение и общий пакет.',
    needsReading: '● Требуется замер',
    gasTestOptional: '○ Газотест',
    openGasTest: 'Открыть газотест',
  },
  journal: {
    title: 'Журнал НДПР',
    subtitle: 'Наряды-допуски на объекте',
    createPermit: 'Создать НДПР',
    deleteAll: 'Удалить все',
    deleting: 'Удаление…',
    cleanupInvites: 'Очистить уведомления',
    cleaning: 'Очистка…',
    renumber: 'Исправить нумерацию (001…)',
    renumbering: 'Исправление…',
    emptyTitle: 'Пока нет нарядов',
    emptyHintCreate:
      'Нажмите «Создать НДПР» выше: Исходный документ → НДПР → Мероприятия по ОТ, ТБ и ООС.',
    emptyHintWait: 'Наряды появятся после отправки пакета на согласование.',
    emptyHintPermitter:
      'Журнал заполнится, когда производитель работ отправит наряд на согласование. Тогда откройте наряд в журнале и заполните раздел 3 — колонку «Имеется».',
    emptyHintApprover:
      'Журнал заполнится после отправки пакета производителем работ. Следите за заданиями на подписание и согласование выше.',
    emptyFilterTitle: 'Нет нарядов в этой вкладке',
    emptyFilterIssued:
      'После подписи всех согласующих наряд автоматически получает статус «Выдан» и появляется здесь.',
    emptyFilterOther: 'Попробуйте другую вкладку или откройте «Все».',
    issuedHint:
      'Полностью согласованные наряды остаются в журнале со статусом «Выдан». Откройте вкладку «Выданные» или найдите их в общем списке ниже.',
    issuedTab: 'Выданные',
    filterAll: 'Все',
    filterOnApproval: 'На согласовании',
    filterRejected: 'Отклонённые',
    filterIssued: 'Выданные',
    filterActive: 'Открытые',
    filterClosed: 'Закрытые',
    searchPlaceholder: 'Поиск по объекту или теме…',
    filtersBtn: 'Фильтры',
    tabIssued: 'Выданные НД',
    tabArchive: 'Архив НД',
    tabSearch: 'Поиск и фильтрация',
    exportExcel: 'Выгрузить в Excel',
    openAdmin: 'Админ-панель',
  },
  status: {
    draft: 'Черновик',
    on_approval: 'На согласовании',
    rejected: 'Отклонён',
    issued: 'Выдан',
    in_progress: 'В работе',
    suspended: 'Приостановлен',
    closed: 'Закрыт',
    archived: 'Архив',
    annulled: 'Аннулирован',
  },
  pages: {
    pprHowFill: 'Как заполнить НДПР?',
    pprChooseMode:
      'Выберите способ: с помощью NOVA SAFETY AI из исходного документа или пустая форма для ручного ввода.',
    pprWithAi: 'С помощью NOVA SAFETY AI',
    pprNextNdpr: 'Далее — НДПР',
    pprAnalyzing: 'NOVA SAFETY AI анализирует документ… после завершения откроется форма НДПР.',
    ndprTitle: 'НДПР',
    ndprStep2: 'Наряд-допуск на проведение работ — шаг 2 из 3',
    ndprGatePpr:
      'Сначала завершите шаг «Исходный документ» — загрузите документ и выберите способ заполнения НДПР.',
    riskTitle: 'Оценка Риска',
    riskStep3: 'шаг 3 из',
    riskGateNdpr: 'Сначала заполните «НДПР» и нажмите «Создать НДПР».',
    permissionsTitle: 'Разрешения',
    permissionsGateRisk: 'Сначала завершите шаг «Оценка Риска».',
    permissionsGoRisk: 'Оценка Риска',
    permissionsSubmit: 'Отправить на согласование',
    permissionsSubmitting: 'Отправка…',
    permissionsFillAll: 'Заполнить все через NOVA SAFETY AI',
    permissionsAiBusy: 'ИИ заполняет…',
  },
  matrix: {
    title: 'Матрица НД',
    subtitle: 'Реестр: номер, объект, срок и статус согласования.',
    empty: 'Нет нарядов-допусков.',
    pending: 'В процессе согласования',
    rejected: 'Отклонён',
    open: 'Открыт',
    closed: 'Закрыт',
    until: 'до',
    noDeadline: 'Срок не указан',
    colNum: '№',
    colTitle: 'Наименование НДПР',
    colLocation: 'Локация',
    colWorkTypes: 'Виды работ',
    colZone: 'Зона',
    colDeadline: 'Срок до окончания',
    colStatus: 'Статус',
  },
  loadingTips: {
    title: 'NOVA · безопасность на объекте',
    tips: [
      'Перед началом работ убедитесь, что все участники ознакомлены с АБР и оценкой риска.',
      'Газоопасные работы — только после заполнения таблицы газотеста ERT и проверки LEL, H2S, O₂, CO.',
      'При изменении условий на площадке немедленно остановите работы и сообщите инспектору ТБ.',
      'СИЗ и средства пожаротушения должны быть на месте до допуска к работам.',
      'Закрытие разрешений — обязательный шаг после завершения работ на объекте.',
      'Подписывайте документы только через eGov Mobile под своей учётной записью.',
    ],
  },
  detail: {
    actionRequired: 'Требуется ваше действие',
    signViaEgov: 'Подписать через eGov Mobile',
    rejectPrompt: 'Укажите причину отклонения пакета:',
  },
  roles: {
    issuer: 'Выдающий НД',
    permitter: 'Допускающий',
    performer: 'Производитель работ',
    executor: 'Работник',
    coordinator: 'Координатор НД / админ',
    contractor: 'Подрядчик',
    safety: 'Инспектор по ОТ, ТБ и ООС',
    ert: 'ПАС (Пожарно-аварийная служба)',
    leadExpert: 'Утверждающий НД',
  },
  ...uiRestRu,
}
