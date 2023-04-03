import { QueryClient, useQueryClient } from '@tanstack/solid-query'
import { Component, createMemo } from 'solid-js'
import { DevtoolsQueryClientContext } from './Context'
import { DevtoolsPanel } from './Devtools'
import { isServer } from 'solid-js/web'

interface SolidQueryDevtoolsProps {
  queryClient?: QueryClient
}

export const SolidQueryDevtools: Component<SolidQueryDevtoolsProps> = props => {
  const client = createMemo(() => props.queryClient || useQueryClient())

  return isServer ? null : (
    <DevtoolsQueryClientContext.Provider value={client()}>
      <DevtoolsPanel />
    </DevtoolsQueryClientContext.Provider>
  )
}
