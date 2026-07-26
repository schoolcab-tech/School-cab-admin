import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/csvExport";
import { Download } from "lucide-react";

type ExportButtonProps = {
  headers: string[];
  rows: (string | number | boolean | undefined | null)[][];
  filename: string;
  disabled?: boolean;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

export function ExportButton({
  headers,
  rows,
  filename,
  disabled = false,
  label = "Export",
  variant = "outline",
  size = "default",
}: ExportButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || rows.length === 0}
      onClick={() => downloadCSV(headers, rows, filename)}
    >
      <Download className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
