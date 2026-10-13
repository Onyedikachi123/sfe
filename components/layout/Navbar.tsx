'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cx } from '@/lib/cx'
import { UserMenu } from './UserMenu'
import styles from './Navbar.module.css'

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/convert', label: 'Convert' },
]

// The query string never reaches here (usePathname drops it), and nested routes keep their section
// active. "/" would prefix-match everything, so it only matches exactly.
const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          acme<span className={styles.logoDot}>.</span>wallet
        </Link>
        <nav className={styles.links} aria-label="Main">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cx(styles.link, active && styles.active)}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
        <UserMenu />
      </div>
    </header>
  )
}
