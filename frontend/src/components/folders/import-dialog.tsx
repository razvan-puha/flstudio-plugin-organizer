"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { validateFileStructure } from "@/lib/utils/file-structure";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Upload } from "lucide-react";
import { FileItem, FolderItem } from "@/types/folder";
import { Input } from "../ui/input";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (structure: (FolderItem | FileItem)[]) => void;
}

export function ImportDialog({ open, onOpenChange, onImport }: Readonly<ImportDialogProps>) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const structure = JSON.parse(text) as (FolderItem | FileItem)[];
      
      if (!validateFileStructure(structure)) {
        setError("Invalid file structure format");
        return;
      }
      
      onImport(structure);
      setError(null);
      onOpenChange(false);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (ex) {
      console.error(ex);
      setError("Invalid JSON file. Please ensure the file is a valid JSON structure.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import File Structure</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex flex-col items-center justify-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full h-32 flex flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8" />
              <span>Click to select a JSON file</span>
              <span className="text-sm text-muted-foreground">
                or drag and drop here
              </span>
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}