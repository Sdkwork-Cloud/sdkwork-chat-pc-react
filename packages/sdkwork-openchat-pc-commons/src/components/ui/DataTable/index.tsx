import React, { useCallback, useMemo, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type {
  BaseComponentProps,
  SortChangeEvent,
  TableColumn,
  TablePagination,
  TableRowSelection,
} from "../../../types/common";

export interface DataTableProps<T = unknown> extends BaseComponentProps {
  columns: TableColumn<T>[];
  dataSource: T[];
  loading?: boolean;
  emptyText?: string;
  rowKey?: keyof T | ((record: T) => string);
  rowSelection?: TableRowSelection<T>;
  pagination?: TablePagination | false;
  onSortChange?: (event: SortChangeEvent) => void;
  onRowClick?: (record: T, index: number) => void;
  rowClassName?: string | ((record: T, index: number) => string);
  bordered?: boolean;
  striped?: boolean;
  size?: "default" | "small" | "large";
}

interface PaginationProps {
  pagination: TablePagination;
  onChange: (page: number, size: number) => void;
}

function buildPageNumbers(currentPage: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

const Pagination: React.FC<PaginationProps> = ({ pagination, onChange }) => {
  const { tr } = useAppTranslation();
  const {
    page = 1,
    size = 10,
    total = 0,
    pageSizeOptions = [10, 20, 50, 100],
    showQuickJumper = false,
    showTotal = true,
  } = pagination;

  const totalPages = Math.max(1, Math.ceil(total / size));
  const startItem = total === 0 ? 0 : (page - 1) * size + 1;
  const endItem = Math.min(page * size, total);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) {
      return;
    }

    onChange(nextPage, size);
  };

  const handleSizeChange = (nextSize: number) => {
    const nextPage = total === 0 ? 1 : Math.min(page, Math.ceil(total / nextSize));
    onChange(Math.max(1, nextPage), nextSize);
  };

  return (
    <div className="flex items-center justify-between border-t border-border bg-bg-secondary px-4 py-3">
      {showTotal ? (
        <div className="text-sm text-text-secondary">
          {tr("Total")} <span className="font-medium text-text-primary">{total}</span>
          {total > 0 ? (
            <span className="ml-1">
              {tr("(items {{start}}-{{end}})", { start: startItem, end: endItem })}
            </span>
          ) : null}
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center space-x-2">
        <select
          value={size}
          onChange={(event) => handleSizeChange(Number(event.target.value))}
          className="h-8 rounded border border-border bg-bg-tertiary px-2 text-sm text-text-primary focus:border-primary focus:outline-none"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option} className="bg-bg-secondary">
              {tr("{{count}} / page", { count: option })}
            </option>
          ))}
        </select>

        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
          className="rounded border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-text-primary transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {tr("Previous")}
        </button>

        <div className="flex items-center space-x-1">
          {buildPageNumbers(page, totalPages).map((pageNumber, index) =>
            pageNumber === "..." ? (
              <span key={`ellipsis-${index}`} className="px-2 text-text-muted">
                ...
              </span>
            ) : (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                className={`min-w-[32px] rounded px-2 py-1.5 text-sm transition-colors ${
                  page === pageNumber
                    ? "bg-primary text-white"
                    : "border border-border bg-bg-tertiary text-text-primary hover:border-primary hover:text-primary"
                }`}
              >
                {pageNumber}
              </button>
            ),
          )}
        </div>

        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-text-primary transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {tr("Next")}
        </button>

        {showQuickJumper ? (
          <div className="ml-4 flex items-center space-x-2">
            <span className="text-sm text-text-secondary">{tr("Go to")}</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }

                const value = Number((event.target as HTMLInputElement).value);
                if (Number.isFinite(value) && value >= 1 && value <= totalPages) {
                  handlePageChange(value);
                }
              }}
              className="h-8 w-12 rounded border border-border bg-bg-tertiary px-2 text-center text-sm text-text-primary focus:border-primary focus:outline-none"
            />
            <span className="text-sm text-text-secondary">{tr("page")}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  dataSource,
  loading = false,
  emptyText,
  rowKey = "id" as keyof T,
  rowSelection,
  pagination,
  onSortChange,
  onRowClick,
  rowClassName,
  bordered = false,
  striped = true,
  size = "default",
  className,
  style,
}: DataTableProps<T>) {
  const { tr } = useAppTranslation();
  const [sortState, setSortState] = useState<{ field: string; order: "asc" | "desc" | null }>({
    field: "",
    order: null,
  });

  const resolvedEmptyText = emptyText ?? tr("No data available.");

  const getRowKey = useCallback(
    (record: T): string => {
      if (typeof rowKey === "function") {
        return rowKey(record);
      }

      return String(record[rowKey]);
    },
    [rowKey],
  );

  const getCellValue = useCallback((record: T, dataIndex?: keyof T | string) => {
    if (!dataIndex) {
      return "";
    }

    return record[dataIndex as keyof T];
  }, []);

  const getRowClassName = useCallback(
    (record: T, index: number) => {
      const classes: string[] = [];

      if (striped && index % 2 === 1) {
        classes.push("bg-bg-tertiary/30");
      }

      if (onRowClick) {
        classes.push("cursor-pointer hover:bg-bg-tertiary");
      }

      if (rowClassName) {
        classes.push(typeof rowClassName === "function" ? rowClassName(record, index) : rowClassName);
      }

      return classes.join(" ");
    },
    [onRowClick, rowClassName, striped],
  );

  const sizeClasses = useMemo(() => {
    switch (size) {
      case "small":
        return { table: "text-xs", cell: "px-3 py-2" };
      case "large":
        return { table: "text-base", cell: "px-6 py-4" };
      default:
        return { table: "text-sm", cell: "px-4 py-3" };
    }
  }, [size]);

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) {
      return;
    }

    let nextOrder: "asc" | "desc" | null = "asc";
    if (sortState.field === column.key && sortState.order === "asc") {
      nextOrder = "desc";
    } else if (sortState.field === column.key && sortState.order === "desc") {
      nextOrder = null;
    }

    setSortState({ field: column.key, order: nextOrder });
    onSortChange?.({ field: column.key, order: nextOrder });
  };

  return (
    <div className={`flex flex-col ${className || ""}`} style={style}>
      <div className="overflow-x-auto">
        <table className={`w-full ${sizeClasses.table} ${bordered ? "border border-border" : ""}`}>
          <thead className="bg-bg-secondary">
            <tr>
              {rowSelection ? (
                <th className={`${sizeClasses.cell} w-12 border-b border-border text-left font-medium text-text-secondary`}>
                  {rowSelection.showSelectAll !== false ? (
                    <input
                      type="checkbox"
                      checked={
                        (rowSelection.selectedRowKeys?.length ?? 0) === dataSource.length &&
                        dataSource.length > 0
                      }
                      onChange={(event) => {
                        if (event.target.checked) {
                          rowSelection.onChange?.(dataSource.map(getRowKey), [...dataSource]);
                          return;
                        }

                        rowSelection.onChange?.([], []);
                      }}
                      className="h-4 w-4 rounded border-border bg-bg-tertiary text-primary focus:ring-primary"
                    />
                  ) : null}
                </th>
              ) : null}

              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    ${sizeClasses.cell}
                    border-b border-border text-left font-medium text-text-secondary
                    ${column.sortable ? "cursor-pointer select-none hover:text-text-primary" : ""}
                    ${column.align === "center" ? "text-center" : ""}
                    ${column.align === "right" ? "text-right" : ""}
                  `}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable ? (
                      <span className="flex flex-col">
                        <svg
                          className={`h-3 w-3 ${
                            sortState.field === column.key && sortState.order === "asc"
                              ? "text-primary"
                              : "text-text-muted"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <svg
                          className={`-mt-1 h-3 w-3 ${
                            sortState.field === column.key && sortState.order === "desc"
                              ? "text-primary"
                              : "text-text-muted"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (rowSelection ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
                    <span className="text-text-muted">{tr("Loading...")}</span>
                  </div>
                </td>
              </tr>
            ) : dataSource.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (rowSelection ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="text-text-muted">{resolvedEmptyText}</div>
                </td>
              </tr>
            ) : (
              dataSource.map((record, index) => {
                const key = getRowKey(record);
                const isSelected = rowSelection?.selectedRowKeys?.includes(key) ?? false;

                return (
                  <tr
                    key={key}
                    className={`${getRowClassName(record, index)} ${isSelected ? "bg-primary/10" : ""} transition-colors`}
                    onClick={() => onRowClick?.(record, index)}
                  >
                    {rowSelection ? (
                      <td
                        className={`${sizeClasses.cell} border-b border-border`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) => {
                            const selectedKeys = rowSelection.selectedRowKeys || [];
                            const selectedRows = dataSource.filter((item) =>
                              selectedKeys.includes(getRowKey(item)),
                            );

                            if (event.target.checked) {
                              rowSelection.onChange?.(
                                [...selectedKeys, key],
                                [...selectedRows, record],
                              );
                              return;
                            }

                            rowSelection.onChange?.(
                              selectedKeys.filter((currentKey) => currentKey !== key),
                              selectedRows.filter((item) => getRowKey(item) !== key),
                            );
                          }}
                          className="h-4 w-4 rounded border-border bg-bg-tertiary text-primary focus:ring-primary"
                        />
                      </td>
                    ) : null}

                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`
                          ${sizeClasses.cell}
                          border-b border-border text-text-primary
                          ${column.align === "center" ? "text-center" : ""}
                          ${column.align === "right" ? "text-right" : ""}
                        `}
                      >
                        {column.render
                          ? column.render(getCellValue(record, column.dataIndex), record, index)
                          : String(getCellValue(record, column.dataIndex) ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination ? (
        <Pagination
          pagination={pagination}
          onChange={pagination.onChange || (() => {})}
        />
      ) : null}
    </div>
  );
}

export default DataTable;
