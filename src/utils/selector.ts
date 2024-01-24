import { CommonSelector, CommonTransform } from '@gkd-kit/selector';
import type { RawNode } from './types';

const transform = new CommonTransform<RawNode>(
  (node, name) => {
    const [key, subKey] = name.split('.');
    if (subKey) {
      // @ts-ignore
      return node.attr[key]?.[subKey];
    }
    // @ts-ignore
    return node.attr[key];
  },
  (node) => node.attr.name,
  (node) => node.children,
  (node) => node.parent,
);

export type Selector = {
  tracks: boolean[];
  trackIndex: number;
  connectKeys: string[];
  canQf: boolean;
  qfIdValue: string | null | undefined;
  qfVidValue: string | null | undefined;
  qfTextValue: string | null | undefined;
  canCopy: boolean;
  toString: () => string;
  match: (node: RawNode) => RawNode | undefined;
  querySelectorAll: (node: RawNode) => RawNode[];
  querySelectorTrackAll: (node: RawNode) => RawNode[][];
};

export const parseSelector = (source: string): Selector => {
  const cs = CommonSelector.Companion.parse(source);
  const selector: Selector = {
    tracks: cs.tracks,
    trackIndex: cs.trackIndex,
    connectKeys: cs.connectKeys,
    canQf: cs.canQf,
    qfIdValue: cs.qfIdValue,
    qfVidValue: cs.qfVidValue,
    qfTextValue: cs.qfTextValue,
    canCopy: cs.propertyNames.every((name) => allowPropertyNames.has(name)),
    toString: () => cs.toString(),
    match: (node) => {
      return cs.match(node, transform) ?? void 0;
    },
    querySelectorAll: (node) => {
      return transform.querySelectorAll(node, cs);
    },
    querySelectorTrackAll: (node) => {
      return transform.querySelectorTrackAll(node, cs);
    },
  };
  return selector;
};

export const checkSelector = (source: string) => {
  return CommonSelector.Companion.parseOrNull(source) != null;
};

const allowPropertyNames = new Set([
  'id',
  'vid',

  'name',
  'text',
  'text.length',
  'desc',
  'desc.length',

  'clickable',
  'focusable',
  'checkable',
  'checked',
  'editable',
  'longClickable',
  'visibleToUser',

  'left',
  'top',
  'right',
  'bottom',
  'width',
  'height',

  'index',
  'depth',
  'childCount',
]);
