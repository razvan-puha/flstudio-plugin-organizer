"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFile: (name: string, content: string) => void;
}

export function CreateFileDialog({ open, onOpenChange, onCreateFile }: Readonly<CreateFileDialogProps>) {
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");

  const handleCreate = () => {
    if (!fileName.trim()) return;
    onCreateFile(fileName, fileContent);
    setFileName("");
    setFileContent("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New File</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            placeholder="File name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
          <Textarea
            placeholder="File content"
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            rows={5}
          />
          <Button onClick={handleCreate}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}