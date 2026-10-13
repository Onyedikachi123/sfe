'use client'
import { useEffect, useState } from 'react'
import type { User } from '@/types/api'
import { Avatar, Icon } from '@/components/ui'
import { getMe } from '@/lib/api/endpoints'
import styles from './UserMenu.module.css'

const TIER_LABELS: Record<User['tier'], string> = {
  basic: 'Basic',
  verified: 'Verified',
  premium: 'Premium',
}

export function UserMenu() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<User>()

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data))
      // Without a user the trigger still renders the placeholder avatar, which is enough here.
      .catch(() => {})
  }, [])

  return (
    <div className={styles.menu}>
      <button type="button" className={styles.trigger} onClick={() => setOpen(!open)} aria-expanded={open}>
        <Avatar src={user?.avatarUrl ?? null} alt="" size="sm" />
        <span className={styles.name}>{user?.firstName}</span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.fullName}>
            {user?.firstName} {user?.lastName}
          </div>
          <div className={styles.email}>{user?.email}</div>
          {user && <div className={styles.tier}>{TIER_LABELS[user.tier]} account</div>}
        </div>
      )}
    </div>
  )
}
