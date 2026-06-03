"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { FieldValues, Path, useController, useFormContext } from "react-hook-form";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import type { CategoryTreeNode } from "@/lib/category-options";
import { cn } from "@/lib/utils";

type CategoryTreeFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  nodes: CategoryTreeNode[];
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

type ExpandedState = {
  expandedIds: Set<string>;
  collapsedRootIds: Set<string>;
};

export function CategoryTreeField<T extends FieldValues>({
  name,
  label,
  nodes,
  id,
  placeholder = "Select category",
  disabled,
  className,
  allowEmpty,
  emptyLabel = "None",
}: CategoryTreeFieldProps<T>) {
  const form = useFormContext<T>();
  const { field, fieldState } = useController({ name, control: form.control });
  const treeId = id ?? name;
  const [expandedState, setExpandedState] = useState<ExpandedState>({
    expandedIds: new Set(),
    collapsedRootIds: new Set(),
  });

  const selectedCategory = useMemo(
    () => findCategoryName(nodes, typeof field.value === "string" ? field.value : ""),
    [field.value, nodes],
  );

  const toggleExpanded = (categoryId: string, isRoot: boolean, isExpanded: boolean) => {
    setExpandedState((current) => {
      const expandedIds = new Set(current.expandedIds);
      const collapsedRootIds = new Set(current.collapsedRootIds);

      if (isExpanded) {
        expandedIds.delete(categoryId);
        if (isRoot) collapsedRootIds.add(categoryId);
      } else {
        expandedIds.add(categoryId);
        if (isRoot) collapsedRootIds.delete(categoryId);
      }

      return { expandedIds, collapsedRootIds };
    });
  };

  return (
    <div className={className ?? "space-y-2"}>
      <Label htmlFor={treeId}>{label}</Label>
      <input {...field} type="hidden" id={treeId} value={field.value ?? ""} />
      <div
        className={cn(
          "rounded-md border border-slate-200 bg-white p-2 text-sm",
          "focus-within:ring-2 focus-within:ring-slate-400",
          disabled ? "cursor-not-allowed opacity-60" : null,
        )}
      >
        <div className="mb-2 rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
          {selectedCategory ?? placeholder}
        </div>
        {nodes.length ? (
          <div aria-label={label} className="max-h-64 overflow-y-auto" role="tree">
            {allowEmpty ? (
              <button
                type="button"
                className={cn(
                  "mb-1 w-full rounded-md px-3 py-2 text-left transition-colors",
                  !field.value ? "bg-slate-900 font-medium text-white" : "text-slate-700 hover:bg-slate-100",
                )}
                disabled={disabled}
                onClick={() => {
                  field.onChange("");
                  field.onBlur();
                }}
              >
                {emptyLabel}
              </button>
            ) : null}
            {nodes.map((node) => (
              <CategoryTreeItem
                key={node.category.id}
                node={node}
                selectedId={typeof field.value === "string" ? field.value : ""}
                expandedState={expandedState}
                disabled={disabled}
                depth={0}
                onSelect={(categoryId) => {
                  field.onChange(categoryId);
                  field.onBlur();
                }}
                onToggle={toggleExpanded}
              />
            ))}
          </div>
        ) : (
          <p className="px-3 py-2 text-sm text-slate-500">{placeholder}</p>
        )}
      </div>
      <FormMessage>{fieldState.error?.message}</FormMessage>
    </div>
  );
}

function CategoryTreeItem({
  node,
  selectedId,
  expandedState,
  disabled,
  depth,
  onSelect,
  onToggle,
}: {
  node: CategoryTreeNode;
  selectedId: string;
  expandedState: ExpandedState;
  disabled?: boolean;
  depth: number;
  onSelect: (categoryId: string) => void;
  onToggle: (categoryId: string, isRoot: boolean, isExpanded: boolean) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isRoot = depth === 0;
  const isExpanded = expandedState.expandedIds.has(node.category.id) || (isRoot && !expandedState.collapsedRootIds.has(node.category.id));
  const isSelected = selectedId === node.category.id;

  return (
    <div role="none">
      <div className="flex items-center gap-1" role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected}>
        <button
          type="button"
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500",
            hasChildren && !disabled ? "hover:bg-slate-100 hover:text-slate-900" : null,
          )}
          disabled={!hasChildren || disabled}
          onClick={() => onToggle(node.category.id, isRoot, isExpanded)}
          aria-label={isExpanded ? `Collapse ${node.category.name}` : `Expand ${node.category.name}`}
          style={{ marginLeft: depth * 16 }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          )}
        </button>
        <button
          type="button"
          className={cn(
            "min-w-0 flex-1 rounded-md px-3 py-2 text-left transition-colors",
            isSelected ? "bg-slate-900 font-medium text-white" : "text-slate-700 hover:bg-slate-100",
          )}
          disabled={disabled}
          onClick={() => onSelect(node.category.id)}
        >
          <span className="block truncate">{node.category.name}</span>
        </button>
      </div>
      {hasChildren && isExpanded ? (
        <div role="group">
          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.category.id}
              node={child}
              selectedId={selectedId}
              expandedState={expandedState}
              disabled={disabled}
              depth={depth + 1}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function findCategoryName(nodes: CategoryTreeNode[], categoryId: string): string | undefined {
  for (const node of nodes) {
    if (node.category.id === categoryId) return node.category.name;

    const child = findCategoryName(node.children, categoryId);
    if (child) return child;
  }

  return undefined;
}
