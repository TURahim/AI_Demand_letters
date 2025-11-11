'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { WebsocketProvider } from 'y-websocket'

interface User {
  clientId: number
  name: string
  color: string
}

interface PresenceIndicatorsProps {
  provider: WebsocketProvider | null
  currentUserId: string
  currentUserName: string
}

export function PresenceIndicators({ provider, currentUserId, currentUserName }: PresenceIndicatorsProps) {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    if (!provider) return

    const awareness = provider.awareness

    const updateUsers = () => {
      const states = awareness.getStates()
      const activeUsers: User[] = []

      states.forEach((state, clientId) => {
        if (state.user) {
          activeUsers.push({
            clientId,
            name: state.user.name,
            color: state.user.color,
          })
        }
      })

      setUsers(activeUsers)
    }

    // Initial update
    updateUsers()

    // Listen for awareness changes
    awareness.on('change', updateUsers)

    return () => {
      awareness.off('change', updateUsers)
    }
  }, [provider])

  if (users.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Active users:</span>
      <TooltipProvider>
        <div className="flex -space-x-2">
          {users.map((user) => (
            <Tooltip key={user.clientId}>
              <TooltipTrigger asChild>
                <Avatar
                  className="w-8 h-8 border-2 border-background cursor-pointer"
                  style={{ borderColor: user.color }}
                >
                  <AvatarFallback style={{ backgroundColor: user.color }}>
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      {users.length > 1 && (
        <span className="text-xs text-muted-foreground">
          {users.length} {users.length === 1 ? 'user' : 'users'} editing
        </span>
      )}
    </div>
  )
}

