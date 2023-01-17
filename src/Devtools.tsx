import {
  Accessor,
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import { css, cx } from "@emotion/css";
import { tokens } from "./theme";
import { Query, QueryCache, useQueryClient, onlineManager } from "@tanstack/solid-query";
import {
  getQueryStatusLabel,
  getQueryStatusColor,
  queryStatusLabels,
  IQueryStatusLabel,
  displayValue,
  getQueryStatusColorByLabel,
} from "./utils";
import { ArrowUp, ChevronDown, Offline, Search, Settings, Wifi } from "./icons";
import Explorer from "./Explorer";

const [selectedStatus, setSelectedStatus] = createSignal<ReturnType<
  typeof getQueryStatusLabel
> | null>(null);
const [selectedQueryHash, setSelectedQueryHash] = createSignal<string | null>(null);

export const DevtoolsPanel: Component = () => {
  const styles = getStyles();
  const queryClient = useQueryClient();
  const queryCache = queryClient.getQueryCache();

  const queryCount = createSubscribeToQueryCache(queryCache, () => {
    const curr = queryCache.getAll();
    const res: { [K in IQueryStatusLabel]?: number } = {};
    for (const label of queryStatusLabels) {
      res[label] = curr.filter((e) => getQueryStatusLabel(e) === label).length;
    }
    return res;
  });

  const queries = createMemo(
    on(
      () => [queryCount(), selectedStatus()],
      () => {
        const curr = queryCache.getAll();
        const status = selectedStatus();
        return status === null ? curr : curr.filter((e) => getQueryStatusLabel(e) === status);
      },
    ),
  );

  const [offline, setOffline] = createSignal(false);

  return (
    <aside class={styles.panel}>
      <div class={styles.queriesContainer}>
        <div class={styles.row}>
          <button>
            <span class={styles.tanstackLogo}>TANSTACK</span>
            <span class={styles.solidQueryLogo}>Solid Query v5</span>
          </button>
          <QueryStatusCount />
        </div>
        <div class={styles.row}>
          <div class={styles.filtersContainer}>
            <div class={styles.filterInput}>
              <Search />
              <input type="text" placeholder="Filter" />
            </div>
            <div class={styles.filterSelect}>
              <select>
                <option>Sort by status</option>
                <option>Sort by query hash</option>
                <option>Sort by last updated</option>
              </select>
              <ChevronDown />
            </div>
            <button>
              <span>Asc</span>
              <ArrowUp />
            </button>
          </div>

          <div class={styles.actionsContainer}>
            <button
              onClick={() => {
                if (offline()) {
                  onlineManager.setOnline(undefined);
                  setOffline(false);
                  window.dispatchEvent(new Event("online"));
                } else {
                  onlineManager.setOnline(false);
                  setOffline(true);
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
            <For each={queries()}>{(query) => <QueryRow query={query} />}</For>
          </div>
        </div>
      </div>
      <Show when={selectedQueryHash()}>
        <QueryDetails />
      </Show>
    </aside>
  );
};

export const QueryRow: Component<{ query: Query }> = (props) => {
  const styles = getStyles();
  const queryClient = useQueryClient();
  const queryCache = queryClient.getQueryCache();

  const queryState = createSubscribeToQueryCache(
    queryCache,
    () =>
      queryCache.find({
        queryKey: props.query.queryKey,
      })?.state,
  );

  const isStale = createSubscribeToQueryCache(
    queryCache,
    () =>
      queryCache
        .find({
          queryKey: props.query.queryKey,
        })
        ?.isStale() ?? false,
  );

  const isDisabled = createSubscribeToQueryCache(
    queryCache,
    () =>
      queryCache
        .find({
          queryKey: props.query.queryKey,
        })
        ?.isDisabled() ?? false,
  );

  const observers = createSubscribeToQueryCache(
    queryCache,
    () =>
      queryCache
        .find({
          queryKey: props.query.queryKey,
        })
        ?.getObserversCount() ?? 0,
  );

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
            "SQDObserverCount",
            css`
              background-color: ${tokens.colors[
                getQueryStatusColor({
                  queryState: queryState()!,
                  observerCount: observers(),
                  isStale: isStale(),
                })
              ][900]};
              color: ${tokens.colors[
                getQueryStatusColor({
                  queryState: queryState()!,
                  observerCount: observers(),
                  isStale: isStale(),
                })
              ][300]};
            `,
          )}
        >
          {observers()}
        </div>
        <code class="SQDQueryHash">{props.query.queryHash}</code>
      </button>
    </Show>
  );
};

export const QueryStatusCount: Component = () => {
  const queryClient = useQueryClient();
  const queryCache = queryClient.getQueryCache();

  const stale = createSubscribeToQueryCache(
    queryCache,
    () => queryCache.getAll().filter((q) => getQueryStatusLabel(q) === "stale").length,
  );

  const fresh = createSubscribeToQueryCache(
    queryCache,
    () => queryCache.getAll().filter((q) => getQueryStatusLabel(q) === "fresh").length,
  );

  const fetching = createSubscribeToQueryCache(
    queryCache,
    () => queryCache.getAll().filter((q) => getQueryStatusLabel(q) === "fetching").length,
  );

  const paused = createSubscribeToQueryCache(
    queryCache,
    () => queryCache.getAll().filter((q) => getQueryStatusLabel(q) === "paused").length,
  );

  const inactive = createSubscribeToQueryCache(
    queryCache,
    () => queryCache.getAll().filter((q) => getQueryStatusLabel(q) === "inactive").length,
  );

  const styles = getStyles();

  return (
    <div class={styles.queryStatusContainer}>
      <QueryStatus label="Fresh" color="green" count={fresh()} />
      <QueryStatus label="Fetching" color="blue" count={fetching()} />
      <QueryStatus label="Paused" color="purple" count={paused()} />
      <QueryStatus label="Stale" color="yellow" count={stale()} />
      <QueryStatus label="Inactive" color="gray" count={inactive()} />
    </div>
  );
};

interface QueryStatusProps {
  label: string;
  color: "green" | "yellow" | "gray" | "blue" | "purple";
  count: number;
}

export const QueryStatus: Component<QueryStatusProps> = (props) => {
  const styles = getStyles();

  return (
    <button
      onClick={() =>
        setSelectedStatus((prev) =>
          prev === props.label.toLowerCase() ? null : (props.label.toLowerCase() as any),
        )
      }
      class={cx(
        styles.queryStatusTag,
        selectedStatus() === props.label.toLowerCase()
          ? props.color === "gray"
            ? css`
                outline: ${tokens.colors[props.color][600]} 2px solid;
              `
            : css`
                outline: ${tokens.colors[props.color][800]} 2px solid;
              `
          : null,
      )}
    >
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
          props.count > 0 &&
            props.color !== "gray" &&
            css`
              background-color: ${tokens.colors[props.color][900]};
              color: ${tokens.colors[props.color][300]};
            `,
        )}
      >
        {props.count}
      </span>
    </button>
  );
};

const createSubscribeToQueryCache = <T,>(
  queryCache: QueryCache,
  callback: () => Exclude<T, Function>,
): Accessor<T> => {
  const [value, setValue] = createSignal<T>(callback());

  const unsub = queryCache.subscribe(() => {
    setValue(callback());
  });

  createEffect(() => {
    setValue(callback());
  });

  onCleanup(() => {
    unsub();
  });

  return value;
};

const getStyles = () => {
  const { colors, font, size } = tokens;

  return {
    panel: css`
      position: fixed;
      bottom: 0;
      right: 0;
      left: 0;
      height: 500px;
      background-color: ${colors.darkGray[800]};
      border-top: ${colors.darkGray[300]} 1px solid;
      display: flex;
      gap: ${tokens.size[0.5]};
      & * {
        font-family: "Inter", sans-serif;
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
      cursor: pointer;
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
      & .SQDObserverCount {
        user-select: none;
        width: ${tokens.size[8]};
        height: ${tokens.size[8]};
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
        height: ${tokens.size[8]};
        flex: 1;
        padding: 0 ${tokens.size[2]};
        font-family: "Menlo", "Fira Code", monospace;
        border-bottom: 1px solid ${colors.darkGray[400]};

        &:hover {
          background-color: ${colors.darkGray[600]};
        }
      }
    `,
    detailsContainer: css`
      flex: 1 1 550px;
      background-color: ${colors.darkGray[700]};
      display: flex;
      flex-direction: column;
      max-width: 600px;
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

      & pre {
        font-family: "Menlo", "Fira Code", monospace;
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
        cursor: pointer;

        &:hover {
          background-color: ${colors.darkGray[500]};
        }

        & > span {
          width: ${size[2]};
          height: ${size[2]};
          border-radius: ${tokens.border.radius.full};
        }
      }
    `,
  };
};

const QueryDetails = () => {
  const queryClient = useQueryClient();
  const queryCache = queryClient.getQueryCache();
  const styles = getStyles();

  const activeQuery = createSubscribeToQueryCache(queryCache, () =>
    queryCache.getAll().find((query) => query.queryHash === selectedQueryHash()),
  );

  const activeQueryFresh = createSubscribeToQueryCache(queryCache, () => {
    const query = queryCache.getAll().find((query) => query.queryHash === selectedQueryHash());
    if (!query) return undefined;
    return { ...query, state: { ...query.state } };
  });

  const activeQueryState = createSubscribeToQueryCache(
    queryCache,
    () => queryCache.getAll().find((query) => query.queryHash === selectedQueryHash())?.state,
  );

  const activeQueryStateData = createSubscribeToQueryCache(
    queryCache,
    () => queryCache.getAll().find((query) => query.queryHash === selectedQueryHash())?.state.data,
  );

  const statusLabel = createSubscribeToQueryCache(queryCache, () => {
    const query = queryCache.getAll().find((query) => query.queryHash === selectedQueryHash());
    if (!query) return "inactive";
    return getQueryStatusLabel(query);
  });

  const isStale = createSubscribeToQueryCache(
    queryCache,
    () =>
      queryCache
        .getAll()
        .find((query) => query.queryHash === selectedQueryHash())
        ?.isStale() ?? false,
  );

  const observerCount = createSubscribeToQueryCache(
    queryCache,
    () =>
      queryCache
        .getAll()
        .find((query) => query.queryHash === selectedQueryHash())
        ?.getObserversCount() ?? 0,
  );

  return (
    <Show when={activeQuery() && activeQueryState()}>
      <div class={styles.detailsContainer}>
        <div class={styles.detailsHeader}>Query Details</div>
        <div class={styles.detailsBody}>
          <div>
            <code>
              <pre>{displayValue(activeQuery()!.queryKey, true)}</pre>
            </code>
            <span
              class={cx(
                styles.queryDetailsStatus,
                css`
                  background-color: ${tokens.colors[
                    getQueryStatusColorByLabel(statusLabel())
                  ][900]};
                  color: ${tokens.colors[getQueryStatusColorByLabel(statusLabel())][300]};
                  border-color: ${tokens.colors[getQueryStatusColorByLabel(statusLabel())][600]};
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
              color: ${tokens.colors.red[400]};
            `}
          >
            <span
              class={css`
                background-color: ${tokens.colors.red[400]};
              `}
            ></span>
            Remove
          </button>
        </div>
        <div class={styles.detailsHeader}>Data Explorer</div>
        <div
          style={{
            padding: "0.5rem",
          }}
        >
          <Explorer label="Data" value={activeQueryStateData()} defaultExpanded={{}} copyable />
        </div>
        <div class={styles.detailsHeader}>Query Explorer</div>
        <div
          style={{
            padding: "0.5rem",
          }}
        >
          <Explorer
            label="Query"
            value={activeQueryFresh()}
            defaultExpanded={{
              queryKey: true,
            }}
          />
        </div>
      </div>
    </Show>
  );
};
