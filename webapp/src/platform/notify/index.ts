/**
 * Сообщения, у которых нет своего места на экране.
 *
 * Читать `store.ts` до первого применения: там записано, что сообщением
 * быть НЕ может — подтверждения с выбором и, отдельным правилом, списание
 * денег.
 */
export { Notices } from './Notices'
export { dismissNotice, notify, notifyDone, notifyError } from './store'
export type { Notice, NoticeKind } from './store'
