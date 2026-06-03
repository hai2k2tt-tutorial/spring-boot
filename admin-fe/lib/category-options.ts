import type { CategoryResponseVo } from "@/lib/types";

type CategorySelectOption = {
  label: string;
  value: string;
};

export type CategoryTreeNode = {
  category: CategoryResponseVo;
  children: CategoryTreeNode[];
  index: number;
};

function formatCategoryLabel(name: string, depth: number) {
  if (depth === 0) return name;

  return `${"|  ".repeat(depth - 1)}|-- ${name}`;
}

export function buildCategoryTreeOptions(categories: CategoryResponseVo[]): CategorySelectOption[] {
  const options: CategorySelectOption[] = [];

  walkCategoryTree(categories, (node, depth) => {
    options.push({
      label: formatCategoryLabel(node.category.name, depth),
      value: node.category.id,
    });
  });

  return options;
}

export function buildCategoryTree(categories: CategoryResponseVo[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>();

  categories.forEach((category, index) => {
    nodes.set(category.id, { category, children: [], index });
  });

  const roots: CategoryTreeNode[] = [];

  nodes.forEach((node) => {
    const parentId = node.category.parentId;
    const parent = parentId && parentId !== node.category.id ? nodes.get(parentId) : undefined;

    if (parent) {
      parent.children.push(node);
      return;
    }

    roots.push(node);
  });

  sortCategoryTree(roots);

  return roots;
}

export function walkCategoryTree(
  categories: CategoryResponseVo[],
  visit: (node: CategoryTreeNode, depth: number) => void,
) {
  const roots = buildCategoryTree(categories);
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const appendNode = (node: CategoryTreeNode, depth: number) => {
    if (visited.has(node.category.id) || visiting.has(node.category.id)) return;

    visiting.add(node.category.id);
    visit(node, depth);
    node.children.forEach((child) => appendNode(child, depth + 1));

    visiting.delete(node.category.id);
    visited.add(node.category.id);
  };

  roots.forEach((node) => appendNode(node, 0));
}

function sortCategoryTree(nodes: CategoryTreeNode[]) {
  nodes.sort((left, right) => left.index - right.index);
  nodes.forEach((node) => sortCategoryTree(node.children));
}
