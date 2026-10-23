import * as React from "react";

import { cn } from "@/lib/utils";

type TableProps = React.HTMLAttributes<HTMLTableElement> & { mobileCards?: boolean };

// Both layouts reuse the same rows, permissions and actions.
const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, mobileCards = false, ...props }, ref) => {
    const sections = React.Children.toArray(children);
    const header = sections.find(
      (child) => React.isValidElement(child) && child.type === TableHeader,
    );
    const labels: React.ReactNode[] = [];
    if (React.isValidElement<{ children?: React.ReactNode }>(header)) {
      React.Children.forEach(header.props.children, (row) => {
        if (!React.isValidElement<{ children?: React.ReactNode }>(row)) return;
        React.Children.forEach(row.props.children, (cell) => {
          if (React.isValidElement<{ children?: React.ReactNode }>(cell))
            labels.push(cell.props.children);
        });
      });
    }
    const content = mobileCards
      ? sections.map((section) => {
          if (
            !React.isValidElement<{ children?: React.ReactNode }>(section) ||
            section.type !== TableBody
          )
            return section;
          return React.cloneElement(
            section,
            {},
            React.Children.map(section.props.children, (row) => {
              if (
                !React.isValidElement<{ children?: React.ReactNode }>(row) ||
                row.type !== TableRow
              )
                return row;
              return React.cloneElement(
                row,
                {},
                React.Children.map(row.props.children, (cell, index) => {
                  if (
                    !React.isValidElement<{ children?: React.ReactNode; colSpan?: number }>(cell) ||
                    cell.type !== TableCell ||
                    cell.props.colSpan
                  )
                    return cell;
                  return React.cloneElement(
                    cell,
                    {},
                    <>
                      <span className="mobile-cell-label">{labels[index]}</span>
                      <div className="mobile-cell-value">{cell.props.children}</div>
                    </>,
                  );
                }),
              );
            }),
          );
        })
      : children;
    return (
      <div className="relative min-w-0 w-full overflow-auto">
        <table
          ref={ref}
          className={cn(
            "w-full caption-bottom text-sm",
            mobileCards && "responsive-table",
            className,
          )}
          {...props}
        >
          {content}
        </table>
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
