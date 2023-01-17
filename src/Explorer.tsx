import { displayValue } from "./utils";
import superjson from "superjson";
import { css, cx } from "@emotion/css";
import { tokens } from "./theme";
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Index,
  JSX,
  on,
  Show,
  splitProps,
} from "solid-js";
import { Key, Rerun } from "@solid-primitives/keyed";

type Entry = {
  label: string;
};

type RendererProps = {
  handleEntry: (entry: Entry) => JSX.Element;
  label?: string;
  value: unknown;
  subEntries: Entry[];
  subEntryPages: Entry[][];
  type: string;
  expanded: boolean;
  copyable: boolean;
  toggleExpanded: () => void;
  pageSize: number;
};

/**
 * Chunk elements in the array by size
 *
 * when the array cannot be chunked evenly by size, the last chunk will be
 * filled with the remaining elements
 *
 * @example
 * chunkArray(['a','b', 'c', 'd', 'e'], 2) // returns [['a','b'], ['c', 'd'], ['e']]
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  if (size < 1) return [];
  let i = 0;
  const result: T[][] = [];
  while (i < array.length) {
    result.push(array.slice(i, i + size));
    i = i + size;
  }
  return result;
}

type Renderer = (props: RendererProps) => JSX.Element;

const Expander = (props: { expanded: boolean }) => {
  const styles = getStyles();

  return (
    <span
      class={cx(
        styles.expander,
        css`
          transform: rotate(${props.expanded ? 90 : 0}deg);
        `,
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M6 12L10 8L6 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
  );
};

export const DefaultRenderer: Renderer = (props) => {
  const styles = getStyles();
  const [expandedPages, setExpandedPages] = createSignal<number[]>([]);

  createEffect(() => {
    console.log("rerender", props.subEntries, props);
  });

  return (
    <div class={styles.entry}>
      {props.subEntryPages.length ? (
        <>
          <button class={styles.expanderButton} onClick={() => props.toggleExpanded()}>
            <Expander expanded={props.expanded} /> <span>{props.label}</span>{" "}
            <span class={styles.info}>
              {String(props.type).toLowerCase() === "iterable" ? "(Iterable) " : ""}
              {props.subEntries.length} {props.subEntries.length > 1 ? `items` : `item`}
            </span>
          </button>

          {props.expanded ? (
            props.subEntryPages.length === 1 ? (
              <div class={styles.subEntry}>
                <Key by={(entry) => entry.label} each={props.subEntries}>
                  {(entry) => {
                    console.log("BLOOOOP");
                    return props.handleEntry(entry());
                  }}
                </Key>
              </div>
            ) : (
              <div class={styles.subEntry}>
                <Index each={props.subEntryPages}>
                  {(entries, index) => (
                    <div>
                      <div class={styles.entry}>
                        <button
                          onClick={() =>
                            setExpandedPages((old) =>
                              old.includes(index)
                                ? old.filter((d) => d !== index)
                                : [...old, index],
                            )
                          }
                          class={styles.expanderButton}
                        >
                          <Expander expanded={props.expanded} /> [{index * props.pageSize}...
                          {index * props.pageSize + props.pageSize - 1}]
                        </button>
                        <Show when={expandedPages().includes(index)}>
                          <div class={styles.subEntry}>
                            <Key by={(entry) => entry.label} each={entries()}>
                              {(entry) => props.handleEntry(entry())}
                            </Key>
                          </div>
                        </Show>
                      </div>
                    </div>
                  )}
                </Index>
              </div>
            )
          ) : null}
        </>
      ) : (
        <>
          <span class={styles.label}>{props.label}:</span>{" "}
          <span class={styles.value}>{displayValue(props.value)}</span>
        </>
      )}
    </div>
  );
};

type ExplorerProps = Partial<RendererProps> & {
  renderer?: Renderer;
  defaultExpanded?: true | Record<string, boolean>;
  copyable?: boolean;
};

type Property = {
  defaultExpanded?: boolean | Record<string, boolean>;
  label: string;
  value: unknown;
};

function isIterable(x: any): x is Iterable<unknown> {
  return Symbol.iterator in x;
}

export default function Explorer(props: ExplorerProps) {
  const [expanded, setExpanded] = createSignal(Boolean(props.defaultExpanded));
  const toggleExpanded = () => setExpanded((old) => !old);

  const makeProperty = (sub: { label: string; value: unknown }): Property => {
    const subDefaultExpanded =
      props.defaultExpanded === true ? { [sub.label]: true } : props.defaultExpanded?.[sub.label];
    return {
      ...sub,
      defaultExpanded: subDefaultExpanded,
    };
  };

  const subEntries = createMemo(
    on(
      () => props.value,
      () => {
        if (Array.isArray(props.value)) {
          return props.value.map((d, i) =>
            makeProperty({
              label: i.toString(),
              value: d,
            }),
          );
        } else if (
          props.value !== null &&
          typeof props.value === "object" &&
          isIterable(props.value) &&
          typeof props.value[Symbol.iterator] === "function"
        ) {
          return Array.from(props.value, (val, i) =>
            makeProperty({
              label: i.toString(),
              value: val,
            }),
          );
        } else if (typeof props.value === "object" && props.value !== null) {
          return Object.entries(props.value).map(([key, val]) =>
            makeProperty({
              label: key,
              value: val,
            }),
          );
        }
        return [];
      },
    ),
  );

  const type = createMemo<string>(() => {
    if (Array.isArray(props.value)) {
      return "array";
    } else if (
      props.value !== null &&
      typeof props.value === "object" &&
      isIterable(props.value) &&
      typeof props.value[Symbol.iterator] === "function"
    ) {
      return "Iterable";
    } else if (typeof props.value === "object" && props.value !== null) {
      return "object";
    }
    return typeof props.value;
  });

  const subEntryPages = createMemo(() => chunkArray(subEntries(), props.pageSize || 100));

  const [_, rest] = splitProps(props, [
    "value",
    "copyable",
    "defaultExpanded",
    "pageSize",
    "renderer",
  ]);

  const renderer = props.renderer || DefaultRenderer;

  return renderer({
    handleEntry: (entry) => (
      <Explorer
        value={props.value}
        renderer={props.renderer}
        copyable={props.copyable}
        {...rest}
        {...entry}
      />
    ),
    get type() {
      return type();
    },
    get subEntries() {
      return subEntries();
    },
    get subEntryPages() {
      return subEntryPages();
    },
    get value() {
      return props.value;
    },
    get expanded() {
      return expanded();
    },
    get copyable() {
      return props.copyable || false;
    },
    toggleExpanded,
    get pageSize() {
      return props.pageSize || 100;
    },
    ...rest,
  });
}

const getStyles = () => {
  const { colors, font, size } = tokens;

  return {
    entry: css`
      & * {
        font-size: ${font.size.sm};
        font-family: "Menlo", "Fira Code", monospace;
        line-height: 1.7;
      }

      outline: none;
      word-break: break-word;
    `,
    subEntry: css`
      margin: 0 0 0 0.5em;
      padding-left: 0.75em;
      border-left: 2px solid ${colors.darkGray[400]};
    `,
    expander: css`
      & path {
        stroke: ${colors.gray[400]};
      }
      display: inline-flex;
      align-items: center;
      transition: all 0.1s ease;
    `,
    expanderButton: css`
      cursor: pointer;
      color: inherit;
      font: inherit;
      outline: inherit;
      line-height: ${font.size.sm};
      background: transparent;
      border: none;
      padding: 0;
      display: inline-flex;
      align-items: center;
      gap: ${size[1]};
    `,
    info: css`
      color: ${colors.gray[500]};
      font-size: ${font.size.xs};
      line-height: ${font.size.xs};
      margin-left: ${size[1]};
    `,
    label: css`
      color: ${colors.gray[300]};
    `,
    value: css`
      color: ${colors.purple[400]};
    `,
  };
};
