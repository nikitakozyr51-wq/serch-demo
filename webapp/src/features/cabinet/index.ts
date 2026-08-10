/*
  Счётчик открытых окон переехал в платформу (`@/platform/overlay`): его
  спрашивает не только кабинет, но и просмотрщик кадров из выдачи, а прямая
  стрелка «выдача → кабинет» замкнула бы кольцо — кабинет уже импортирует
  выдачу. Здесь остаётся пересылка, чтобы двадцать мест кабинета не меняли
  адрес импорта ради переезда, которого они не заметят.
*/
export { isOverlayOpen, useOverlayOpen } from '@/platform/overlay'
export { CabinetGuard } from './CabinetGuard'
export { AvatarMenu } from './AvatarMenu'
export { PhoneFrame } from './PhoneFrame'
export { useCabinetNav } from './useCabinetNav'
export { isNarrow, loginPath, platformTwin } from './platform'
export { usePlatformRoute } from './usePlatformRoute'
export { requestPalette } from '@/platform/overlay'
export { CabinetHeader } from './CabinetHeader'
export type { CabinetHeaderProps } from './CabinetHeader'
export { BalanceStoppedBar } from './BalanceStoppedBar'
export { CabinetOverlays } from './CabinetOverlays'
export { CommandPalette } from './CommandPalette'
export { HotkeysDialog } from './dialogs'
export { CabinetPage, CabinetShell } from './CabinetShell'
export type { CabinetShellProps } from './CabinetShell'
export { CabinetFrame } from './CabinetFrame'
export { MobileFrame } from './MobileFrame'
export { useMobileFramed } from './mobile-framed'
export { CabinetSidebar } from './CabinetSidebar'
export type { CabinetSidebarProps, NavEntry } from './CabinetSidebar'
export {
  MobileAuthLogo,
  MobileAuthScreen,
  MobileEmptyState,
  MobileScreen,
  MobileSectionHeader,
  MobileSheet,
} from './MobileParts'
export { MobileHeader } from './MobileHeader'
export type { MobileHeaderProps } from './MobileHeader'
export { useHotkeys } from './useHotkeys'
export type { HotkeyHandlers } from './useHotkeys'
export { MobileBottomNav } from './MobileBottomNav'
export type { MobileBottomNavProps, MobileTab } from './MobileBottomNav'
