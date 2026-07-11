import appLogoUrl from '../assets/app-logo.png'

/** Лого без фона для центра хедера. */
export const HEADER_LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/studio-459358167-4d676.firebasestorage.app/o/app-logo-BITPYPIi-removebg-preview.png?alt=media&token=36eb1bdf-729f-442c-8c24-5816ac836292'

/** Лого в левом сайдбаре (над вкладками). */
export const SIDEBAR_LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/studio-459358167-4d676.firebasestorage.app/o/app-logo-BITPYPIi%20(1)%20(1).png?alt=media&token=cd7d30b1-f669-454e-8fd4-78088b23f85a'

type AppLogoProps = {
  size?: 'sm' | 'lg'
  className?: string
  /** header — прозрачное PNG по центру; sidebar/default — основной логотип с фоном. */
  variant?: 'default' | 'header' | 'sidebar'
}

export function AppLogo({ size = 'sm', className, variant = 'default' }: AppLogoProps) {
  const src =
    variant === 'header'
      ? HEADER_LOGO_URL
      : variant === 'sidebar'
        ? SIDEBAR_LOGO_URL
        : appLogoUrl
  return (
    <span
      className={`brand-mark__logo${size === 'lg' ? ' brand-mark__logo--lg' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      <img src={src} alt="" decoding="async" loading="eager" />
    </span>
  )
}
