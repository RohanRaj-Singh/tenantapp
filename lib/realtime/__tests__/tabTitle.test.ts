import { test } from "node:test";
import assert from "node:assert/strict";
import {
  composeTabTitle,
  setTabTitleBase,
  setTabTitleUnread,
  stripUnreadPrefix,
  withUnreadPrefix,
} from "../tabTitle";

test("stripUnreadPrefix removes an existing (N) prefix", () => {
  assert.equal(stripUnreadPrefix("(8) Dashboard"), "Dashboard");
});

test("stripUnreadPrefix removes a (N+) prefix", () => {
  assert.equal(stripUnreadPrefix("(99+) Dashboard"), "Dashboard");
});

test("stripUnreadPrefix leaves clean titles untouched", () => {
  assert.equal(stripUnreadPrefix("Dashboard"), "Dashboard");
});

test("withUnreadPrefix replaces an existing count instead of appending", () => {
  assert.equal(withUnreadPrefix(9, "(8) Dashboard"), "(9) Dashboard");
});

test("withUnreadPrefix is idempotent — repeated application never accumulates", () => {
  const once = withUnreadPrefix(9, "Dashboard");
  assert.equal(once, "(9) Dashboard");
  assert.equal(withUnreadPrefix(9, once), "(9) Dashboard");
});

test("withUnreadPrefix never stacks prefixes even from a polluted base", () => {
  assert.equal(withUnreadPrefix(10, "(9) (8) Dashboard"), "(10) Dashboard");
});

test("withUnreadPrefix caps the displayed count at 99+", () => {
  assert.equal(withUnreadPrefix(120, "Dashboard"), "(99+) Dashboard");
});

test("withUnreadPrefix with zero returns the clean base title", () => {
  assert.equal(withUnreadPrefix(0, "(8) Dashboard"), "Dashboard");
  assert.equal(withUnreadPrefix(0, "Dashboard"), "Dashboard");
});

test("withUnreadPrefix with a negative count returns the clean base title", () => {
  assert.equal(withUnreadPrefix(-1, "(8) Dashboard"), "Dashboard");
});

test("composeTabTitle layers the unread prefix over the tenant name", () => {
  assert.equal(composeTabTitle("Omantel", 3), "(3) Omantel");
  assert.equal(composeTabTitle("Omantel", 0), "Omantel");
});

type FakeDocument = { title: string };

function withFakeDocument(run: (doc: FakeDocument) => void): void {
  const globalScope = globalThis as unknown as { document?: FakeDocument };
  const doc: FakeDocument = { title: "" };
  const previous = globalScope.document;
  globalScope.document = doc;
  try {
    run(doc);
  } finally {
    if (previous === undefined) {
      delete globalScope.document;
    } else {
      globalScope.document = previous;
    }
  }
}

test("tab-title store shows the tenant name when there are no unread notifications", () => {
  withFakeDocument((doc) => {
    setTabTitleBase("Alpha Corp");
    setTabTitleUnread(0);
    assert.equal(doc.title, "Alpha Corp");
  });
});

test("tab-title store layers the count over the tenant name and keeps both in sync", () => {
  withFakeDocument((doc) => {
    setTabTitleBase("Beta Corp");
    setTabTitleUnread(4);
    assert.equal(doc.title, "(4) Beta Corp");
    // A tenant-name change (config load / language switch) preserves the prefix.
    setTabTitleBase("Beta Corp Two");
    assert.equal(doc.title, "(4) Beta Corp Two");
    // Marking all read drops the prefix.
    setTabTitleUnread(0);
    assert.equal(doc.title, "Beta Corp Two");
  });
});

test("tab-title store never writes a bare prefix before the tenant name is known", () => {
  withFakeDocument((doc) => {
    setTabTitleBase("");
    setTabTitleUnread(7);
    assert.equal(doc.title, "");
  });
});

test("tab-title store caps the displayed count at 99+", () => {
  withFakeDocument((doc) => {
    setTabTitleBase("Gamma Corp");
    setTabTitleUnread(120);
    assert.equal(doc.title, "(99+) Gamma Corp");
  });
});

test("tab-title store clamps negative and fractional counts", () => {
  withFakeDocument((doc) => {
    setTabTitleBase("Delta Corp");
    setTabTitleUnread(-5);
    assert.equal(doc.title, "Delta Corp");
    setTabTitleUnread(2.7);
    assert.equal(doc.title, "(2) Delta Corp");
  });
});