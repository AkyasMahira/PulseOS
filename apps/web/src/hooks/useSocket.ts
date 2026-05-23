import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useMetricsStore, useAuthStore } from '../stores/metrics'

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { token } = useAuthStore()
  const { setConnected, setSnapshot, setContainers, setServices, setProcesses, addAlert } = useMetricsStore()

  useEffect(() => {
    if (!token) return

    const socket = io(API_URL, {
      path: '/ws',
      auth: { token },
      transports: ['websocket'],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('subscribe', {
        channels: ['metrics:snapshot', 'metrics:containers', 'metrics:services', 'metrics:processes', 'alert:fired'],
      })
    })

    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))

    socket.on('metrics:snapshot', setSnapshot)
    socket.on('metrics:containers', setContainers)
    socket.on('metrics:services', setServices)
    socket.on('metrics:processes', setProcesses)
    socket.on('alert:fired', addAlert)

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  return socketRef
}
