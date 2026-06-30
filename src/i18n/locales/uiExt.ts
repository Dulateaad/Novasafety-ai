import type { SpecialWorkActivity } from '../../types/domain'
import type { WorkPermissionKind } from '../../types/workPermissions'
import type { EgovSignRole } from '../../types/egovSignature'

export type UiExtension = {
  branding: {
    tagline: string
    sourceDocument: string
    abr: string
    ndpr: string
    workPermitFallback: string
    certificatesTitle: string
    certificatesSubtitle: string
    certificatesGateHint: string
    goToSource: string
    linkedProcedures: string
    attachedToCurrentSource: string
    fileNotInApp: string
    deployInstructions: string
  }
  common: {
    save: string
    saving: string
    cancel: string
    close: string
    yes: string
    no: string
    na: string
    view: string
    download: string
    upload: string
    loading: string
    processing: string
    send: string
    add: string
    remove: string
    regNo: string
    document: string
    format: string
    role: string
    demo: string
    permit: string
    permission: string
    stage: string
    forming: string
    formingPdf: string
    uploadFile: string
    selectFile: string
    dropFile: string
    ai: string
    aiBusy: string
    aiSections: string
    generate: string
    generatePermission: string
    notFound: string
    backToList: string
    unavailable: string
    openingDraft: string
    noWorkersAvailable: string
    enabled: string
    disabled: string
    stagePrefix: string
  }
  login: {
    subtitle: string
    password: string
    signIn: string
    signingIn: string
    offlineBanner: string
    wrongCredentials: string
    tooManyAttempts: string
    userNotFound: string
    failed: string
  }
  confirm: {
    deletePermit: string
    deleteAllPermits: string
    closeEarly: string
    annulNdpr: string
  }
  alerts: {
    settingsFailed: string
    invitesCleaned: string
    invitesCleanFailed: string
    renumberDone: string
    renumberDoneLocal: string
    renumberFailed: string
    deleteFailed: string
    firebaseFunctionsUnavailable: string
  }
  adminPanel: {
    titleInspector: string
    workStopNotifications: string
    titleEgovSign: string
    currently: string
  }
  adminPage: {
    title: string
    subtitle: string
    backJournal: string
    adminLabel: string
    activeBadge: string
    exportExcel: string
    personnelTitle: string
    personnelHint: string
    personnelEmpty: string
    colName: string
    colPosition: string
    colRole: string
    colDepartment: string
    colAction: string
    defaultDepartment: string
    edit: string
    firebaseOnlyHint: string
    navLabel: string
  }
  godMode: {
    title: string
    descriptionIntro: string
    descriptionWorkers: string
    descriptionAck: string
    descriptionApprovers: string
    descriptionApproversList: string
    descriptionExcluded: string
    latestPermit: string
    noPermits: string
    signLatest: string
    busy: string
    confirm: string
    done: string
    doneDemo: string
    failed: string
  }
  journalTable: {
    siteTopic: string
    regNo: string
    workTypes: string
    zone: string
    status: string
    updated: string
    admin: string
  }
  permissionsBody: {
    aiFillingSections: string
    cardMeta: string
    pdfReady: string
    pdfPending: string
    footerHint: string
  }
  pprPage: {
    backToChoice: string
    retry: string
    proceduresLegend: string
    proceduresHint: string
    analyzing: string
    clear: string
    workTitlePlaceholder: string
    workTitleMissing: string
  }
  manualReviewForm: {
    abrTitle: string
    abrHint: string
    workLocation: string
    permitNo: string
    date: string
    shiftDay: string
    shiftNight: string
    jobDescription: string
    noStages: string
    stageLegend: string
    stageTitle: string
    hazardNumbers: string
    controlNumbers: string
    removeStage: string
    briefingLegend: string
    briefingTopHazards: string
    briefingStopScenarios: string
    briefingMorMentors: string
    crewAbrLegend: string
    fullName: string
    badgeNo: string
    approvalLegend: string
    riskTitle: string
    riskHint: string
    siteObject: string
    assessmentDate: string
    contractorOrg: string
    preparedBy: string
    noTasks: string
    taskLegend: string
    taskTitle: string
    hazardLegend: string
    operation: string
    hazardThreat: string
    whoAtRisk: string
    controlMeasures: string
    responsible: string
    removeTask: string
    removeHazard: string
    likelihood: string
    severity: string
    riskLevel: string
    crewNdprLegend: string
    signaturesLegend: string
  }
  admin: {
    inspectorScopeAll: string
    inspectorScopeZone: string
    enableZoneScope: string
    enableGlobalScope: string
    godModeNeedPermit: string
    fioVerifyLabel: string
    disableFioVerify: string
    enableFioVerify: string
  }
  access: {
    loginRequired: string
    submitDenied: string
    executorNavLocked: string
    gateNdpr: string
    gateRisk: string
    gatePermissionsNotNeeded: string
    gatePermissions: string
    gateUnavailable: string
  }
  crew: {
    label: string
    confirmation: string
    blockedDefault: string
    notOnApproval: string
    needProducer: string
    demoSuffix: string
    documentAbrRisk: string
    inviteApproval: string
  }
  abrDailyAck: {
    title: string
    description: string
    confirmation: string
    todayPrefix: string
    noSignaturesYet: string
    signedProgress: string
    notSignedToday: string
    reportTitle: string
    colDate: string
    colName: string
    colRole: string
    colSignature: string
    pendingTitle: string
    pendingHint: string
    openPermit: string
  }
  egovRoles: Record<EgovSignRole, string>
  specialWork: Record<SpecialWorkActivity, string>
  workPermissionKinds: Record<WorkPermissionKind, string>
  modals: {
    signCancelled: string
    pdfPackageFailed: string
    signServerUnavailable: string
    signServerUnavailableAck: string
    verifyingEsighAndFio: string
    verifyingEsigh: string
    closeAria: string
    regNoField: string
    roleField: string
    formatField: string
    wpTitle: string
  }
  workStop: {
    panelTitle: string
    modalTitle: string
    reasonPlaceholder: string
    photoReplace: string
    photoCapture: string
    photoAlt: string
    submit: string
    submitting: string
    resolvePlaceholder: string
    liftStop: string
    annulConfirm: string
    lifted: string
    annulled: string
    closeNotice: string
    closeNoticeAria: string
  }
  workPermission: {
    updatingPdf: string
    savedClosure: string
    saveClosure: string
    updatingPermPdf: string
    savedPermPdf: string
    permPdf: string
    saveGasTest: string
    clarification: string
    workLabel: string
    workLabelCs: string
    equipLabel: string
    section1Title: string
    section1Hint: string
    sitePlaceholder: string
    regPlaceholder: string
    permNoPlaceholder: string
    workPlaceholder: string
    workPlaceholderCs: string
    equipPlaceholder: string
    csTypeTitle: string
    csTypeHint: string
    observerPlaceholder: string
    checksFire: string
    checksWorkplace: string
    checksHint: string
    extraTitle: string
    extraHint: string
    extraPlaceholder: string
    retestPlaceholder: string
    gasZonePlaceholder: string
  }
  gasTest: {
    onApprovalHint: string
    draftHint: string
    closedHint: string
    rejectedHint: string
    editHint: string
    noPermissions: string
    fillTable: string
    tableFilled: string
    panelTitle: string
    panelHint: string
    stepFill: string
    stepSave: string
    stepPdf: string
    savedConfirm: string
    editAgain: string
    filledBadge: string
    summaryTitle: string
    openSection: string
    addRow: string
    emptyTable: string
    colDateIssued: string
    colWorkZone: string
    colInstrument: string
    colWorker: string
    colDate: string
    colTime: string
    colLel: string
    colH2s: string
    colO2: string
    colCo: string
    colTester: string
    updatedLabel: string
    ertFillsNote: string
  }
  preWorkCheck: {
    panelTitle: string
    panelTitleFire: string
    panelHint: string
    stepFill: string
    stepSave: string
    stepPdf: string
    needsFill: string
    saveChecks: string
    onApprovalHint: string
    draftHint: string
    closedHint: string
    rejectedHint: string
    editHint: string
    noPermissions: string
    fillChecks: string
    checksFilled: string
    tasksTitle: string
    tasksHint: string
    openChecks: string
    savedConfirm: string
    editAgain: string
  }
  closure: {
    closeBusy: string
    closeButton: string
  }
  docKit: {
    ndpr: string
    abr: string
    risk: string
    viewPdf: string
    fillGasTest: string
    fullPackage: string
    ertPanelTitle: string
    approvalPackage: string
  }
  riskPage: {
    uploadSourceFirst: string
    riskReady: string
    generateAbrFirst: string
    generateRiskFirst: string
    riskAssessmentTitle: string
    saveForErt: string
    uploadSource: string
    confirmManualReview: string
    saveToDb: string
    buildPdfPackage: string
    submitApproval: string
    provisionSigners: string
    submittedNoInvitesFunctions: string
    submittedNoInvites: string
    submittedNoInvitesError: string
    generateAbr: string
    generateRisk: string
    viewRisk: string
    submitRequirementsAria: string
    waitAnalysis: string
    tabManualFill: string
    tabGenerate: string
  }
  ndprPage: {
    duplicateWorker: string
    fillNdprFirst: string
    manualFillHint: string
    autoFillHint: string
    regAssigned: string
    regAuto: string
  }
  permissionsPage: {
    formingKind: string
    pdfFailed: string
    prepPackage: string
    submitApproval: string
  }
  detailPage: {
    notFound: string
    backToList: string
    unavailable: string
    openingDraft: string
    deleteConfirm: string
    closeEarlyConfirm: string
    ertDocsTitle: string
    viewFullPdf: string
    pprName: string
    pprSite: string
    pprPeriod: string
    pprPreparedBy: string
    pprTasksCount: string
    viewSource: string
    noSourceFile: string
    riskFile: string
    blocks: string
    downloadPdf: string
    downloadMd: string
    asorSaved: string
    creationDate: string
    duration: string
    tentativeNd: string
    workPlaces: string
    matrixCell: string
    tasksCount: string
  }
  pprUpload: {
    dropHint: string
    dropHere: string
    release: string
    selectFile: string
    uploading: string
    description: string
    uploadedMeta: string
    replaceDropHint: string
    replace: string
    fileTypesHint: string
  }
  manualReview: {
    addTask: string
    addHazard: string
    addStage: string
    worker: string
    performer: string
    permitter: string
    issuer: string
    leadExpert: string
  }
  ai: {
    requestFailed: string
    openChat: string
    closeChat: string
    collapse: string
    you: string
    reply: string
    message: string
  }
  photo: {
    capture: string
    processing: string
    siteAlt: string
    captionPlaceholder: string
  }
  rejection: {
    reasonFallback: string
    closeAria: string
    closeTitle: string
  }
  transitions: {
    invalid: string
    needPerformer: string
    needCrewAck: string
    needPermitterIssuer: string
    needLeadExpert: string
    needF09: string
  }
  notices: {
    issuedMessage: string
    closureMessage: string
    crewChangedMessage: string
    performerReplacedMessage: string
    ndprExtendedMessage: string
    infoMessage: string
    infoTitle: string
  }
  tools: {
    selectItem: string
    newItem: string
    namePlaceholder: string
    removeItem: string
  }
  stages: {
    stageN: string
  }
  ndprForm: {
    sourceDataLegend: string
    organization: string
    siteLocation: string
    zoneClassification: string
    workTitle: string
    performerBadgeHint: string
    workStages: string
    workStagesPlaceholder: string
    participantsLegend: string
    participantsHint: string
    signer1Performer: string
    signer2Permitter: string
    signer3Issuer: string
    signer4LeadExpert: string
    signer5Ert: string
    ertApproverNote: string
    selectPlaceholder: string
    f02Legend: string
    badgeNo: string
    shift: string
    shiftDay: string
    shiftNight: string
    startDateTime: string
    endDateTime: string
    workersLegend: string
    workersHint: string
    workersProducerHint: string
    addWorker: string
    workersEmptyHint: string
    fromUserList: string
    date: string
    removeWorker: string
    createButton: string
  }
  workActivities: {
    title: string
    selectedCount: string
    permissionsRequired: string
    hint: string
    fireNote: string
  }
  riskForm: {
    clearForm: string
    abrDescription: string
    abrGenerating: string
    abrDocSummary: string
    abrGenNote: string
    riskDescription: string
    riskGenerating: string
    riskDocSummary: string
    preSubmitTitle: string
    preSubmitHint: string
    sourceNotUploaded: string
    abrReady: string
    abrNotReady: string
    riskReady: string
    riskNotReady: string
    manualReviewConfirm: string
    submitConditionsTitle: string
    generateBothHint: string
    submitConditionsHint: string
    confirmReviewHint: string
    packageSubmitting: string
    pdfDeferredHint: string
  }
  detailForm: {
    versionLabel: string
    ertGasTestHeader: string
    asorFormTitle: string
    asorMissingHint: string
    requisitesTitle: string
    organization: string
    siteLocation: string
    registrationNo: string
    workTypes: string
    zoneClassification: string
    workDescription: string
    toolsAndEquipment: string
    signer1Performer: string
    signer2Permitter: string
    signer3Issuer: string
    signer4LeadExpert: string
    f04Title: string
    routeSheetNo: string
    workArea: string
    specialConditions: string
    matrixTitle: string
    matrixDocuments: string
    matrixInteraction: string
    matrixDefaultValidity: string
    f02Legend: string
    badgeNo: string
    shift: string
    shiftDay: string
    shiftNight: string
    startDateTime: string
    endDateTime: string
    workersTitle: string
    workersHint: string
    addWorker: string
    noWorkers: string
    directoryNameCol: string
    dateCol: string
    selectPlaceholder: string
    f09Title: string
    f09Hint: string
    f05Title: string
    f05Empty: string
    demoSuffix: string
  }
  validation: {
    generatePermissions: string
    missingDoc: string
    workDescriptionMin: string
    generatePermission: string
    abrNotGenerated: string
    abrEmptyStages: string
    riskNotGenerated: string
    riskEmpty: string
    pprPdfGemini: string
    pprWordOnly: string
    pprExtractFailed: string
  }
  helpPage: {
    brand: string
    title: string
    lead: string
    whatIsTitle: string
    whatIsBody: string
    rolesTitle: string
    roles: Array<{
      title: string
      badge?: string
      badgeKind?: 'role' | 'live'
      desc: string
    }>
    processTitle: string
    steps: Array<{ title: string; desc: string }>
    featuresTitle: string
    features: Array<{ icon: string; title: string; desc: string; live?: boolean }>
    workStopTitle: string
    workStop: Array<{ title: string; desc: string }>
    ctaTitle: string
    ctaSubtitle: string
    ctaButton: string
    supportEmail: string
    liveBadge: string
  }
}

const specialWorkRu: Record<SpecialWorkActivity, string> = {
  open_flame_fire: 'Огневые работы с открытым источником огня',
  radiographic: 'Радиографические работы',
  confined_space: 'Вход в замкнутый объем',
  electrical: 'Электрические работы',
  gas_hazard: 'Газоопасные работы',
  energy_isolation: 'Изоляция источников опасной энергии',
  work_at_height: 'Работа на высоте',
  lifting_operations: 'Грузоподъёмные работы',
  cold_works: 'Холодные работы',
}

const specialWorkEn: Record<SpecialWorkActivity, string> = {
  open_flame_fire: 'Open-flame hot work',
  radiographic: 'Radiographic work',
  confined_space: 'Confined space entry',
  electrical: 'Electrical work',
  gas_hazard: 'Gas-hazard work',
  energy_isolation: 'Energy isolation (LOTO)',
  work_at_height: 'Work at height',
  lifting_operations: 'Lifting operations',
  cold_works: 'Cold work',
}

export const uiExtRu: UiExtension = {
  branding: {
    tagline: 'Наряд-допуск',
    sourceDocument: 'Исходный документ',
    abr: 'Анализ Безопасности Работ',
    ndpr: 'НДПР',
    workPermitFallback: 'НДПР',
    certificatesTitle: 'Процедуры UOG-HSE',
    certificatesSubtitle:
      'Рабочий стол процедур · автопривязка к исходному документу по содержанию работ',
    certificatesGateHint: 'Сначала завершите шаг «{source}».',
    goToSource: 'Перейти к {source}',
    linkedProcedures: 'К текущему исходному документу привязано процедур: {count}.',
    attachedToCurrentSource: '✓ Прикреплено к текущему исходному документу',
    fileNotInApp: 'Файл не загружен в приложение',
    deployInstructions:
      'Положите файлы процедур (.docx) в папку public/certificates/ с именами UOG-HSE-PR-012.docx, UOG-HSE-PR-001.docx и т.д. После загрузки исходного документа система автоматически выбирает применимые процедуры.',
  },
  common: {
    save: 'Сохранить',
    saving: 'Сохранение…',
    cancel: 'Отмена',
    close: 'Закрыть',
    yes: 'Да',
    no: 'Нет',
    na: 'Н/П',
    view: 'Посмотреть',
    download: 'Скачать',
    upload: 'Загрузить',
    loading: 'Загрузка…',
    processing: 'Обработка…',
    send: 'Отправить',
    add: 'Добавить',
    remove: 'Удалить',
    regNo: 'Рег. №',
    document: 'Документ',
    format: 'Формат',
    role: 'Роль',
    demo: 'демо',
    permit: 'Наряд',
    permission: 'Разрешение',
    stage: 'Этап',
    forming: 'Формирование…',
    formingPdf: 'Формирование PDF…',
    uploadFile: 'Загрузка файла…',
    selectFile: 'Выбрать файл',
    dropFile: 'Переместите файл или нажмите, чтобы выбрать исходный документ',
    ai: 'ИИ',
    aiBusy: 'ИИ…',
    aiSections: 'ИИ: разделы 3–5',
    generate: 'Сформировать',
    generatePermission: 'Сформировать разрешение',
    notFound: 'Наряд-допуск не найден.',
    backToList: 'К списку',
    unavailable: 'Наряд-допуск недоступен для вашей учётной записи.',
    openingDraft: 'Открываю черновик для продолжения заполнения…',
    noWorkersAvailable: 'Нет свободных учётных записей для добавления.',
    enabled: 'включена',
    disabled: 'выключена',
    stagePrefix: 'Этап',
  },
  login: {
    subtitle: 'Вход по email и паролю',
    password: 'Пароль',
    signIn: 'Войти',
    signingIn: 'Вход…',
    offlineBanner: 'Нет сети. Первый вход — только онлайн.',
    wrongCredentials: 'Неверный email или пароль',
    tooManyAttempts: 'Слишком много попыток. Попробуйте позже',
    userNotFound: 'Пользователь не найден',
    failed: 'Не удалось войти',
  },
  confirm: {
    deletePermit: 'Удалить наряд «{label}» без возможности восстановления?',
    deleteAllPermits: 'Удалить все {count} нарядов из журнала без возможности восстановления?',
    closeEarly: 'Закрыть НДПР досрочно? После закрытия заполните раздел закрытия в разрешениях на особые работы.',
    annulNdpr: 'Аннулировать НДПР? Это формальное закрытие наряда в системе.',
  },
  alerts: {
    settingsFailed: 'Не удалось изменить настройку',
    invitesCleaned: 'Удалено уведомлений: {deleted} из {scanned}.',
    invitesCleanFailed: 'Не удалось очистить уведомления',
    renumberDone: 'Нумерация исправлена: {updated} наряд(ов) из {total}, уведомлений: {invites}.',
    renumberDoneLocal: 'Нумерация исправлена: {updated} наряд(ов) из {total}.',
    renumberFailed: 'Не удалось перенумеровать',
    deleteFailed: 'Не удалось удалить наряд',
    firebaseFunctionsUnavailable: 'Firebase Functions недоступны',
  },
  adminPanel: {
    titleInspector: 'Админка · {role}',
    workStopNotifications: 'Уведомления об остановке работ:',
    titleEgovSign: 'Админка · подпись eGov',
    currently: 'Сейчас:',
  },
  adminPage: {
    title: 'Админ-панель',
    subtitle: 'Пользователи, уведомления и настройки NOVA Safety',
    backJournal: 'Журнал НД',
    adminLabel: 'Администратор',
    activeBadge: 'Активен',
    exportExcel: 'Выгрузить в Excel',
    personnelTitle: 'Справочник пользователей',
    personnelHint: 'Учётные записи с ролями в системе наряд-допуска.',
    personnelEmpty: 'Пользователи не найдены в Firestore.',
    colName: 'ФИО',
    colPosition: 'Должность',
    colRole: 'Роль',
    colDepartment: 'Подразделение',
    colAction: 'Действие',
    defaultDepartment: 'ТОО «Урал Ойл энд Газ»',
    edit: 'Изменить',
    firebaseOnlyHint: 'Расширенные настройки доступны при входе через Firebase.',
    navLabel: 'Админ-панель',
  },
  godMode: {
    title: 'Админка · GOD MODE',
    descriptionIntro: 'По последнему наряду в журнале: автоподпись',
    descriptionWorkers: 'работников',
    descriptionAck: '(ознакомление) и',
    descriptionApprovers: 'трёх согласующих',
    descriptionApproversList: '(выдающий, допускающий, утверждающий).',
    descriptionExcluded: 'Производитель работ и роль ERT не подписываются.',
    latestPermit: 'Последний наряд:',
    noPermits: 'Нарядов пока нет.',
    signLatest: 'GOD MODE · подписать последний наряд',
    busy: 'GOD MODE…',
    confirm:
      'GOD MODE: подписать работников бригады и трёх согласующих (выдающий, допускающий, утверждающий) для наряда «{label}»?\n\nПроизводитель работ, ERT и инспектор ТБ не затрагиваются.',
    done: 'GOD MODE выполнен.\nРаботников: {crewSigned}\nСогласующих: {approversSigned}\nПропущено ERT: {skippedErt}',
    doneDemo: 'GOD MODE (демо).\nРаботников: {crewSigned}\nСогласующих: {approversSigned}',
    failed: 'GOD MODE не выполнен',
  },
  journalTable: {
    siteTopic: 'Объект / тема',
    regNo: 'Рег. номер',
    workTypes: 'Виды работ',
    zone: 'Зона',
    status: 'Статус',
    updated: 'Обновлён',
    admin: 'Админка',
  },
  permissionsBody: {
    aiFillingSections: '{app} заполняет разделы 3–5…',
    cardMeta: '{shortLabel} · раздел 3 — производитель · газотест ERT — только огневые',
    pdfReady: 'PDF сформирован',
    pdfPending: 'Требуется формирование PDF',
    footerHint:
      'Заполните форму и нажмите «Сформировать разрешение» для каждого вида работ. Раздел 3 заполняет производитель; газотест (раздел 2) — ПАС (ERT) только для огневых работ.',
  },
  pprPage: {
    backToChoice: '← Назад к выбору',
    retry: 'Повторить',
    proceduresLegend: 'Прикреплённые процедуры UOG-HSE',
    proceduresHint: 'Подобрано автоматически по содержанию исходного документа.',
    analyzing: '{app} анализирует документ… после завершения откроется форма НДПР.',
    clear: 'Очистить',
    workTitlePlaceholder: 'Наименование из шапки ППР',
    workTitleMissing: 'Не удалось определить автоматически — введите вручную.',
  },
  manualReviewForm: {
    abrTitle: '{abr} — редактирование вручную',
    abrHint:
      'Сверьте данные с PDF. Номера опасностей и средств защиты — через запятую (1–54).',
    workLocation: 'Место проведения работ',
    permitNo: 'Наряд-допуск №',
    date: 'Дата',
    shiftDay: 'День',
    shiftNight: 'Ночь',
    jobDescription: 'Описание задания',
    noStages: 'Нет этапов — нажмите «{generateAbr}» или добавьте этап вручную.',
    stageLegend: 'Этап {order}: {title}',
    stageTitle: 'Название этапа',
    hazardNumbers: 'Опасные факторы №',
    controlNumbers: 'Средства защиты №',
    removeStage: 'Удалить этап',
    briefingLegend: 'Инструктаж перед работами',
    briefingTopHazards: '1. Три основных фактора и меры',
    briefingStopScenarios: '2. Сценарии остановки работ',
    briefingMorMentors: '3. МОР и наставники',
    crewAbrLegend: 'Бригада — ознакомление с АБР',
    fullName: 'Ф.И.О.',
    badgeNo: '№ пропуска',
    approvalLegend: 'Участники согласования (4 роли из НДПР)',
    riskTitle: 'Оценка риска — редактирование вручную',
    riskHint:
      'Сверьте реестр опасностей с PDF. Исправьте формулировки, меры и ответственных при необходимости.',
    siteObject: 'Объект',
    assessmentDate: 'Дата оценки',
    contractorOrg: 'Подрядчик',
    preparedBy: 'Составил',
    noTasks: 'Нет заданий — добавьте хотя бы одно для оценки риска.',
    taskLegend: 'Задание {ordinal}',
    taskTitle: 'Название задания',
    hazardLegend: 'Опасность {ordinal}',
    operation: 'Операция',
    hazardThreat: 'Опасность / угроза',
    whoAtRisk: 'Кто под угрозой',
    controlMeasures: 'Меры контроля',
    responsible: 'Ответственный',
    removeTask: 'Удалить задание',
    removeHazard: 'Удалить опасность',
    likelihood: 'Вероятность',
    severity: 'Тяжесть',
    riskLevel: 'Уровень риска',
    crewNdprLegend: 'Бригада — состав из НДПР',
    signaturesLegend: 'Подписи и утверждение (4 роли из НДПР)',
  },
  admin: {
    inspectorScopeAll: 'все инспекторы на объекте',
    inspectorScopeZone: 'по зоне ответственности (поле inspectorSites в профиле)',
    enableZoneScope: 'Включить привязку по зоне',
    enableGlobalScope: 'Включить глобальный доступ инспектора',
    godModeNeedPermit: 'Нужен наряд в статусе «На согласовании»',
    fioVerifyLabel: 'Проверка ФИО при подписи eGov',
    disableFioVerify: 'Выключить проверку ФИО',
    enableFioVerify: 'Включить проверку ФИО',
  },
  access: {
    loginRequired: 'Войдите в систему.',
    submitDenied: 'Отправить пакет на согласование могут производитель работ, координатор, подрядчик или выдающий НД. Вы вошли как {role}.',
    executorNavLocked: 'Работникам доступен только журнал и подписание ознакомления по назначенным нарядам.',
    gateNdpr: 'Сначала заполните и сохраните «НДПР».',
    gateRisk: 'Сначала завершите шаг «Оценка риска».',
    gatePermissionsNotNeeded: 'Для текущих видов работ разрешения не требуются.',
    gatePermissions: 'Сначала завершите шаг «Оценка риска».',
    gateUnavailable: 'Раздел пока недоступен.',
  },
  crew: {
    label: 'Ознакомление с АБР и оценкой риска',
    confirmation: 'Я ознакомлен с АБР и оценкой рисков',
    blockedDefault: 'Ознакомление ставит работник из состава бригады после подписи производителя.',
    notOnApproval: 'Ознакомление доступно на этапе согласования наряда.',
    needProducer: 'Сначала производитель работ подписывает НДПР (шаг 1).',
    demoSuffix: 'демо',
    documentAbrRisk: 'АБР + оценка риска',
    inviteApproval: 'Согласование НДПР',
  },
  abrDailyAck: {
    title: 'Ежедневное ознакомление с АБР',
    description:
      'АБР подписывают только работники бригады: каждый день им приходит задание подписать ознакомление через eGov Mobile. Подпись действительна 24 часа; по истечении суток требуется повторная подпись. В отчёте фиксируются ФИО, должность и подпись.',
    confirmation: 'Я ознакомлен(а) с АБР на текущую смену',
    todayPrefix: 'Сейчас',
    noSignaturesYet: 'пока нет действующих подписей',
    signedProgress: '{signed} из {total} · ожидают {pending}',
    notSignedToday: 'нет действующей подписи (не подписал или прошло более 24 ч)',
    reportTitle: 'Журнал ежедневных подписей',
    colDate: 'Дата',
    colName: 'Ф.И.О.',
    colRole: 'Должность',
    colSignature: 'Подпись',
    pendingTitle: 'Требуется ежедневное ознакомление с АБР',
    pendingHint:
      'Каждый день работникам бригады приходит задание подписать ознакомление с АБР. Подпись действует 24 часа, затем нужна повторная подпись.',
    openPermit: 'Открыть наряд',
  },
  egovRoles: {
    performer: 'Начальник участка (составитель)',
    permitter: 'Допускающий',
    issuer: 'Выдающий НД',
    leadExpert: 'Утверждающий НД',
    ert: 'ПАС (Пожарно-аварийная служба)',
  },
  specialWork: specialWorkRu,
  workPermissionKinds: {
    confined_space: 'Разрешение на вход в замкнутое пространство',
    open_flame_fire: 'Разрешение на проведение огневых работ',
    gas_hazard: 'Разрешение на газоопасные работы',
  },
  modals: {
    signCancelled: 'Подписание отменено в eGov Mobile.',
    pdfPackageFailed: 'Не удалось сформировать PDF-пакет',
    signServerUnavailable: 'Сервер подписи недоступен. Проверка ФИО невозможна — подпись не сохранена.',
    signServerUnavailableAck: 'Сервер подписи недоступен. Проверка ФИО невозможна — ознакомление не сохранено.',
    verifyingEsighAndFio: 'Проверка ЭЦП и ФИО на сервере…',
    verifyingEsigh: 'Проверка ЭЦП на сервере…',
    closeAria: 'Закрыть',
    regNoField: 'Рег. №',
    roleField: 'Роль',
    formatField: 'Формат',
    wpTitle: 'НДПР №',
  },
  workStop: {
    panelTitle: 'Требует решения — остановка работ',
    modalTitle: 'Приостановить работу',
    reasonPlaceholder: 'Например: обнаружена утечка, работы без СИЗ, неисправность оборудования…',
    photoReplace: 'Заменить фото',
    photoCapture: 'Сфотографировать или загрузить',
    photoAlt: 'Фото к приостановке работ',
    submit: 'Приостановить работу',
    submitting: 'Отправка…',
    resolvePlaceholder: 'Обоснуйте решение: почему возвращаете в работу или аннулируете наряд…',
    liftStop: 'Снять остановку',
    annulConfirm: 'Аннулировать НДПР? Это формальное закрытие наряда в системе.',
    lifted: 'Остановка снята',
    annulled: 'Наряд аннулирован',
    closeNotice: 'Закрыть уведомление',
    closeNoticeAria: 'Закрыть уведомление',
  },
  workPermission: {
    updatingPdf: 'Обновление PDF разрешений…',
    savedClosure: 'Сохранено · раздел закрытия в PDF обновлён',
    saveClosure: 'Сохранить закрытие в PDF',
    updatingPermPdf: 'Обновление PDF разрешения…',
    savedPermPdf: 'Сохранено · PDF обновлён — можно открыть разрешение',
    permPdf: 'PDF разрешения',
    saveGasTest: 'Сохранить газотест',
    clarification: 'Уточнение',
    workLabel: 'Наименование / объём работ',
    workLabelCs: 'Наименование работ (вход в ЗП)',
    equipLabel: 'Инструменты и оборудование',
    section1Title: 'Заявка на проведение работ',
    section1Hint: 'Заполняется производителем работ',
    sitePlaceholder: 'Наименование объекта',
    regPlaceholder: 'Рег. номер НДПР',
    permNoPlaceholder: 'Номер в шапке разрешения',
    workPlaceholder: 'Наименование работ без подробного описания…',
    workPlaceholderCs: 'Краткое наименование работ…',
    equipPlaceholder: 'Инструменты, оборудование, документация…',
    csTypeTitle: 'Тип замкнутого пространства',
    csTypeHint: 'Обозначьте входы и выходы',
    observerPlaceholder: 'Фамилия И.О. наблюдателя',
    checksFire: 'Проверки на рабочей площадке',
    checksWorkplace: 'Проверки на рабочем месте',
    checksHint: 'Отметьте наличие требуемых мер',
    extraTitle: 'Дополнительно',
    extraHint: 'Текст попадёт в PDF разрешения',
    extraPlaceholder: 'Заполняется вручную или через ИИ…',
    retestPlaceholder: 'Например: каждые 2 часа',
    gasZonePlaceholder: 'Рабочая зона',
  },
  gasTest: {
    onApprovalHint: 'Наряд на согласовании. Таблицу газотеста можно заполнить сейчас — результаты сохранятся в PDF разрешений.',
    draftHint: 'Наряд в черновике. Газотест доступен после отправки на согласование и выдачи наряда.',
    closedHint: 'Наряд завершён ({status}). Редактирование газотеста недоступно.',
    rejectedHint: 'Наряд отклонён. Дождитесь повторной выдачи после исправлений.',
    editHint: 'Редактирование доступно для наряда на согласовании, выданного, выполняемого или приостановленного (сейчас: {status}).',
    noPermissions: 'Разрешения на особые работы ещё не сформированы — дождитесь PDF от производителя работ.',
    fillTable: 'Заполните таблицу газотеста (раздел 2 в PDF): нажмите «+ Добавить», укажите LEL, H2S, O₂, CO и № прибора. Осталось разрешений без замеров: {empty}.',
    tableFilled: 'Таблица газотеста заполнена. При необходимости добавьте повторный замер кнопкой «+ Добавить».',
    panelTitle: '2. Результаты отбора проб воздушной среды',
    panelHint:
      'Заполните таблицу газотеста (раздел 2 в PDF разрешения). После сохранения данные попадут в PDF и пакет согласования.',
    stepFill: 'Нажмите «+ Добавить», укажите дату оформления, рабочую зону, LEL, H₂S, O₂, CO и № прибора.',
    stepSave: 'Нажмите «Сохранить газотест» — PDF разрешения обновится автоматически.',
    stepPdf: 'Откройте PDF разрешения и проверьте таблицу в разделе 2.',
    savedConfirm: 'Раздел 2 сохранён. Таблица газотеста заполнена.',
    editAgain: 'Изменить газотест',
    filledBadge: 'Заполнено',
    summaryTitle: '2. Разрешения — газотест',
    openSection: 'Открыть газотест',
    addRow: '+ Добавить',
    emptyTable: 'Таблица пустая. Нажмите «+ Добавить» и укажите результаты замера.',
    colDateIssued: 'Дата оформления',
    colWorkZone: 'Рабочая зона',
    colInstrument: 'Рег. №',
    colWorker: 'Работник',
    colDate: 'Дата',
    colTime: 'Время',
    colLel: 'НПВ / LEL %',
    colH2s: 'H2S, ppm',
    colO2: 'O2, %',
    colCo: 'CO, ppm',
    colTester: 'Ф.И.О. проводившего',
    updatedLabel: 'Обновлён',
    ertFillsNote: ' · заполняет ПАС (ERT)',
  },
  preWorkCheck: {
    panelTitle: 'Проверки, выполняемые на рабочем месте',
    panelTitleFire: 'Проверки, выполняемые на рабочей площадке',
    panelHint: 'Отметьте пункты в колонке «Имеется»',
    stepFill: 'Отметьте пункты в колонке «Имеется».',
    stepSave: 'Нажмите «Сохранить проверки» — PDF разрешения обновится автоматически.',
    stepPdf: 'Откройте PDF разрешения для проверки.',
    needsFill: 'Требуется заполнение',
    saveChecks: 'Сохранить проверки',
    onApprovalHint:
      'Наряд на согласовании. Раздел 3 можно заполнить сейчас — данные сохранятся в PDF разрешений.',
    draftHint: 'Наряд в черновике. Проверки доступны после отправки на согласование.',
    closedHint: 'Наряд завершён ({status}). Редактирование проверок недоступно.',
    rejectedHint: 'Наряд отклонён. Дождитесь повторной выдачи после исправлений.',
    editHint:
      'Редактирование доступно для наряда на согласовании, выданного, выполняемого или приостановленного (сейчас: {status}).',
    noPermissions: 'Разрешения на особые работы ещё не сформированы.',
    fillChecks:
      'Заполните раздел 3 (проверки на рабочем месте) в разрешениях. Осталось без проверок: {empty}.',
    checksFilled: 'Раздел 3 заполнен.',
    tasksTitle: 'Задание: проверки на рабочем месте (допускающий)',
    tasksHint: 'Наряды с незаполненным разделом 3 в разрешениях — отметьте колонку «Имеется» и сохраните в PDF.',
    openChecks: 'Открыть проверки',
    savedConfirm: 'Раздел 3 сохранён. Проверки на рабочем месте заполнены.',
    editAgain: 'Изменить проверки',
  },
  closure: {
    closeBusy: 'Закрытие…',
    closeButton: 'Закрыть НДПР (работы завершены)',
  },
  docKit: {
    ndpr: 'НДПР',
    abr: 'АБР',
    risk: 'Оценка риска',
    viewPdf: 'Посмотреть PDF: {label}',
    fillGasTest: 'Заполнить газотест: {label}',
    fullPackage: 'Посмотреть полный пакет PDF',
    ertPanelTitle: 'Газотест и документы наряда',
    approvalPackage: 'PDF-пакет для согласования',
  },
  riskPage: {
    uploadSourceFirst: 'Сначала загрузите {source} и дождитесь извлечения данных.',
    riskReady: 'Оценка риска готова ({app}): {groups} заданий, {hazards} опасностей. Нажмите «Посмотреть».',
    generateAbrFirst: 'Сформируйте {abr} из исходного документа.',
    generateRiskFirst: 'Сформируйте оценку риска из исходного документа.',
    riskAssessmentTitle: 'Оценка рисков',
    saveForErt: 'Сохранение наряда для ERT и разрешений…',
    uploadSource: 'Сначала загрузите {source}.',
    confirmManualReview: 'Подтвердите ручную проверку {abr} и оценки риска перед отправкой.',
    saveToDb: 'Сохранение наряда в базе…',
    buildPdfPackage: 'Формирование PDF-пакета для согласования…',
    submitApproval: 'Отправка на согласование…',
    provisionSigners: 'Назначение подписантов и уведомления…',
    submittedNoInvitesFunctions: 'НДПР отправлен, но уведомления подписантам не созданы (Firebase Functions недоступны).',
    submittedNoInvites: 'НДПР отправлен, но уведомления подписантам не созданы.',
    submittedNoInvitesError: 'НДПР отправлен, но уведомления не созданы: {error}',
    generateAbr: 'Сформировать через {app}',
    generateRisk: 'Сформировать через {app}',
    viewRisk: 'Посмотреть оценку риска',
    submitRequirementsAria: 'Условия отправки на согласование',
    waitAnalysis: 'Дождитесь анализа или нажмите «Далее — НДПР».',
    tabManualFill: 'Заполнить вручную',
    tabGenerate: 'Сформировать через NOVA Safety',
  },
  ndprPage: {
    duplicateWorker: 'Один и тот же работник не может быть указан в двух строках.',
    fillNdprFirst: 'Сначала заполните и сохраните НДПР',
    manualFillHint: 'Заполните обязательные поля вручную перед созданием наряда.',
    autoFillHint: 'Подставлены автоматически — при необходимости измените перед созданием наряда.',
    regAssigned: 'Рег. номер наряда: {reg}.',
    regAuto: 'Рег. номер наряда (001, 002…) назначится автоматически при отправке.',
  },
  permissionsPage: {
    formingKind: 'Формирование: {kind}…',
    pdfFailed: 'Не удалось сформировать PDF разрешения',
    prepPackage: 'Подготовка пакета…',
    submitApproval: 'Отправка на согласование…',
  },
  detailPage: {
    notFound: 'Наряд-допуск не найден.',
    backToList: 'К списку',
    unavailable: 'Наряд-допуск недоступен для вашей учётной записи.',
    openingDraft: 'Открываю черновик для продолжения заполнения…',
    deleteConfirm: 'Удалить наряд «{label}» без возможности восстановления?',
    closeEarlyConfirm: 'Закрыть НДПР досрочно? После закрытия заполните раздел закрытия в разрешениях на особые работы.',
    ertDocsTitle: 'Газотест и документы наряда',
    viewFullPdf: 'Посмотреть полный пакет PDF',
    pprName: 'Наименование',
    pprSite: 'Объект',
    pprPeriod: 'Срок',
    pprPreparedBy: 'Составил',
    pprTasksCount: 'Заданий в форме',
    viewSource: 'Посмотреть {source}',
    noSourceFile: 'Файл исходного документа не приложен — только поля формы.',
    riskFile: 'Оценка риска',
    blocks: 'блок(ов)',
    downloadPdf: 'Скачать PDF',
    downloadMd: 'Скачать .md',
    asorSaved: 'Данные шага «Мероприятия ОТ/ТБ/ООС» сохранены вместе с нарядом-допуском.',
    creationDate: 'Дата оформления',
    duration: 'Продолжительность',
    tentativeNd: 'Предполож. № НД',
    workPlaces: 'Места работ',
    matrixCell: 'Матрица (вероятность×тяжесть)',
    tasksCount: 'Задания (количество блоков)',
  },
  pprUpload: {
    dropHint: 'Переместите файл или нажмите, чтобы выбрать исходный документ',
    dropHere: 'Переместите файл сюда',
    release: 'Отпустите файл',
    selectFile: 'Выбрать файл',
    uploading: 'Загрузка файла…',
    description:
      'Загрузите исходный документ (Method Statement, .docx / .pdf). Файл сохраняется в пакете наряда вместе с формой.',
    uploadedMeta: '{size} · загружен {date}',
    replaceDropHint: 'Переместите другой файл сюда, чтобы заменить',
    replace: 'Заменить',
    fileTypesHint: '.doc, .docx или .pdf · до 15 МБ',
  },
  manualReview: {
    addTask: 'Добавить задание',
    addHazard: 'Добавить опасность',
    addStage: 'Добавить этап',
    worker: 'Работник',
    performer: 'Производитель работ',
    permitter: 'Допускающий',
    issuer: 'Выдающий НД',
    leadExpert: 'Утверждающий НД',
  },
  ai: {
    requestFailed: 'Запрос не выполнен.',
    openChat: 'Открыть чат ИИ',
    closeChat: 'Закрыть чат ИИ',
    collapse: 'Свернуть',
    you: 'Вы',
    reply: 'Ответ',
    message: 'Сообщение',
  },
  photo: {
    capture: 'Сфотографировать',
    processing: 'Обработка…',
    siteAlt: 'Фото участка',
    captionPlaceholder: 'Участок, оборудование…',
  },
  rejection: {
    reasonFallback: 'Причина не указана.',
    closeAria: 'Закрыть уведомление об отклонении',
    closeTitle: 'Закрыть уведомление',
  },
  transitions: {
    invalid: 'Недопустимый переход статуса',
    needPerformer: 'Нельзя выдать НД без ЭЦП производителя работ (составителя пакета)',
    needCrewAck: 'Нельзя выдать НД без ознакомления всех работников бригады с АБР и оценкой риска',
    needPermitterIssuer: 'Нельзя выдать НД без ЭЦП допускающего и выдающего (eGov Mobile / SIGEX)',
    needLeadExpert: 'Нельзя выдать НД без ЭЦП утверждающего',
    needF09: 'Заполните проверочный лист F09 (НДПР): все пункты Да/Нет/Н/П',
  },
  notices: {
    issuedMessage: 'НДПР {label} выдан и открыт для выполнения работ. Все участники могут приступать к работам по регламенту.',
    closureMessage: 'Производитель работ сохранил раздел закрытия разрешений в PDF по НДПР {label}. Проверьте актуальный пакет документов.',
    crewChangedMessage: 'Обновлён список работников по НДПР {label}. Проверьте состав бригады и ежедневное ознакомление с АБР.',
    performerReplacedMessage: 'Назначен новый производитель работ по НДПР {label}. Проверьте ответственность и подписи.',
    ndprExtendedMessage: 'Срок действия НДПР {label} продлён. Проверьте актуальные даты в пакете документов.',
    infoMessage: 'Обновление по НДПР {label}.',
    infoTitle: 'Уведомление по НДПР',
  },
  tools: {
    selectItem: 'Выбрать: {item}',
    newItem: 'новый пункт',
    namePlaceholder: 'Наименование инструмента или оборудования',
    removeItem: 'Удалить пункт',
  },
  stages: {
    stageN: 'Этап {n}',
  },
  ndprForm: {
    sourceDataLegend: 'Данные из исходного документа',
    organization: 'Организация',
    siteLocation: 'Объект / локация',
    zoneClassification: 'Классификация зоны',
    workTitle: 'Наименование работ',
    performerBadgeHint: ' № бейджа производителя: {badge}.',
    workStages: 'Этапы работ',
    workStagesPlaceholder:
      '1. Сброс давления газа\nОписание этапа: операции, объём, оборудование…\n\n2. Подготовительные работы\nОписание этапа…',
    participantsLegend: 'Участники согласования',
    participantsHint:
      'Назначаются автоматически — можно выбрать другого пользователя. У каждой роли свой вход для подписи ЭЦП.',
    signer1Performer: '1. Производитель работ',
    signer2Permitter: '2. Допускающий',
    signer3Issuer: '3. Выдающий НД',
    signer4LeadExpert: '4. Утверждающий НД',
    signer5Ert: '5. ERT (ПАС)',
    ertApproverNote:
      'При разрешении на огневые работы в согласование автоматически добавляется ПАС с газотестом (раздел 2 PDF).',
    selectPlaceholder: '— Выберите —',
    f02Legend: 'Бланк НД — общие поля (F02)',
    badgeNo: '№ пропуска / бейджа',
    shift: 'Смена',
    shiftDay: 'День',
    shiftNight: 'Ночь',
    startDateTime: 'Дата и время начала',
    endDateTime: 'Дата и время окончания',
    workersLegend: 'Работники',
    workersHint:
      'Строки F03 — укажите минимум {min} работников из справочника (ФИО попадут в АБР, оценку риска и НДПР): {names}.',
    workersProducerHint: 'Выберите работников из списка (минимум {min}).',
    addWorker: '+ Добавить работника',
    workersEmptyHint:
      'Нажмите «+ Добавить работника», чтобы указать состав бригады (минимум {min}).',
    fromUserList: 'Из списка пользователей',
    date: 'Дата',
    removeWorker: 'Удалить работника',
    createButton: 'Создать НДПР',
  },
  workActivities: {
    title: 'Виды работ',
    selectedCount: '{count} выбрано',
    permissionsRequired: 'Требуются разрешения',
    hint: '{app} определит виды по исходному документу. Двойной щелчок по строке снимает галочку.',
    fireNote: 'Разрешения на огневые работы',
  },
  riskForm: {
    clearForm: 'Очистить анкету',
    abrDescription:
      '{app} составляет {abr} по исходному документу — как в корпоративном бланке (этапы, номера опасностей и средств защиты, инструктаж, утверждение).',
    abrGenerating: '{app} составляет анализ безопасности работ…',
    abrDocSummary: 'В документе: {stages} этап(ов) · объект: {location}',
    abrGenNote: '{abr} ({app}): {count}. {viewAction}.',
    riskDescription:
      '{app} формирует оценку риска по исходному документу: реестр опасностей, СИЗ, план реагирования, подписи — как в образце GRE U12.',
    riskGenerating: '{app} формирует оценку риска…',
    riskDocSummary: 'В документе: {tasks} заданий, {hazards} опасностей.',
    preSubmitTitle: 'Проверка перед отправкой',
    preSubmitHint:
      'Сформируйте документы, откройте каждый для проверки и сверьте с полями ниже. При необходимости исправьте данные вручную и снова посмотрите.',
    sourceNotUploaded: 'файл не загружен',
    abrReady: 'готов · {stages} этап(ов)',
    abrNotReady: 'не сформирован',
    riskReady: 'готова · {tasks} заданий, {hazards} опасностей',
    riskNotReady: 'не сформирована',
    manualReviewConfirm:
      'Я проверил {abr} и {risk} вручную, просмотрел документы и сверил данные',
    submitConditionsTitle: 'Условия отправки',
    generateBothHint:
      'Сформируйте {abr} и {risk}, затем отметьте подтверждение проверки.',
    submitConditionsHint:
      'Выполните все пункты в списке «Условия отправки» — кнопка станет активной.',
    confirmReviewHint: 'Отметьте подтверждение проверки, чтобы отправить пакет.',
    packageSubmitting: '{app} отправляет пакет…',
    pdfDeferredHint:
      'Документ формируется при скачивании на карточке наряда — это ускоряет отправку.',
  },
  detailForm: {
    versionLabel: 'Версия {version}',
    ertGasTestHeader: 'ПАС (ERT): газотест',
    asorFormTitle: 'Форма {title} ({formRef}, изд. {edition})',
    asorMissingHint:
      'К этому наряду не приложены «Мероприятия по ОТ, ТБ и ООС». Оформите пакет: {source} → {ndpr} → ОТ/ТБ/ООС.',
    requisitesTitle: 'Реквизиты',
    organization: 'Организация',
    siteLocation: 'Объект / локация',
    registrationNo: 'Регистрационный номер',
    workTypes: 'Виды работ',
    zoneClassification: 'Классификация зоны',
    workDescription: 'Описание работ',
    toolsAndEquipment: 'Инструменты и оборудование',
    signer1Performer: '1. Начальник участка',
    signer2Permitter: '2. Допускающий',
    signer3Issuer: '3. Выдающий НД',
    signer4LeadExpert: '4. Утверждающий НД',
    f04Title: 'F04',
    routeSheetNo: '№ маршрутной карты',
    workArea: 'Зона',
    specialConditions: 'Особые условия',
    matrixTitle: 'Матрица (кат. {category})',
    matrixDocuments: 'Документы: {documents}',
    matrixInteraction: 'Меры взаимодействия: {measures}',
    matrixDefaultValidity: 'Базовый срок: {days} дн.',
    f02Legend: 'Бланк НД — общие поля (F02)',
    badgeNo: '№ пропуска / бейджа',
    shift: 'Смена',
    shiftDay: 'День',
    shiftNight: 'Ночь',
    startDateTime: 'Дата и время начала',
    endDateTime: 'Дата и время окончания',
    workersTitle: 'Работники',
    workersHint:
      'Выбор только из справочника пользователей (Firebase / демо). Процедуры будут подключаться отдельно.',
    addWorker: '+ Добавить работника',
    noWorkers: 'Нет работников.',
    directoryNameCol: 'Справочник (имя)',
    dateCol: 'Дата',
    selectPlaceholder: '— Выберите —',
    f09Title: 'Проверочный лист F09 (НДПР)',
    f09Hint:
      'Перед переводом в «В работе» все пункты должны иметь ответ Да / Нет / Н/П.',
    f05Title: 'Журнал F05 (события)',
    f05Empty: 'Записей пока нет.',
    demoSuffix: '({demo})',
  },
  validation: {
    generatePermissions: 'Сформируйте разрешения для выбранных видов работ.',
    missingDoc: 'Отсутствует документ: {kind}',
    workDescriptionMin: '{kind}: укажите описание работ (мин. 3 символа).',
    generatePermission: '{kind}: нажмите «Сформировать разрешение».',
    abrNotGenerated: 'Сформируйте «{abr}» из исходного документа перед отправкой.',
    abrEmptyStages:
      'Сформируйте «{abr}» из исходного документа — этапы без опасностей и мер защиты.',
    riskNotGenerated: 'Сформируйте «{risk}» из исходного документа перед отправкой.',
    riskEmpty: 'Сформируйте «{risk}» из исходного документа — реестр опасностей пуст.',
    pprPdfGemini:
      'Текст из PDF извлекается через Claude Haiku при загрузке файла на шаге «{source}».',
    pprWordOnly:
      'Поддерживаются только документы Word (.doc, .docx) для извлечения мер контроля.',
    pprExtractFailed: 'Не удалось извлечь текст из документа — файл пуст или повреждён.',
  },
  helpPage: {
    brand: 'NOVA Safety',
    title: 'Справка и поддержка',
    lead: 'Всё о работе с платформой управления нарядами-допусками',
    whatIsTitle: 'Что такое NOVA Safety?',
    whatIsBody:
      'Цифровая платформа управления нарядами-допусками (НДПР) на промышленных объектах. Система автоматизирует полный цикл — от заполнения и оценки риска до согласования и закрытия — и объединяет все роли в одном приложении.',
    rolesTitle: 'Роли в системе',
    roles: [
      {
        title: 'Производитель работ',
        badge: 'Согласовант',
        badgeKind: 'role',
        desc: 'Заполняет наряд-допуск, проводит оценку риска и АБР, ставит первую согласующую подпись.',
      },
      {
        title: 'Рабочий персонал',
        desc: 'Слесарь, электромонтёр, сварщик, аппаратчик, машинист крана, газорезчик, оператор. Знакомятся с нарядом и подтверждают ознакомление.',
      },
      {
        title: 'Инспектор ОТ, ТБ и ООС',
        desc: 'Контролирует охрану труда. Может приостанавливать, восстанавливать или аннулировать наряд.',
      },
      {
        title: 'Пожарная аварийная служба',
        desc: 'Пожарная безопасность и аварийное реагирование. Газотестировщик проводит Live-замеры среды.',
      },
      {
        title: 'Выдающий НДПР',
        badge: 'Согласовант',
        badgeKind: 'role',
        desc: 'Оформляет и выдаёт наряд-допуск после ознакомления всей бригады.',
      },
      {
        title: 'Допускающий НДПР',
        badge: 'Согласовант',
        badgeKind: 'role',
        desc: 'Проверяет готовность рабочего места и допускает бригаду к работе.',
      },
      {
        title: 'Утверждающий НДПР',
        badge: 'Согласовант',
        badgeKind: 'role',
        desc: 'Финально согласовывает и утверждает наряд после всех этапов.',
      },
    ],
    processTitle: 'Как работает процесс',
    steps: [
      {
        title: 'Заполнение наряда',
        desc: 'Производитель работ заполняет НДПР вручную или с помощью ИИ-ассистента.',
      },
      {
        title: 'АБР и оценка риска',
        desc: 'Система переводит наряд в раздел анализа безопасности. Производитель подтверждает данные и ставит первую подпись.',
      },
      {
        title: 'Специальные разрешения',
        desc: 'Для газоопасных, огневых и замкнутых работ формируется отдельное разрешение; газотест ERT — только при огневых.',
      },
      {
        title: 'Ознакомление бригады',
        desc: 'Все работники знакомятся с документами и подтверждают ознакомление. Без этого шага согласованты не могут подписать наряд.',
      },
      {
        title: 'Последовательное согласование',
        desc: 'Выдающий, допускающий и утверждающий подписывают наряд в установленном порядке. Допускающий перед подписью проводит Live-инспекцию: проверяет участки проведения работ согласно выданным разрешениям — результаты автоматически фиксируются в карточке НДПР и становятся видны всем участникам.',
      },
      {
        title: 'Выполнение и закрытие',
        desc: 'По завершении производитель закрывает наряд. Все участники получают уведомление автоматически.',
      },
    ],
    featuresTitle: 'Ключевые возможности',
    features: [
      {
        icon: '🤖',
        title: 'ИИ-ассистент на базе Claude',
        desc: 'Анализирует приложенные схемы, документы и фотоматериалы. Помогает проверить полноту наряда до подписания.',
      },
      {
        icon: '🔐',
        title: 'Проверка ЭЦП',
        desc: 'Верификация электронной цифровой подписи по ИИН и ФИО через административную панель.',
      },
      {
        icon: '🔔',
        title: 'Автоматические уведомления',
        desc: 'Оповещения при изменении статуса, запросе газтеста, остановке и закрытии работ.',
      },
      {
        icon: '🔬',
        title: 'Live-газтест',
        live: true,
        desc: 'Газотестировщик вносит результаты замеров воздушной среды прямо на месте — данные автоматически подгружаются в карточку НДПР и мгновенно становятся видны всем участникам наряда в режиме реального времени.',
      },
      {
        icon: '👁️',
        title: 'Live-инспекция Допускающим',
        live: true,
        desc: 'Допускающий проводит инспекцию участков проведения работ согласно выданным разрешениям — результаты автоматически подгружаются в карточку НДПР и мгновенно становятся видны всем участникам наряда.',
      },
    ],
    workStopTitle: 'Остановка и закрытие работ',
    workStop: [
      {
        title: 'Остановка работ',
        desc: 'Любой пользователь с учётной записью может приостановить работы, указав причину. Инженер по ОТ, ТБ и ООС получает уведомление и решает: восстановить наряд или аннулировать его.',
      },
      {
        title: 'Досрочное закрытие',
        desc: 'Производитель работ может закрыть НДПР досрочно, если работы завершены раньше срока. Все участники получат уведомление автоматически.',
      },
    ],
    ctaTitle: 'Остались вопросы?',
    ctaSubtitle: 'Команда NOVA Safety готова помочь с любыми вопросами по платформе',
    ctaButton: 'Написать в поддержку',
    supportEmail: 'support@nova-safety.kz',
    liveBadge: 'Авто-обновление',
  },
}

// Fix typo in modals - I used signServerUnavailableAck but didn't define in type
// Let me fix - add signServerUnavailableAck to type

export const uiExtEn: UiExtension = {
  branding: {
    tagline: 'Permit to work',
    sourceDocument: 'Source document',
    abr: 'Job Safety Analysis',
    ndpr: 'Work permit',
    workPermitFallback: 'Work permit',
    certificatesTitle: 'UOG-HSE procedures',
    certificatesSubtitle:
      'Procedures workspace · auto-linked to source document by work content',
    certificatesGateHint: 'Complete «{source}» first.',
    goToSource: 'Go to {source}',
    linkedProcedures: 'Procedures linked to current source document: {count}.',
    attachedToCurrentSource: '✓ Attached to current source document',
    fileNotInApp: 'File not uploaded to the app',
    deployInstructions:
      'Place procedure files (.docx) in public/certificates/ named UOG-HSE-PR-012.docx, UOG-HSE-PR-001.docx, etc. After uploading the source document, applicable procedures are selected automatically.',
  },
  common: {
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    na: 'N/A',
    view: 'View',
    download: 'Download',
    upload: 'Upload',
    loading: 'Loading…',
    processing: 'Processing…',
    send: 'Send',
    add: 'Add',
    remove: 'Remove',
    regNo: 'Reg. No.',
    document: 'Document',
    format: 'Format',
    role: 'Role',
    demo: 'demo',
    permit: 'Permit',
    permission: 'Permission',
    stage: 'Stage',
    forming: 'Generating…',
    formingPdf: 'Generating PDF…',
    uploadFile: 'Uploading file…',
    selectFile: 'Choose file',
    dropFile: 'Drop a file here or click to choose the source document',
    ai: 'AI',
    aiBusy: 'AI…',
    aiSections: 'AI: sections 3–5',
    generate: 'Generate',
    generatePermission: 'Generate permission',
    notFound: 'Work permit not found.',
    backToList: 'Back to list',
    unavailable: 'This work permit is not available for your account.',
    openingDraft: 'Opening draft to continue…',
    noWorkersAvailable: 'No available worker accounts to add.',
    enabled: 'enabled',
    disabled: 'disabled',
    stagePrefix: 'Stage',
  },
  login: {
    subtitle: 'Sign in with email and password',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    offlineBanner: 'No network. First sign-in requires internet.',
    wrongCredentials: 'Invalid email or password',
    tooManyAttempts: 'Too many attempts. Try again later',
    userNotFound: 'User not found',
    failed: 'Sign-in failed',
  },
  confirm: {
    deletePermit: 'Delete permit «{label}» permanently?',
    deleteAllPermits: 'Delete all {count} permits from the journal permanently?',
    closeEarly: 'Close work permit early? After closing, fill the closure section in special work permissions.',
    annulNdpr: 'Annul work permit? This formally closes the permit in the system.',
  },
  alerts: {
    settingsFailed: 'Could not update setting',
    invitesCleaned: 'Removed notifications: {deleted} of {scanned}.',
    invitesCleanFailed: 'Could not clear notifications',
    renumberDone: 'Numbering fixed: {updated} permit(s) of {total}, notifications: {invites}.',
    renumberDoneLocal: 'Numbering fixed: {updated} permit(s) of {total}.',
    renumberFailed: 'Could not renumber',
    deleteFailed: 'Could not delete permit',
    firebaseFunctionsUnavailable: 'Firebase Functions unavailable',
  },
  adminPanel: {
    titleInspector: 'Admin · {role}',
    workStopNotifications: 'Work stop notifications:',
    titleEgovSign: 'Admin · eGov signing',
    currently: 'Currently:',
  },
  adminPage: {
    title: 'Admin panel',
    subtitle: 'Users, notifications and NOVA Safety settings',
    backJournal: 'PTW journal',
    adminLabel: 'Administrator',
    activeBadge: 'Active',
    exportExcel: 'Export to Excel',
    personnelTitle: 'User directory',
    personnelHint: 'Accounts and roles in the permit-to-work system.',
    personnelEmpty: 'No users found in Firestore.',
    colName: 'Name',
    colPosition: 'Position',
    colRole: 'Role',
    colDepartment: 'Department',
    colAction: 'Action',
    defaultDepartment: 'Ural Oil & Gas LLP',
    edit: 'Edit',
    firebaseOnlyHint: 'Advanced settings are available with Firebase sign-in.',
    navLabel: 'Admin panel',
  },
  godMode: {
    title: 'Admin · GOD MODE',
    descriptionIntro: 'For the latest journal permit: auto-sign',
    descriptionWorkers: 'workers',
    descriptionAck: '(acknowledgment) and',
    descriptionApprovers: 'three approvers',
    descriptionApproversList: '(issuer, area authority, lead expert).',
    descriptionExcluded: 'Work supervisor and ERT role are not signed.',
    latestPermit: 'Latest permit:',
    noPermits: 'No permits yet.',
    signLatest: 'GOD MODE · sign latest permit',
    busy: 'GOD MODE…',
    confirm:
      'GOD MODE: sign crew workers and three approvers (issuer, area authority, lead expert) for permit «{label}»?\n\nWork supervisor, ERT and safety inspector are not affected.',
    done: 'GOD MODE complete.\nWorkers: {crewSigned}\nApprovers: {approversSigned}\nERT skipped: {skippedErt}',
    doneDemo: 'GOD MODE (demo).\nWorkers: {crewSigned}\nApprovers: {approversSigned}',
    failed: 'GOD MODE failed',
  },
  journalTable: {
    siteTopic: 'Site / topic',
    regNo: 'Reg. number',
    workTypes: 'Work types',
    zone: 'Zone',
    status: 'Status',
    updated: 'Updated',
    admin: 'Admin',
  },
  permissionsBody: {
    aiFillingSections: '{app} filling sections 3–5…',
    cardMeta: '{shortLabel} · sections 1–3 filled here · gas test by ERT after issuance',
    pdfReady: 'PDF generated',
    pdfPending: 'PDF generation required',
    footerHint:
      'Complete the form and click «Generate permission» for each work type. PAS (ERT) enters gas tests on the permit card (after «Risk assessment») — data goes directly into permission PDFs and the full package.',
  },
  pprPage: {
    backToChoice: '← Back to choice',
    retry: 'Retry',
    proceduresLegend: 'Attached UOG-HSE procedures',
    proceduresHint: 'Selected automatically from source document content.',
    analyzing: '{app} analyzing document… WP form opens when complete.',
    clear: 'Clear',
    workTitlePlaceholder: 'Work title from PPR header',
    workTitleMissing: 'Could not detect automatically — enter manually.',
  },
  manualReviewForm: {
    abrTitle: '{abr} — manual edit',
    abrHint:
      'Compare with PDF. Hazard and control numbers — comma-separated (1–54).',
    workLocation: 'Work location',
    permitNo: 'Work permit No.',
    date: 'Date',
    shiftDay: 'Day',
    shiftNight: 'Night',
    jobDescription: 'Job description',
    noStages: 'No stages — click «{generateAbr}» or add a stage manually.',
    stageLegend: 'Stage {order}: {title}',
    stageTitle: 'Stage title',
    hazardNumbers: 'Hazard factors No.',
    controlNumbers: 'Controls No.',
    removeStage: 'Remove stage',
    briefingLegend: 'Pre-work briefing',
    briefingTopHazards: '1. Top three hazards and controls',
    briefingStopScenarios: '2. Work stop scenarios',
    briefingMorMentors: '3. MOR and mentors',
    crewAbrLegend: 'Crew — JSA acknowledgment',
    fullName: 'Full name',
    badgeNo: 'Badge No.',
    approvalLegend: 'Approval participants (4 WP roles)',
    riskTitle: 'Risk assessment — manual edit',
    riskHint:
      'Compare hazard register with PDF. Adjust wording, controls and responsible persons as needed.',
    siteObject: 'Site',
    assessmentDate: 'Assessment date',
    contractorOrg: 'Contractor',
    preparedBy: 'Prepared by',
    noTasks: 'No tasks — add at least one for risk assessment.',
    taskLegend: 'Task {ordinal}',
    taskTitle: 'Task title',
    hazardLegend: 'Hazard {ordinal}',
    operation: 'Operation',
    hazardThreat: 'Hazard / threat',
    whoAtRisk: 'Who is at risk',
    controlMeasures: 'Control measures',
    responsible: 'Responsible',
    removeTask: 'Remove task',
    removeHazard: 'Remove hazard',
    likelihood: 'Likelihood',
    severity: 'Severity',
    riskLevel: 'Risk level',
    crewNdprLegend: 'Crew — from work permit',
    signaturesLegend: 'Signatures and approval (4 WP roles)',
  },
  admin: {
    inspectorScopeAll: 'all inspectors on site',
    inspectorScopeZone: 'by responsibility zone (inspectorSites in profile)',
    enableZoneScope: 'Enable zone-based access',
    enableGlobalScope: 'Enable global inspector access',
    godModeNeedPermit: 'Requires a permit with status «On approval»',
    fioVerifyLabel: 'eGov name verification',
    disableFioVerify: 'Disable name verification',
    enableFioVerify: 'Enable name verification',
  },
  access: {
    loginRequired: 'Please sign in.',
    submitDenied: 'Only work supervisor, coordinator, contractor or issuing authority can submit. You are logged in as {role}.',
    executorNavLocked: 'Workers can only access the journal and acknowledge assigned permits.',
    gateNdpr: 'Complete and save the work permit first.',
    gateRisk: 'Complete «Risk assessment» first.',
    gatePermissionsNotNeeded: 'Permissions are not required for current work types.',
    gatePermissions: 'Complete «Risk assessment» first.',
    gateUnavailable: 'Section not available yet.',
  },
  crew: {
    label: 'JSA & risk assessment acknowledgment',
    confirmation: 'I have reviewed the JSA and risk assessment',
    blockedDefault: 'A crew member acknowledges after the supervisor signs.',
    notOnApproval: 'Acknowledgment is available during permit approval.',
    needProducer: 'The work supervisor must sign the work permit first (step 1).',
    demoSuffix: 'demo',
    documentAbrRisk: 'JSA + risk assessment',
    inviteApproval: 'Work permit approval',
  },
  abrDailyAck: {
    title: 'Daily JSA acknowledgment',
    description:
      'Only crew members sign the JSA: each day they receive a task to sign acknowledgment via eGov Mobile. A signature is valid for 24 hours; after that, a new signature is required. The report records full name, role, and signature.',
    confirmation: 'I acknowledge the JSA for today’s shift',
    todayPrefix: 'Now',
    noSignaturesYet: 'no valid signatures yet',
    signedProgress: '{signed} of {total} · pending {pending}',
    notSignedToday: 'no valid signature (unsigned or older than 24 h)',
    reportTitle: 'Daily signature log',
    colDate: 'Date',
    colName: 'Full name',
    colRole: 'Role',
    colSignature: 'Signature',
    pendingTitle: 'Daily JSA acknowledgment required',
    pendingHint:
      'Each day crew members receive a task to sign JSA acknowledgment. Each signature is valid for 24 hours, then must be renewed.',
    openPermit: 'Open permit',
  },
  egovRoles: {
    performer: 'Site supervisor (preparer)',
    permitter: 'Area authority',
    issuer: 'Issuing authority',
    leadExpert: 'Lead expert',
    ert: 'ERT (PAS)',
  },
  specialWork: specialWorkEn,
  workPermissionKinds: {
    confined_space: 'Confined space entry permit',
    open_flame_fire: 'Hot work permit',
    gas_hazard: 'Gas-hazard work permit',
  },
  modals: {
    signCancelled: 'Signing cancelled in eGov Mobile.',
    pdfPackageFailed: 'Could not generate PDF package',
    signServerUnavailable: 'Signing server unavailable. Name verification failed — signature not saved.',
    signServerUnavailableAck: 'Signing server unavailable. Name verification failed — acknowledgment not saved.',
    verifyingEsighAndFio: 'Verifying e-signature and name on server…',
    verifyingEsigh: 'Verifying e-signature on server…',
    closeAria: 'Close',
    regNoField: 'Reg. No.',
    roleField: 'Role',
    formatField: 'Format',
    wpTitle: 'WP No.',
  },
  workStop: {
    panelTitle: 'Action required — work stop',
    modalTitle: 'Suspend work',
    reasonPlaceholder: 'E.g. leak detected, work without PPE, equipment failure…',
    photoReplace: 'Replace photo',
    photoCapture: 'Take photo or upload',
    photoAlt: 'Work stop photo',
    submit: 'Suspend work',
    submitting: 'Sending…',
    resolvePlaceholder: 'Justify your decision: why resume work or annul the permit…',
    liftStop: 'Lift work stop',
    annulConfirm: 'Annul work permit? This formally closes the permit in the system.',
    lifted: 'Work stop lifted',
    annulled: 'Permit annulled',
    closeNotice: 'Dismiss notification',
    closeNoticeAria: 'Dismiss notification',
  },
  workPermission: {
    updatingPdf: 'Updating permission PDFs…',
    savedClosure: 'Saved · closure section updated in PDF',
    saveClosure: 'Save closure to PDF',
    updatingPermPdf: 'Updating permission PDF…',
    savedPermPdf: 'Saved · PDF updated — you can open the permission',
    permPdf: 'Permission PDF',
    saveGasTest: 'Save gas test',
    clarification: 'Clarification',
    workLabel: 'Work title / scope',
    workLabelCs: 'Work title (CS entry)',
    equipLabel: 'Tools and equipment',
    section1Title: 'Work request',
    section1Hint: 'Filled by work supervisor',
    sitePlaceholder: 'Site name',
    regPlaceholder: 'WP reg. number',
    permNoPlaceholder: 'Permission header number',
    workPlaceholder: 'Work title without detailed description…',
    workPlaceholderCs: 'Brief work title…',
    equipPlaceholder: 'Tools, equipment, documentation…',
    csTypeTitle: 'Confined space type',
    csTypeHint: 'Mark entries and exits',
    observerPlaceholder: 'Observer name',
    checksFire: 'Worksite checks',
    checksWorkplace: 'Workplace checks',
    checksHint: 'Mark required controls present',
    extraTitle: 'Additional',
    extraHint: 'Text will appear in permission PDF',
    extraPlaceholder: 'Fill manually or via AI…',
    retestPlaceholder: 'E.g. every 2 hours',
    gasZonePlaceholder: 'Work zone',
  },
  gasTest: {
    onApprovalHint: 'Permit on approval. You can fill the gas test table now — results save to permission PDFs.',
    draftHint: 'Draft permit. Gas test is available after submission and issuance.',
    closedHint: 'Permit finished ({status}). Gas test editing is unavailable.',
    rejectedHint: 'Permit rejected. Wait for re-issue after corrections.',
    editHint: 'Editing available for on approval, issued, in progress or suspended permits (now: {status}).',
    noPermissions: 'Special work permissions not generated yet — wait for PDF from supervisor.',
    fillTable: 'Fill gas test table (section 2 in PDF): click «+ Add», enter LEL, H₂S, O₂, CO and instrument No. Permissions without readings: {empty}.',
    tableFilled: 'Gas test table complete. Add repeat readings with «+ Add» if needed.',
    panelTitle: 'Section 2 — air sampling results',
    panelHint:
      'Fill the gas test table (section 2 in the permission PDF). After saving, data is written to the PDF and approval package.',
    stepFill: 'Click «+ Add», enter issue date, work zone, LEL, H₂S, O₂, CO and instrument No.',
    stepSave: 'Click «Save gas test» — the permission PDF updates automatically.',
    stepPdf: 'Open the permission PDF and verify section 2.',
    savedConfirm: 'Section 2 saved. Gas test table is complete.',
    editAgain: 'Edit gas test',
    filledBadge: 'Complete',
    summaryTitle: '2. Permissions — gas test',
    openSection: 'Open gas test',
    addRow: '+ Add',
    emptyTable: 'Table is empty. Click «+ Add» and enter measurement results.',
    colDateIssued: 'Issue date',
    colWorkZone: 'Work zone',
    colInstrument: 'Reg. No.',
    colWorker: 'Worker',
    colDate: 'Date',
    colTime: 'Time',
    colLel: 'LEL %',
    colH2s: 'H2S, ppm',
    colO2: 'O2, %',
    colCo: 'CO, ppm',
    colTester: 'Tester name',
    updatedLabel: 'Updated',
    ertFillsNote: ' · filled by ERT',
  },
  preWorkCheck: {
    panelTitle: 'Workplace checks',
    panelTitleFire: 'Workplace area checks',
    panelHint: 'Mark items in the «Available» column',
    stepFill: 'Mark items in the «Available» column.',
    stepSave: 'Click «Save checks» — the permission PDF updates automatically.',
    stepPdf: 'Open the permission PDF to verify.',
    needsFill: 'Needs completion',
    saveChecks: 'Save checks',
    onApprovalHint:
      'Permit on approval. You can fill section 3 now — data saves to permission PDFs.',
    draftHint: 'Draft permit. Checks are available after submission for approval.',
    closedHint: 'Permit finished ({status}). Check editing is unavailable.',
    rejectedHint: 'Permit rejected. Wait for re-issue after corrections.',
    editHint:
      'Editing available for on approval, issued, in progress or suspended permits (now: {status}).',
    noPermissions: 'Special work permissions not generated yet.',
    fillChecks:
      'Fill section 3 (workplace checks) in permissions. Remaining without checks: {empty}.',
    checksFilled: 'Section 3 complete.',
    tasksTitle: 'Task: workplace checks (work supervisor)',
    tasksHint: 'Permits with unfilled section 3 in permissions — complete and save to PDF.',
    openChecks: 'Open checks',
    savedConfirm: 'Section 3 saved. Workplace checks are complete.',
    editAgain: 'Edit checks',
  },
  closure: {
    closeBusy: 'Closing…',
    closeButton: 'Close WP (work complete)',
  },
  docKit: {
    ndpr: 'Work permit',
    abr: 'JSA',
    risk: 'Risk assessment',
    viewPdf: 'View PDF: {label}',
    fillGasTest: 'Fill gas test: {label}',
    fullPackage: 'View full PDF package',
    ertPanelTitle: 'Gas test & permit documents',
    approvalPackage: 'PDF package for approval',
  },
  riskPage: {
    uploadSourceFirst: 'Upload {source} first and wait for data extraction.',
    riskReady: 'Risk assessment ready ({app}): {groups} tasks, {hazards} hazards. Click «View».',
    generateAbrFirst: 'Generate {abr} from the source document.',
    generateRiskFirst: 'Generate risk assessment from the source document.',
    riskAssessmentTitle: 'Risk assessment',
    saveForErt: 'Saving permit for ERT and permissions…',
    uploadSource: 'Upload {source} first.',
    confirmManualReview: 'Confirm manual review of {abr} and risk assessment before submitting.',
    saveToDb: 'Saving permit to database…',
    buildPdfPackage: 'Building PDF package for approval…',
    submitApproval: 'Submitting for approval…',
    provisionSigners: 'Assigning signers and notifications…',
    submittedNoInvitesFunctions: 'Permit submitted but signer notifications were not created (Firebase Functions unavailable).',
    submittedNoInvites: 'Permit submitted but signer notifications were not created.',
    submittedNoInvitesError: 'Permit submitted but notifications failed: {error}',
    generateAbr: 'Generate with {app}',
    generateRisk: 'Generate with {app}',
    viewRisk: 'View risk assessment',
    submitRequirementsAria: 'Submission requirements',
    waitAnalysis: 'Wait for analysis or click «Next — Work permit».',
    tabManualFill: 'Fill manually',
    tabGenerate: 'Generate with NOVA Safety',
  },
  ndprPage: {
    duplicateWorker: 'The same worker cannot appear in two rows.',
    fillNdprFirst: 'Complete and save the work permit first',
    manualFillHint: 'Fill required fields manually before creating the permit.',
    autoFillHint: 'Auto-filled — adjust if needed before creating the permit.',
    regAssigned: 'Permit reg. number: {reg}.',
    regAuto: 'Reg. number (001, 002…) is assigned automatically on submission.',
  },
  permissionsPage: {
    formingKind: 'Generating: {kind}…',
    pdfFailed: 'Could not generate permission PDF',
    prepPackage: 'Preparing package…',
    submitApproval: 'Submitting for approval…',
  },
  detailPage: {
    notFound: 'Work permit not found.',
    backToList: 'Back to list',
    unavailable: 'This work permit is not available for your account.',
    openingDraft: 'Opening draft to continue…',
    deleteConfirm: 'Delete permit «{label}» permanently?',
    closeEarlyConfirm: 'Close work permit early? After closing, fill closure in special work permissions.',
    ertDocsTitle: 'Gas test & permit documents',
    viewFullPdf: 'View full PDF package',
    pprName: 'Title',
    pprSite: 'Site',
    pprPeriod: 'Period',
    pprPreparedBy: 'Prepared by',
    pprTasksCount: 'Tasks in form',
    viewSource: 'View {source}',
    noSourceFile: 'Source file not attached — form fields only.',
    riskFile: 'Risk assessment',
    blocks: 'block(s)',
    downloadPdf: 'Download PDF',
    downloadMd: 'Download .md',
    asorSaved: 'HSE measures step data saved with the work permit.',
    creationDate: 'Creation date',
    duration: 'Duration',
    tentativeNd: 'Tentative WP No.',
    workPlaces: 'Work locations',
    matrixCell: 'Matrix (likelihood×severity)',
    tasksCount: 'Tasks (block count)',
  },
  pprUpload: {
    dropHint: 'Drop a file here or click to choose the source document',
    dropHere: 'Drop file here',
    release: 'Release file',
    selectFile: 'Choose file',
    uploading: 'Uploading file…',
    description:
      'Upload the source document (Method Statement, .docx / .pdf). The file is saved in the permit package with the form.',
    uploadedMeta: '{size} · uploaded {date}',
    replaceDropHint: 'Drop another file here to replace',
    replace: 'Replace',
    fileTypesHint: '.doc, .docx or .pdf · up to 15 MB',
  },
  manualReview: {
    addTask: 'Add task',
    addHazard: 'Add hazard',
    addStage: 'Add stage',
    worker: 'Worker',
    performer: 'Work supervisor',
    permitter: 'Area authority',
    issuer: 'Issuing authority',
    leadExpert: 'Lead expert',
  },
  ai: {
    requestFailed: 'Request failed.',
    openChat: 'Open AI chat',
    closeChat: 'Close AI chat',
    collapse: 'Collapse',
    you: 'You',
    reply: 'Reply',
    message: 'Message',
  },
  photo: {
    capture: 'Take photo',
    processing: 'Processing…',
    siteAlt: 'Worksite photo',
    captionPlaceholder: 'Area, equipment…',
  },
  rejection: {
    reasonFallback: 'No reason specified.',
    closeAria: 'Dismiss rejection notification',
    closeTitle: 'Dismiss notification',
  },
  transitions: {
    invalid: 'Invalid status transition',
    needPerformer: 'Cannot issue without supervisor e-signature (package author)',
    needCrewAck: 'Cannot issue without crew JSA & risk acknowledgment',
    needPermitterIssuer: 'Cannot issue without area authority and issuer e-signatures (eGov Mobile / SIGEX)',
    needLeadExpert: 'Cannot issue without lead expert e-signature',
    needF09: 'Complete F09 checklist (WP): all items Yes/No/N/A',
  },
  notices: {
    issuedMessage: 'Permit {label} issued and open for work. All participants may proceed per procedure.',
    closureMessage: 'Supervisor saved permission closure section in PDF for permit {label}. Review the current document package.',
    crewChangedMessage: 'Crew roster updated for permit {label}. Review crew and daily ABR acknowledgments.',
    performerReplacedMessage: 'New work supervisor assigned for permit {label}. Review responsibility and signatures.',
    ndprExtendedMessage: 'Permit {label} validity extended. Review dates in the document package.',
    infoMessage: 'Update for permit {label}.',
    infoTitle: 'Permit notification',
  },
  tools: {
    selectItem: 'Select: {item}',
    newItem: 'new item',
    namePlaceholder: 'Tool or equipment name',
    removeItem: 'Remove item',
  },
  stages: {
    stageN: 'Stage {n}',
  },
  ndprForm: {
    sourceDataLegend: 'Data from source document',
    organization: 'Organization',
    siteLocation: 'Site / location',
    zoneClassification: 'Zone classification',
    workTitle: 'Work title',
    performerBadgeHint: ' Supervisor badge No.: {badge}.',
    workStages: 'Work stages',
    workStagesPlaceholder:
      '1. Gas pressure release\nStage description: operations, scope, equipment…\n\n2. Preparatory work\nStage description…',
    participantsLegend: 'Approval participants',
    participantsHint:
      'Assigned automatically — you can select another user. Each role has its own e-signature login.',
    signer1Performer: '1. Work supervisor',
    signer2Permitter: '2. Area authority',
    signer3Issuer: '3. Issuing authority',
    signer4LeadExpert: '4. Lead expert',
    signer5Ert: '5. ERT (PAS)',
    ertApproverNote:
      'For hot work permits, PAS with gas test is added to approval automatically.',
    selectPlaceholder: '— Select —',
    f02Legend: 'WP form — common fields (F02)',
    badgeNo: 'Pass / badge No.',
    shift: 'Shift',
    shiftDay: 'Day',
    shiftNight: 'Night',
    startDateTime: 'Start date and time',
    endDateTime: 'End date and time',
    workersLegend: 'Workers',
    workersHint:
      'F03 rows — specify at least {min} workers from directory (names appear in JSA, risk assessment and WP): {names}.',
    workersProducerHint: 'Select crew members from the list (minimum {min}).',
    addWorker: '+ Add worker',
    workersEmptyHint:
      'Click «+ Add worker» to specify crew (minimum {min}).',
    fromUserList: 'From user list',
    date: 'Date',
    removeWorker: 'Remove worker',
    createButton: 'Create work permit',
  },
  workActivities: {
    title: 'Work types',
    selectedCount: '{count} selected',
    permissionsRequired: 'Permissions required',
    hint: '{app} infers types from the source document. Double-click a row to uncheck.',
    fireNote: 'Hot work permits',
  },
  riskForm: {
    clearForm: 'Clear form',
    abrDescription:
      '{app} builds {abr} from the source document — per corporate template (stages, hazard and control numbers, briefing, approval).',
    abrGenerating: '{app} building job safety analysis…',
    abrDocSummary: 'In document: {stages} stage(s) · site: {location}',
    abrGenNote: '{abr} ({app}): {count}. {viewAction}.',
    riskDescription:
      '{app} builds risk assessment from source document: hazard register, PPE, response plan, signatures — per GRE U12 sample.',
    riskGenerating: '{app} building risk assessment…',
    riskDocSummary: 'In document: {tasks} tasks, {hazards} hazards.',
    preSubmitTitle: 'Pre-submission review',
    preSubmitHint:
      'Generate documents, open each for review and compare with fields below. Edit manually if needed and review again.',
    sourceNotUploaded: 'file not uploaded',
    abrReady: 'ready · {stages} stage(s)',
    abrNotReady: 'not generated',
    riskReady: 'ready · {tasks} tasks, {hazards} hazards',
    riskNotReady: 'not generated',
    manualReviewConfirm:
      'I have manually reviewed {abr} and {risk}, viewed documents and verified data',
    submitConditionsTitle: 'Submission requirements',
    generateBothHint: 'Generate {abr} and {risk}, then confirm review.',
    submitConditionsHint:
      'Complete all items in «Submission requirements» — the button will become active.',
    confirmReviewHint: 'Confirm review to submit the package.',
    packageSubmitting: '{app} submitting package…',
    pdfDeferredHint:
      'Document is generated on download on the permit card — this speeds up submission.',
  },
  detailForm: {
    versionLabel: 'Version {version}',
    ertGasTestHeader: 'PAS (ERT): gas test',
    asorFormTitle: 'Form {title} ({formRef}, ed. {edition})',
    asorMissingHint:
      'HSE measures are not attached to this permit. Complete the package: {source} → {ndpr} → HSE.',
    requisitesTitle: 'Details',
    organization: 'Organization',
    siteLocation: 'Site / location',
    registrationNo: 'Registration number',
    workTypes: 'Work types',
    zoneClassification: 'Zone classification',
    workDescription: 'Work description',
    toolsAndEquipment: 'Tools and equipment',
    signer1Performer: '1. Site supervisor',
    signer2Permitter: '2. Area authority',
    signer3Issuer: '3. Issuing authority',
    signer4LeadExpert: '4. Lead expert',
    f04Title: 'F04',
    routeSheetNo: 'Route sheet No.',
    workArea: 'Area',
    specialConditions: 'Special conditions',
    matrixTitle: 'Matrix (cat. {category})',
    matrixDocuments: 'Documents: {documents}',
    matrixInteraction: 'Interaction measures: {measures}',
    matrixDefaultValidity: 'Default validity: {days} days',
    f02Legend: 'WP form — common fields (F02)',
    badgeNo: 'Pass / badge No.',
    shift: 'Shift',
    shiftDay: 'Day',
    shiftNight: 'Night',
    startDateTime: 'Start date and time',
    endDateTime: 'End date and time',
    workersTitle: 'Workers',
    workersHint:
      'Selection from user directory only (Firebase / demo). Procedures will be linked separately.',
    addWorker: '+ Add worker',
    noWorkers: 'No workers.',
    directoryNameCol: 'Directory (name)',
    dateCol: 'Date',
    selectPlaceholder: '— Select —',
    f09Title: 'F09 checklist (WP)',
    f09Hint: 'Before «In progress», all items must be Yes / No / N/A.',
    f05Title: 'F05 journal (events)',
    f05Empty: 'No entries yet.',
    demoSuffix: '({demo})',
  },
  validation: {
    generatePermissions: 'Generate permissions for selected work types.',
    missingDoc: 'Missing document: {kind}',
    workDescriptionMin: '{kind}: specify work description (min. 3 characters).',
    generatePermission: '{kind}: click «Generate permission».',
    abrNotGenerated: 'Generate «{abr}» from source document before submitting.',
    abrEmptyStages:
      'Generate «{abr}» from source document — stages without hazards and controls.',
    riskNotGenerated: 'Generate «{risk}» from source document before submitting.',
    riskEmpty: 'Generate «{risk}» from source document — hazard register is empty.',
    pprPdfGemini:
      'PDF text is extracted via Claude Haiku when uploading the file on «{source}» step.',
    pprWordOnly: 'Only Word documents (.doc, .docx) are supported for control measure extraction.',
    pprExtractFailed: 'Could not extract text — file is empty or corrupted.',
  },
  helpPage: {
    brand: 'NOVA Safety',
    title: 'Help & support',
    lead: 'Everything about working with the work permit management platform',
    whatIsTitle: 'What is NOVA Safety?',
    whatIsBody:
      'A digital work permit (WP) management platform for industrial sites. The system automates the full lifecycle — from filling in and risk assessment to approval and closure — bringing every role into one application.',
    rolesTitle: 'Roles in the system',
    roles: [
      {
        title: 'Work supervisor',
        badge: 'Approver',
        badgeKind: 'role',
        desc: 'Fills in the work permit, runs risk assessment and JSA, and applies the first approval signature.',
      },
      {
        title: 'Work crew',
        desc: 'Fitters, electricians, welders, operators, crane drivers, gas cutters, and others. They review the permit and confirm acknowledgement.',
      },
      {
        title: 'HSE inspector',
        desc: 'Monitors occupational safety. Can suspend, resume, or void a permit.',
      },
      {
        title: 'Fire & emergency response',
        desc: 'Fire safety and emergency response. The gas tester performs live atmosphere readings.',
      },
      {
        title: 'Issuing authority',
        badge: 'Approver',
        badgeKind: 'role',
        desc: 'Issues the work permit after the entire crew has acknowledged it.',
      },
      {
        title: 'Area authority',
        badge: 'Approver',
        badgeKind: 'role',
        desc: 'Verifies the work area is ready and authorizes the crew to start work.',
      },
      {
        title: 'Approving authority',
        badge: 'Approver',
        badgeKind: 'role',
        desc: 'Provides final approval after all stages are complete.',
      },
    ],
    processTitle: 'How the process works',
    steps: [
      {
        title: 'Fill in the permit',
        desc: 'The work supervisor completes the WP manually or with the AI assistant.',
      },
      {
        title: 'JSA and risk assessment',
        desc: 'The system moves the permit to safety analysis. The supervisor confirms the data and applies the first signature.',
      },
      {
        title: 'Special permissions',
        desc: 'For gas-hazard, hot work, and confined space jobs, a permission with live gas testing is generated.',
      },
      {
        title: 'Crew acknowledgement',
        desc: 'All workers review the documents and confirm acknowledgement. Approvers cannot sign until this step is done.',
      },
      {
        title: 'Sequential approval',
        desc: 'Issuer, area authority, and approver sign in order. Before signing, the area authority runs a live inspection of work areas per issued permissions — results are recorded in the WP card automatically.',
      },
      {
        title: 'Execution and closure',
        desc: 'When work is finished, the supervisor closes the permit. All participants are notified automatically.',
      },
    ],
    featuresTitle: 'Key capabilities',
    features: [
      {
        icon: '🤖',
        title: 'Claude-powered AI assistant',
        desc: 'Analyzes attached diagrams, documents, and photos. Helps verify permit completeness before signing.',
      },
      {
        icon: '🔐',
        title: 'Digital signature verification',
        desc: 'Verifies e-signatures by national ID and full name via the admin panel.',
      },
      {
        icon: '🔔',
        title: 'Automatic notifications',
        desc: 'Alerts on status changes, gas test requests, work stops, and permit closure.',
      },
      {
        icon: '🔬',
        title: 'Live gas test',
        live: true,
        desc: 'The gas tester enters atmosphere readings on site — data syncs to the WP card in real time for all participants.',
      },
      {
        icon: '👁️',
        title: 'Live inspection by area authority',
        live: true,
        desc: 'The area authority inspects work areas per issued permissions — results sync to the WP card for everyone on the permit.',
      },
    ],
    workStopTitle: 'Work stop and closure',
    workStop: [
      {
        title: 'Work stop',
        desc: 'Any worker can stop work when a hazard is found, with a reason. The HSE inspector decides whether to resume or void the permit.',
      },
      {
        title: 'Early closure',
        desc: 'The work supervisor can close the WP early if work finishes ahead of schedule. All participants are notified automatically.',
      },
    ],
    ctaTitle: 'Still have questions?',
    ctaSubtitle: 'The NOVA Safety team is ready to help with any platform questions',
    ctaButton: 'Contact support',
    supportEmail: 'support@nova-safety.kz',
    liveBadge: 'Auto-update',
  },
}
