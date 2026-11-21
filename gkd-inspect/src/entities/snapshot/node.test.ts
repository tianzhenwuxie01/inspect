import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { RawAttr, RawNode } from './types';
import {
  findNodesByXy,
  getNodeLabel,
  getLimitLabel,
  getNodeSelectorText,
  getNodeStyle,
  getNodeQf,
  listToTree,
  traverseNode,
} from './node';

const attr = (index: number, depth: number, childCount = 0): RawAttr => ({
  name: childCount ? 'android.widget.FrameLayout' : 'android.widget.TextView',
  index,
  depth,
  childCount,
  isClickable: false,
  left: 0,
  top: 0,
  right: 100,
  bottom: 100,
  width: 100,
  height: 100,
});

test('new snapshot nullAttr keeps its original tree position without creating fake attributes', () => {
  const nodes: RawNode[] = JSON.parse(
    JSON.stringify([
      { id: 0, pid: -1, attr: attr(0, 0, 3) },
      { id: 1, pid: 0, attr: attr(0, 1) },
      { id: 2, pid: 0, nullAttr: { index: 1 } },
      { id: 3, pid: 0, attr: attr(2, 1) },
    ]),
  );
  const tree = listToTree(nodes);
  const gap = tree.children[1];
  assert.equal(gap.parent, tree);
  assert.equal(Object.hasOwn(gap, 'attr'), false);
  assert.deepEqual(gap.nullAttr, { index: 1 });
  assert.equal(gap.children.length, 0);
  assert.deepEqual(
    [...traverseNode(tree)].map((n) => n.id),
    [0, 1, 2, 3],
  );
  assert.equal(tree.children[2].attr?.index, 2);
  assert.equal(tree.children[2].attr?.depth, 1);
  assert.equal(getNodeLabel(gap), 'NULL · index=1');
  assert.equal(getLimitLabel(gap), 'NULL · index=1');
  assert.equal(getNodeSelectorText(gap), '');
  assert.equal(getNodeQf(gap), false);
  assert.equal(getNodeStyle(gap, gap).color, '#00F');
  assert.equal(
    findNodesByXy(nodes, { x: 50, y: 50 }).some((n) => n.id === 2),
    false,
  );
});

test('legacy real nodes still receive missing indices, depth and virtual identity', () => {
  const nodes: RawNode[] = JSON.parse(
    JSON.stringify([
      { id: 0, pid: -1, attr: { name: 'Root', childCount: 1 } },
      { id: 1, pid: 0, attr: { name: 'TextView', childCount: 0 } },
    ]),
  );
  const tree = listToTree(nodes);
  assert.equal(tree.children[0].attr?.index, 0);
  assert.equal(tree.children[0].attr?.depth, 1);
  assert.equal(tree.children[0].attr?._id, 1);
  assert.equal(tree.children[0].attr?._pid, 0);
  assert.equal(Object.hasOwn(tree.children[0], 'nullAttr'), false);
  assert.equal(
    getNodeSelectorText(tree.children[0]),
    '@TextView < [parent=null]',
  );
});

test('ambiguous or missing snapshot node attributes are rejected instead of fabricating a real node', () => {
  for (const data of [
    { id: 0, pid: -1 },
    { id: 0, pid: -1, attr: attr(0, 0), nullAttr: { index: 0 } },
  ])
    assert.throws(
      () => listToTree(JSON.parse(JSON.stringify([data]))),
      /attr.*nullAttr/,
    );
});
