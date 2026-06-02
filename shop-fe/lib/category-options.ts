import type { CategoryResponseVo } from "@/lib/types";

type CategorySelectOption = {
  label: string;
  value: string;
};

type CategoryNode = {
  category: CategoryResponseVo;
  children: CategoryNode[];
  index: number;
};

function formatCategoryLabel(name: string, depth: number) {
  if (depth === 0) return name;

  return `${"|  ".repeat(depth - 1)}|-- ${name}`;
}

export function buildCategoryTreeOptions(categories: CategoryResponseVo[]): CategorySelectOption[] {
  const nodes = new Map<string, CategoryNode>();

  categories.forEach((category, index) => {
    nodes.set(category.id, { category, children: [], index });
  });

  const roots: CategoryNode[] = [];

  nodes.forEach((node) => {
    const parentId = node.category.parentId;
    const parent = parentId && parentId !== node.category.id ? nodes.get(parentId) : undefined;

    if (parent) {
      parent.children.push(node);
      return;
    }

    roots.push(node);
  });

  const options: CategorySelectOption[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const appendNode = (node: CategoryNode, depth: number) => {
    if (visited.has(node.category.id) || visiting.has(node.category.id)) return;

    visiting.add(node.category.id);
    options.push({
      label: formatCategoryLabel(node.category.name, depth),
      value: node.category.id,
    });

    node.children
      .sort((left, right) => left.index - right.index)
      .forEach((child) => appendNode(child, depth + 1));

    visiting.delete(node.category.id);
    visited.add(node.category.id);
  };

  roots
    .sort((left, right) => left.index - right.index)
    .forEach((node) => appendNode(node, 0));

  nodes.forEach((node) => {
    if (!visited.has(node.category.id)) {
      appendNode(node, 0);
    }
  });

  return options;
}
