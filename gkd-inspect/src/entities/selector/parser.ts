import type { AttrNode, RawNode } from '@/entities/snapshot/types';
import {
  createDefaultSelectorTypeModel,
  JsNodeAdapter,
  MatchOptions,
  Selector,
  SelectorCompileResult,
  type SelectorMatch,
  type SelectorPosition,
  type SelectorToken,
} from '@gkd-kit/selector';
import { isAttrNode } from '../snapshot/node.ts';

class SnapshotNodeAdapter extends JsNodeAdapter<AttrNode> {
  getAttr(target: unknown, name: string) {
    if (!isAttrNode(target)) return null;
    if (name === '_id') return target.id;
    if (name === '_pid') return target.pid;
    if (name === 'parent') return target.parent ?? null;
    return Reflect.get(target.attr, name) ?? null;
  }

  getInvoke(target: unknown, name: string, args: unknown[]) {
    if (!isAttrNode(target) || name !== 'getChild') return null;
    const index = args[0];
    return typeof index === 'number' && Number.isSafeInteger(index)
      ? this.getChild(target, index)
      : null;
  }

  getName(node: AttrNode) {
    return node.attr.name;
  }
  getChildCount(node: AttrNode) {
    return node.children.length;
  }
  getChild(node: AttrNode, index: number) {
    const child = node.children[index];
    return child?.attr ? child : null;
  }
  getParent(node: AttrNode) {
    return node.parent?.attr ? node.parent : null;
  }
  getNodeKey(node: AttrNode) {
    return node.id;
  }
}

const adapter = new SnapshotNodeAdapter();
const typeModel = createDefaultSelectorTypeModel(true);
const matchOptions = new MatchOptions(false);

export interface ResolvedSelector {
  source: string;
  value: Selector;
  tokens: SelectorToken[];
  positions: SelectorPosition[];
  canCopy: boolean;
  toString: () => string;
  match: (node: RawNode) => AttrNode | undefined;
  querySelfOrSelectorAll: (node: RawNode | undefined) => AttrNode[];
  querySelfOrSelectorAllWithTrace: (
    node: RawNode | undefined,
  ) => SelectorMatch<AttrNode>[];
}

export const normalizeSelectorErrorIndex = (
  source: string,
  index: unknown,
): number | undefined => {
  if (typeof index !== 'number' || !Number.isFinite(index)) return undefined;
  return Math.min(Math.max(Math.trunc(index), 0), source.length);
};

const uniqueTargets = <T>(items: T[], getNode: (item: T) => RawNode): T[] => {
  const ids = new Set<number>();
  return items.filter((item) => {
    const id = getNode(item).id;
    if (ids.has(id)) return false;
    ids.add(id);
    return true;
  });
};

export const parseSelector = (source: string): ResolvedSelector => {
  const parsed = Selector.parse(source);
  const value = parsed.value.validateType(typeModel).value;
  return {
    source,
    value,
    tokens: parsed.tokens,
    positions: parsed.positions,
    canCopy: !parsed.tokens.some(
      (token) =>
        token.kind.name === 'Identifier' &&
        token.scope.name === 'Property' &&
        source.slice(token.start, token.end).startsWith('_'),
    ),
    toString: () => value.toString(),
    match: (node) =>
      node.attr
        ? (adapter.match(node, value, matchOptions) ?? undefined)
        : undefined,
    querySelfOrSelectorAll(node) {
      if (!node?.attr) return [];
      const self = adapter.match(node, value, matchOptions);
      return uniqueTargets(
        [
          ...(self ? [self] : []),
          ...adapter.querySelectorAll(node, value, matchOptions),
        ],
        (target) => target,
      );
    },
    querySelfOrSelectorAllWithTrace(node) {
      if (!node?.attr) return [];
      const self = adapter.matchWithTrace(node, value, matchOptions);
      return uniqueTargets(
        [
          ...(self ? [self] : []),
          ...adapter.querySelectorAllWithTrace(node, value, matchOptions),
        ],
        (result) => result.target,
      );
    },
  };
};

export const checkSelector = (source: string) =>
  Selector.compile(source) instanceof SelectorCompileResult.Success;
