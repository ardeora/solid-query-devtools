import {
  Accessor,
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  from,
  JSX,
  on,
  onCleanup,
  Show,
  useContext,
} from 'solid-js'
import { rankItem } from '@tanstack/match-sorter-utils'
import { createStore, produce, reconcile, unwrap } from 'solid-js/store'
import { css, cx, keyframes } from '@emotion/css'
import { tokens } from './theme'
import superjson, { serialize } from 'superjson'
import {
  Query,
  QueryCache,
  useQueryClient,
  onlineManager,
  QueryClient,
  QueryState,
} from '@tanstack/solid-query'
import {
  getQueryStatusLabel,
  getQueryStatusColor,
  queryStatusLabels,
  IQueryStatusLabel,
  displayValue,
  getQueryStatusColorByLabel,
  sortFns,
} from './utils'
import { ArrowDown, ArrowUp, ChevronDown, Offline, Search, Settings, Wifi } from './icons'
import Explorer from './Explorer'
import { DevtoolsQueryClientContext } from './Context'
import { TransitionGroup } from 'solid-transition-group'
import { loadFonts } from './fonts'
import { Key } from '@solid-primitives/keyed'
import { deepTrack } from '@solid-primitives/deep'

interface DevToolsErrorType {
  /**
   * The name of the error.
   */
  name: string
  /**
   * How the error is initialized.
   */
  initializer: (query: Query) => Error
}

interface DevtoolsPanelProps {
  queryClient?: QueryClient
}

interface QueryStatusProps {
  label: string
  color: 'green' | 'yellow' | 'gray' | 'blue' | 'purple'
  count: number
}

const [selectedQueryHash, setSelectedQueryHash] = createSignal<string | null>(null)

export const DevtoolsPanel: Component<DevtoolsPanelProps> = props => {
  // loadFonts()
  const styles = getStyles()

  const [open, setOpen] = createSignal(false)

  const [devtoolsHeight, setDevtoolsHeight] = createSignal(500)
  const [isResizing, setIsResizing] = createSignal(false)

  const [filter, setFilter] = createSignal('')
  const [sort, setSort] = createSignal(Object.keys(sortFns)[0])
  const [sortOrder, setSortOrder] = createSignal<1 | -1>(1)

  const sortFn = createMemo(() => sortFns[sort() as string]!)

  const queryCache = createMemo(() => {
    return useContext(DevtoolsQueryClientContext).getQueryCache()
  })

  const queryCount = createSubscribeToQueryCache(queryCache => {
    const curr = queryCache().getAll()
    const res: { [K in IQueryStatusLabel]?: number } = {}
    for (const label of queryStatusLabels) {
      res[label] = curr.filter(e => getQueryStatusLabel(e) === label).length
    }
    return res
  })

  const queries = createMemo(
    on(
      () => [queryCount(), filter(), sort(), sortOrder()],
      () => {
        const curr = queryCache().getAll()

        const filtered = filter()
          ? curr.filter(item => rankItem(item.queryHash, filter()).passed)
          : [...curr]

        const sorted = sortFn() ? filtered.sort((a, b) => sortFn()(a, b) * sortOrder()) : filtered
        return sorted
      },
    ),
  )

  const [offline, setOffline] = createSignal(false)

  const handleDragStart: JSX.EventHandler<HTMLDivElement, MouseEvent> = event => {
    const panelElement = event.currentTarget.parentElement
    if (!panelElement) return
    setIsResizing(true)
    const { height, width } = panelElement.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    let newSize = 0

    const runDrag = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault()
      newSize = height + startY - moveEvent.clientY
      setDevtoolsHeight(Math.round(newSize))
    }

    const unsub = () => {
      if (isResizing()) {
        setIsResizing(false)
      }
      document.removeEventListener('mousemove', runDrag, false)
      document.removeEventListener('mouseUp', unsub, false)
    }

    document.addEventListener('mousemove', runDrag, false)
    document.addEventListener('mouseup', unsub, false)
  }

  return (
    <div
      class={css`
        & .SQD-panel-exit-active,
        & .SQD-panel-enter-active {
          transition: opacity 0.3s, transform 0.3s;
        }

        & .SQD-panel-exit-to,
        & .SQD-panel-enter {
          transform: translateY(${devtoolsHeight()}px);
        }

        & .SQD-button-exit-active,
        & .SQD-button-enter-active {
          transition: opacity 0.3s, transform 0.3s;
        }

        & .SQD-button-exit-to,
        & .SQD-button-enter {
          transform: translateY(72px);
        }
      `}
    >
      <TransitionGroup name="SQD-panel">
        <Show when={open()}>
          <aside class={styles.panel} style={{ height: `${devtoolsHeight()}px` }}>
            <div class={styles.dragHandle} onMouseDown={handleDragStart}></div>
            <div class={styles.queriesContainer}>
              <div
                class={cx(
                  styles.row,
                  css`
                    gap: 2rem;
                  `,
                )}
              >
                <button class={styles.logo} onClick={() => setOpen(false)}>
                  <span class={styles.tanstackLogo}>TANSTACK</span>
                  <span class={styles.solidQueryLogo}>Solid Query v5</span>
                </button>
                <QueryStatusCount />
              </div>
              <div class={styles.row}>
                <div class={styles.filtersContainer}>
                  <div class={styles.filterInput}>
                    <Search />
                    <input
                      type="text"
                      placeholder="Filter"
                      onInput={e => setFilter(e.currentTarget.value)}
                      value={filter()}
                    />
                  </div>
                  <div class={styles.filterSelect}>
                    <select value={sort()} onChange={e => setSort(e.currentTarget.value)}>
                      {Object.keys(sortFns).map(key => (
                        <option value={key}>Sort by {key}</option>
                      ))}
                    </select>
                    <ChevronDown />
                  </div>
                  <button
                    onClick={() => {
                      setSortOrder(prev => (prev === 1 ? -1 : 1))
                    }}
                  >
                    <Show when={sortOrder() === 1}>
                      <span>Asc</span>
                      <ArrowUp />
                    </Show>
                    <Show when={sortOrder() === -1}>
                      <span>Desc</span>
                      <ArrowDown />
                    </Show>
                  </button>
                </div>

                <div class={styles.actionsContainer}>
                  <button
                    onClick={() => {
                      if (offline()) {
                        onlineManager.setOnline(undefined)
                        setOffline(false)
                        window.dispatchEvent(new Event('online'))
                      } else {
                        onlineManager.setOnline(false)
                        setOffline(true)
                      }
                    }}
                  >
                    {offline() ? <Offline /> : <Wifi />}
                  </button>
                  <button>
                    <Settings />
                  </button>
                </div>
              </div>
              <div class={styles.overflowQueryContainer}>
                <div>
                  <For each={queries()}>{query => <QueryRow query={query} />}</For>
                </div>
              </div>
            </div>
            <Show when={selectedQueryHash()}>
              <QueryDetails />
            </Show>
          </aside>
        </Show>
      </TransitionGroup>
      <TransitionGroup name="SQD-button">
        <Show when={!open()}>
          <div class={styles.devtoolsBtn}>
            <div></div>
            <button onClick={() => setOpen(true)}>
              <img src="https://avatars.githubusercontent.com/u/72518640"></img>
            </button>
          </div>
        </Show>
      </TransitionGroup>
    </div>
  )
}

export const QueryRow: Component<{ query: Query }> = props => {
  const styles = getStyles()

  const queryState = createSubscribeToQueryCache(
    queryCache =>
      queryCache().find({
        queryKey: props.query.queryKey,
      })?.state,
  )

  const isStale = createSubscribeToQueryCache(
    queryCache =>
      queryCache()
        .find({
          queryKey: props.query.queryKey,
        })
        ?.isStale() ?? false,
  )

  const isDisabled = createSubscribeToQueryCache(
    queryCache =>
      queryCache()
        .find({
          queryKey: props.query.queryKey,
        })
        ?.isDisabled() ?? false,
  )

  const observers = createSubscribeToQueryCache(
    queryCache =>
      queryCache()
        .find({
          queryKey: props.query.queryKey,
        })
        ?.getObserversCount() ?? 0,
  )

  const color = createMemo(() =>
    getQueryStatusColor({
      queryState: queryState()!,
      observerCount: observers(),
      isStale: isStale(),
    }),
  )

  return (
    <Show when={queryState()}>
      <button
        onClick={() =>
          setSelectedQueryHash(
            props.query.queryHash === selectedQueryHash() ? null : props.query.queryHash,
          )
        }
        class={cx(
          styles.queryRow,
          selectedQueryHash() === props.query.queryHash && styles.selectedQueryRow,
        )}
      >
        <div
          class={cx(
            'SQDObserverCount',
            color() === 'gray'
              ? css`
                  background-color: ${tokens.colors[color()][700]};
                  color: ${tokens.colors[color()][300]};
                `
              : css`
                  background-color: ${tokens.colors[color()][900]};
                  color: ${tokens.colors[color()][300]} !important;
                `,
          )}
        >
          {observers()}
        </div>
        <code class="SQDQueryHash">{props.query.queryHash}</code>
        <Show when={isDisabled()}>
          <div class="SQDQueryDisabled">disabled</div>
        </Show>
      </button>
    </Show>
  )
}

export const QueryStatusCount: Component = () => {
  const stale = createSubscribeToQueryCache(
    queryCache =>
      queryCache()
        .getAll()
        .filter(q => getQueryStatusLabel(q) === 'stale').length,
  )

  const fresh = createSubscribeToQueryCache(
    queryCache =>
      queryCache()
        .getAll()
        .filter(q => getQueryStatusLabel(q) === 'fresh').length,
  )

  const fetching = createSubscribeToQueryCache(
    queryCache =>
      queryCache()
        .getAll()
        .filter(q => getQueryStatusLabel(q) === 'fetching').length,
  )

  const paused = createSubscribeToQueryCache(
    queryCache =>
      queryCache()
        .getAll()
        .filter(q => getQueryStatusLabel(q) === 'paused').length,
  )

  const inactive = createSubscribeToQueryCache(
    queryCache =>
      queryCache()
        .getAll()
        .filter(q => getQueryStatusLabel(q) === 'inactive').length,
  )

  const styles = getStyles()

  return (
    <div class={styles.queryStatusContainer}>
      <QueryStatus label="Fresh" color="green" count={fresh()} />
      <QueryStatus label="Fetching" color="blue" count={fetching()} />
      <QueryStatus label="Paused" color="purple" count={paused()} />
      <QueryStatus label="Stale" color="yellow" count={stale()} />
      <QueryStatus label="Inactive" color="gray" count={inactive()} />
    </div>
  )
}

export const QueryStatus: Component<QueryStatusProps> = props => {
  const styles = getStyles()

  return (
    <span class={styles.queryStatusTag}>
      <span
        class={css`
          width: ${tokens.size[2]};
          height: ${tokens.size[2]};
          border-radius: ${tokens.border.radius.full};
          background-color: ${tokens.colors[props.color][500]};
        `}
      />
      <span>{props.label}</span>
      <span
        class={cx(
          styles.queryStatusCount,
          props.count > 0 && props.color !== 'gray'
            ? css`
                background-color: ${tokens.colors[props.color][900]};
                color: ${tokens.colors[props.color][300]} !important;
              `
            : css`
                color: ${tokens.colors['gray'][400]} !important;
              `,
        )}
      >
        {props.count}
      </span>
    </span>
  )
}

const QueryDetails = () => {
  const styles = getStyles()
  const queryClient = useContext(DevtoolsQueryClientContext)

  const activeQuery = createSubscribeToQueryCache(queryCache =>
    queryCache()
      .getAll()
      .find(query => query.queryHash === selectedQueryHash()),
  )

  const activeQueryFresh = createSubscribeToQueryCache(queryCache => {
    const query = queryCache()
      .getAll()
      .find(query => query.queryHash === selectedQueryHash())
    return JSON.parse(
      JSON.stringify(query, (key, value) => {
        if (value instanceof Map) {
          return Object.fromEntries(value)
        } else if (value instanceof Set) {
          return Array.from(value)
        }
        return value
      }),
    ) as Query
  })

  const activeQueryState = createSubscribeToQueryCache(
    queryCache =>
      queryCache()
        .getAll()
        .find(query => query.queryHash === selectedQueryHash())?.state,
  )

  const activeQueryStateData = createSubscribeToQueryCache(queryCache => {
    return superjson.deserialize(
      superjson.serialize(
        queryCache()
          .getAll()
          .find(query => query.queryHash === selectedQueryHash())?.state.data,
      ),
    )
  })

  const statusLabel = createSubscribeToQueryCache(queryCache => {
    const query = queryCache()
      .getAll()
      .find(query => query.queryHash === selectedQueryHash())
    if (!query) return 'inactive'
    return getQueryStatusLabel(query)
  })

  const queryStatus = createSubscribeToQueryCache(queryCache => {
    const query = queryCache()
      .getAll()
      .find(query => query.queryHash === selectedQueryHash())
    if (!query) return 'pending'
    return query.state.status
  })

  const isStale = createSubscribeToQueryCache(
    queryCache =>
      queryCache()
        .getAll()
        .find(query => query.queryHash === selectedQueryHash())
        ?.isStale() ?? false,
  )

  const observerCount = createSubscribeToQueryCache(
    queryCache =>
      queryCache()
        .getAll()
        .find(query => query.queryHash === selectedQueryHash())
        ?.getObserversCount() ?? 0,
  )

  const queryCache = createMemo(() => {
    const client = useContext(DevtoolsQueryClientContext)
    return client.getQueryCache()
  })

  const color = createMemo(() => getQueryStatusColorByLabel(statusLabel()))

  const handleRefetch = () => {
    const promise = activeQuery()?.fetch()
    promise?.catch(() => {})
  }

  const triggerError = (errorType?: DevToolsErrorType) => {
    const error = errorType?.initializer(activeQuery()!) ?? new Error('Unknown error from devtools')

    const __previousQueryOptions = activeQuery()!.options

    activeQuery()!.setState({
      status: 'error',
      error,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      fetchMeta: {
        ...activeQuery()!.state.fetchMeta,
        __previousQueryOptions,
      } as any,
    } as QueryState<unknown, Error>)
  }

  const restoreQueryAfterLoadingOrError = () => {
    activeQuery()?.fetch((activeQuery()?.state.fetchMeta as any).__previousQueryOptions, {
      // Make sure this fetch will cancel the previous one
      cancelRefetch: true,
    })
  }

  return (
    <Show when={activeQuery() && activeQueryState()}>
      <div class={styles.detailsContainer}>
        <div class={styles.detailsHeader}>Query Details</div>
        <div class={styles.detailsBody}>
          <div>
            <pre>
              <code>{displayValue(activeQuery()!.queryKey, true)}</code>
            </pre>
            <span
              class={cx(
                styles.queryDetailsStatus,
                color() === 'gray'
                  ? css`
                      background-color: ${tokens.colors[color()][700]};
                      color: ${tokens.colors[color()][300]};
                      border-color: ${tokens.colors[color()][600]};
                    `
                  : css`
                      background-color: ${tokens.colors[color()][900]};
                      color: ${tokens.colors[color()][300]};
                      border-color: ${tokens.colors[color()][600]};
                    `,
              )}
            >
              {statusLabel()}
            </span>
          </div>
          <div>
            <span>Observers:</span>
            <span>{observerCount()}</span>
          </div>
          <div>
            <span>Last Updated:</span>
            <span>{new Date(activeQueryState()!.dataUpdatedAt).toLocaleTimeString()}</span>
          </div>
        </div>
        <div class={styles.detailsHeader}>Actions</div>
        <div class={styles.actionsBody}>
          <button
            class={css`
              color: ${tokens.colors.blue[400]};
            `}
            onClick={handleRefetch}
            disabled={statusLabel() === 'fetching'}
          >
            <span
              class={css`
                background-color: ${tokens.colors.blue[400]};
              `}
            ></span>
            Refetch
          </button>
          <button
            class={css`
              color: ${tokens.colors.yellow[400]};
            `}
            onClick={() => queryClient.invalidateQueries(activeQuery())}
          >
            <span
              class={css`
                background-color: ${tokens.colors.yellow[400]};
              `}
            ></span>
            Invalidate
          </button>
          <button
            class={css`
              color: ${tokens.colors.gray[300]};
            `}
            onClick={() => queryClient.resetQueries(activeQuery())}
          >
            <span
              class={css`
                background-color: ${tokens.colors.gray[400]};
              `}
            ></span>
            Reset
          </button>
          <button
            class={css`
              color: ${tokens.colors.cyan[400]};
            `}
            onClick={() => {
              if (activeQuery()?.state.data === undefined) {
                restoreQueryAfterLoadingOrError()
              } else {
                const activeQueryVal = activeQuery()
                if (!activeQueryVal) return
                const __previousQueryOptions = activeQueryVal.options
                // Trigger a fetch in order to trigger suspense as well.
                activeQueryVal.fetch({
                  ...__previousQueryOptions,
                  queryFn: () => {
                    return new Promise(() => {
                      // Never resolve
                    })
                  },
                  gcTime: -1,
                })
                activeQueryVal.setState({
                  data: undefined,
                  status: 'pending',
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                  fetchMeta: {
                    ...activeQueryVal.state.fetchMeta,
                    __previousQueryOptions,
                  } as any,
                } as QueryState<unknown, Error>)
              }
            }}
          >
            <span
              class={css`
                background-color: ${tokens.colors.cyan[400]};
              `}
            ></span>
            {statusLabel() === 'fetching' ? 'Restore' : 'Trigger'} Loading
          </button>
          <button
            class={css`
              color: ${tokens.colors.red[400]};
            `}
            onClick={() => {
              if (!activeQuery()!.state.error) {
                triggerError()
              } else {
                queryClient.resetQueries(activeQuery())
              }
            }}
          >
            <span
              class={css`
                background-color: ${tokens.colors.red[400]};
              `}
            ></span>
            {queryStatus() === 'error' ? 'Restore' : 'Trigger'} Error
          </button>
        </div>
        <div class={styles.detailsHeader}>Data Explorer</div>
        <div
          style={{
            padding: '0.5rem',
          }}
        >
          <Explorer
            label="Data"
            defaultExpanded={['Data']}
            value={activeQueryStateData()}
            copyable
          />
        </div>
        <div class={styles.detailsHeader}>Query Explorer</div>
        <div
          style={{
            padding: '0.5rem',
          }}
        >
          <Explorer
            label="Query"
            defaultExpanded={['Query', 'queryKey']}
            value={activeQueryFresh()}
          />
        </div>
      </div>
    </Show>
  )
}

const createSubscribeToQueryCache = <T,>(
  callback: (queryCache: Accessor<QueryCache>) => Exclude<T, Function>,
): Accessor<T> => {
  const queryCache = createMemo(() => {
    const client = useContext(DevtoolsQueryClientContext)
    return client.getQueryCache()
  })
  const [value, setValue] = createSignal<T>(callback(queryCache))

  const unsub = queryCache().subscribe(() => {
    setValue(callback(queryCache))
  })

  createEffect(() => {
    setValue(callback(queryCache))
  })

  onCleanup(() => {
    unsub()
  })

  return value
}

const getStyles = () => {
  const { colors, font, size, alpha, shadow } = tokens

  return {
    devtoolsBtn: css`
      z-index: 9999;
      position: fixed;
      bottom: 16px;
      right: 16px;
      padding: 4px;

      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      box-shadow: ${shadow.md()};
      overflow: hidden;

      & div {
        position: absolute;
        top: -8px;
        left: -8px;
        right: -8px;
        bottom: -8px;
        border-radius: 9999px;
        background-image: url('https://avatars.githubusercontent.com/u/72518640');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        filter: blur(6px) saturate(1.2) contrast(1.1);
      }

      & button {
        position: relative;
        z-index: 1;
        padding: 0;
        border-radius: 9999px;
        background-color: transparent;
        border: none;
        height: 48px;
        width: 48px;
        overflow: hidden;
        cursor: pointer;

        & img {
          height: 100%;
          width: 100%;
          object-fit: cover;
        }
      }
    `,
    panel: css`
      position: fixed;
      bottom: 0;
      right: 0;
      left: 0;
      z-index: 9999;
      background-color: ${colors.darkGray[800]};
      border-top: ${colors.darkGray[300]} 1px solid;
      display: flex;
      max-height: 90%;
      min-height: 3.5rem;
      gap: ${tokens.size[0.5]};
      & * {
        font-family: 'Inter', sans-serif;
        color: ${colors.gray[300]};
        box-sizing: border-box;
      }
    `,
    queriesContainer: css`
      flex: 1 1 700px;
      background-color: ${colors.darkGray[700]};
      display: flex;
      flex-direction: column;
    `,
    dragHandle: css`
      width: 100%;
      height: ${tokens.size[1]};
      cursor: ns-resize;
      position: absolute;
      top: 0;
      transition: background-color 0.125s ease;
      &:hover {
        background-color: ${colors.darkGray[200]};
      }
      z-index: 2;
    `,
    row: css`
      display: flex;
      justify-content: space-between;
      padding: ${tokens.size[2.5]} ${tokens.size[3]};
      gap: ${tokens.size[4]};
      border-bottom: ${colors.darkGray[500]} 1px solid;
      align-items: center;
      & > button {
        padding: 0;
        background: transparent;
        border: none;
        display: flex;
        flex-direction: column;
      }
    `,
    logo: css`
      cursor: pointer;
      &:hover {
        opacity: 0.7;
      }
    `,
    tanstackLogo: css`
      font-size: ${font.size.lg};
      font-weight: ${font.weight.extrabold};
      line-height: ${font.lineHeight.sm};
    `,
    solidQueryLogo: css`
      font-weight: ${font.weight.semibold};
      font-size: ${font.size.sm};
      background: linear-gradient(to right, #dd524b, #e9a03b);
      background-clip: text;
      line-height: ${font.lineHeight.xs};
      -webkit-text-fill-color: transparent;
    `,
    queryStatusContainer: css`
      display: flex;
      gap: ${tokens.size[2]};
      height: min-content;
    `,
    queryStatusTag: css`
      display: flex;
      gap: ${tokens.size[1.5]};
      background: ${colors.darkGray[500]};
      border-radius: ${tokens.border.radius.md};
      font-size: ${font.size.sm};
      padding: 4px;
      padding-left: 10px;
      align-items: center;
      line-height: ${font.lineHeight.md};
      font-weight: ${font.weight.medium};
      border: none;
      user-select: none;
      & span:nth-child(2) {
        color: ${colors.gray[300]}${alpha[80]};
      }
    `,
    selectedQueryRow: css`
      background-color: ${colors.darkGray[500]};
    `,
    queryStatusCount: css`
      padding: 0 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${colors.gray[400]};
      background-color: ${colors.darkGray[300]};
      border-radius: 3px;
      font-variant-numeric: tabular-nums;
    `,
    filtersContainer: css`
      display: flex;
      gap: ${tokens.size[2.5]};
      & > button {
        cursor: pointer;
        padding: ${tokens.size[1.5]} ${tokens.size[2.5]};
        padding-right: ${tokens.size[1.5]};
        border-radius: ${tokens.border.radius.md};
        background-color: ${colors.darkGray[400]};
        font-size: ${font.size.sm};
        display: flex;
        align-items: center;
        line-height: ${font.lineHeight.sm};
        gap: ${tokens.size[1.5]};
        max-width: 160px;
        border: 1px solid ${colors.darkGray[200]};
      }
    `,
    filterInput: css`
      padding: ${tokens.size[1.5]} ${tokens.size[2.5]};
      border-radius: ${tokens.border.radius.md};
      background-color: ${colors.darkGray[400]};
      display: flex;
      box-sizing: content-box;
      align-items: center;
      gap: ${tokens.size[1.5]};
      max-width: 160px;
      border: 1px solid ${colors.darkGray[200]};
      height: min-content;
      & > svg {
        width: ${tokens.size[3.5]};
        height: ${tokens.size[3.5]};
      }
      & input {
        font-size: ${font.size.sm};
        width: 100%;
        background-color: ${colors.darkGray[400]};
        border: none;
        padding: 0;
        line-height: ${font.lineHeight.sm};
        color: ${colors.gray[300]};
        &::placeholder {
          color: ${colors.gray[300]};
        }
        &:focus {
          outline: none;
        }
      }
    `,
    filterSelect: css`
      padding: ${tokens.size[1.5]} ${tokens.size[2.5]};
      border-radius: ${tokens.border.radius.md};
      background-color: ${colors.darkGray[400]};
      display: flex;
      align-items: center;
      gap: ${tokens.size[1.5]};
      box-sizing: content-box;
      max-width: 160px;
      border: 1px solid ${colors.darkGray[200]};
      height: min-content;
      & > svg {
        width: ${tokens.size[3]};
        height: ${tokens.size[3]};
      }
      & > select {
        appearance: none;
        width: min-content;
        line-height: ${font.lineHeight.sm};
        font-size: ${font.size.sm};
        background-color: ${colors.darkGray[400]};
        border: none;
        &:focus {
          outline: none;
        }
      }
    `,
    actionsContainer: css`
      display: flex;
      gap: ${tokens.size[2.5]};

      & > button {
        padding: ${tokens.size[2]} ${tokens.size[2]};
        padding-right: ${tokens.size[1.5]};
        border-radius: ${tokens.border.radius.md};
        background-color: ${colors.darkGray[400]};
        display: flex;
        align-items: center;
        gap: ${tokens.size[1.5]};
        max-width: 160px;
        border: 1px solid ${colors.darkGray[200]};
        cursor: pointer;
        &:hover {
          background-color: ${colors.darkGray[500]};
        }
        & svg {
          width: ${tokens.size[4]};
          height: ${tokens.size[4]};
        }
      }
    `,
    overflowQueryContainer: css`
      flex: 1;
      overflow-y: auto;
      & > div {
        display: flex;
        flex-direction: column;
      }
    `,
    queryRow: css`
      display: flex;
      align-items: center;
      padding: 0;
      background-color: inherit;
      border: none;
      cursor: pointer;

      &:hover .SQDQueryHash {
        background-color: ${colors.darkGray[600]};
      }

      & .SQDObserverCount {
        user-select: none;
        width: ${tokens.size[8]};
        align-self: stretch !important;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${font.size.sm};
        font-weight: ${font.weight.medium};
        border-bottom: 1px solid ${colors.darkGray[700]};
      }
      & .SQDQueryHash {
        user-select: text;
        font-size: ${font.size.sm};
        display: flex;
        align-items: center;
        min-height: ${tokens.size[8]};
        flex: 1;
        padding: ${tokens.size[1]} ${tokens.size[2]};
        font-family: 'Menlo', 'Fira Code', monospace !important;
        border-bottom: 1px solid ${colors.darkGray[400]};
        text-align: left;
        text-overflow: clip;
      }

      & .SQDQueryDisabled {
        align-self: stretch;
        align-self: stretch !important;
        display: flex;
        align-items: center;
        padding: 0 ${tokens.size[3]};
        color: ${colors.gray[300]};
        background-color: ${colors.darkGray[600]};
        border-bottom: 1px solid ${colors.darkGray[400]};
      }
    `,
    detailsContainer: css`
      flex: 1 1 700px;
      background-color: ${colors.darkGray[700]};
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      display: flex;
    `,
    detailsHeader: css`
      position: sticky;
      top: 0;
      z-index: 1;
      background-color: ${colors.darkGray[600]};
      padding: ${tokens.size[2]} ${tokens.size[2]};
      font-weight: ${font.weight.medium};
      font-size: ${font.size.sm};
    `,
    detailsBody: css`
      margin: ${tokens.size[2]} 0px ${tokens.size[3]} 0px;
      & > div {
        display: flex;
        align-items: stretch;
        padding: 0 ${tokens.size[2]};
        line-height: ${font.lineHeight.sm};
        justify-content: space-between;
        & > span {
          font-size: ${font.size.sm};
        }
        & > span:nth-child(2) {
          font-variant-numeric: tabular-nums;
        }
      }

      & > div:first-child {
        margin-bottom: ${tokens.size[2]};
      }

      & code {
        font-family: 'Menlo', 'Fira Code', monospace !important;
        margin: 0;
        font-size: ${font.size.sm};
        line-height: ${font.lineHeight.sm};
      }
    `,
    queryDetailsStatus: css`
      border: 1px solid ${colors.darkGray[200]};
      border-radius: ${tokens.border.radius.md};
      font-weight: ${font.weight.medium};
      padding: ${tokens.size[1]} ${tokens.size[2.5]};
    `,
    actionsBody: css`
      flex-wrap: wrap;
      margin: ${tokens.size[3]} 0px ${tokens.size[3]} 0px;
      display: flex;
      gap: ${tokens.size[2]};
      padding: 0px ${tokens.size[2]};
      & > button {
        font-size: ${font.size.sm};
        padding: ${tokens.size[2]} ${tokens.size[2]};
        display: flex;
        border-radius: ${tokens.border.radius.md};
        border: 1px solid ${colors.darkGray[400]};
        background-color: ${colors.darkGray[600]};
        align-items: center;
        gap: ${tokens.size[2]};
        font-weight: ${font.weight.medium};
        line-height: ${font.lineHeight.sm};
        cursor: pointer;

        &:hover {
          background-color: ${colors.darkGray[500]};
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        & > span {
          width: ${size[2]};
          height: ${size[2]};
          border-radius: ${tokens.border.radius.full};
        }
      }
    `,
  }
}
