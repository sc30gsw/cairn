import { expect, test } from "vite-plus/test";

import schema from "./schema";

type ExportedTable = {
  indexes: { fields: string[]; indexDescriptor: string }[];
  tableName: string;
};

const CREATION_TIME_ORDER_INDEXES = new Set(["notifications.by_owner"]);

function isStrictPrefix(shorter: readonly string[], longer: readonly string[]): boolean {
  return shorter.length < longer.length && shorter.every((field, index) => field === longer[index]);
}

test("インデックスは別のインデックスの接頭辞にならない（_creationTime 順で読む by_owner だけが例外）", () => {
  const exported = (schema as unknown as { export(): string }).export();
  const { tables } = JSON.parse(exported) as { tables: ExportedTable[] };
  const redundant: string[] = [];
  for (const table of tables) {
    for (const index of table.indexes) {
      if (CREATION_TIME_ORDER_INDEXES.has(`${table.tableName}.${index.indexDescriptor}`)) {
        continue;
      }
      for (const other of table.indexes) {
        if (isStrictPrefix(index.fields, other.fields)) {
          redundant.push(`${table.tableName}.${index.indexDescriptor} ⊂ ${other.indexDescriptor}`);
        }
      }
    }
  }
  expect(redundant).toEqual([]);
});
