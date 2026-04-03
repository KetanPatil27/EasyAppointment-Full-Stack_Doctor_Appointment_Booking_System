'use client'

import Link from 'next/link'

/**
 * EasyAppointment brand logo — an inline SVG stethoscope icon
 * with the "EA" initials, plus the brand text.
 *
 * Props:
 *  - size: 'sm' | 'md' — controls icon and text size
 *  - href: link target (defaults to "/")
 *  - onClick: optional click handler
 */
export function Logo({
  size = 'md',
  href = '/',
  onClick,
}: {
  size?: 'sm' | 'md'
  href?: string
  onClick?: () => void
}) {
  const iconSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const textSize = size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 group">
      <div className={`${iconSize} rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
        >
          {/* Stethoscope head */}
          <circle cx="16" cy="10" r="5" stroke="white" strokeWidth="2" fill="none" />
          {/* Tube */}
          <path d="M11 10 C11 10, 8 10, 8 15 C8 22, 14 24, 16 24 C18 24, 24 22, 24 15 C24 10, 21 10, 21 10" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Ear tips */}
          <circle cx="11" cy="7" r="1.5" fill="white" />
          <circle cx="21" cy="7" r="1.5" fill="white" />
          {/* Heart at bottom */}
          <path d="M14 21 C14 20, 13 19, 14.5 19 C15.5 19, 16 20, 16 20 C16 20, 16.5 19, 17.5 19 C19 19, 18 20, 18 21 C18 22, 16 23.5, 16 23.5 C16 23.5, 14 22, 14 21Z" fill="white" />
        </svg>
      </div>
      <span className={`${textSize} font-bold text-foreground leading-tight`}>EasyAppointment</span>
    </Link>
  )
}
