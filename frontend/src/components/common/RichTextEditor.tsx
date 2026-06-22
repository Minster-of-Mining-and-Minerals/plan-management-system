"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import FontFamily from "@tiptap/extension-font-family";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Heading1,
  Heading2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "Write your note content...",
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      TextStyle,
      Color,
      Highlight,
      FontFamily,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      HorizontalRule,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="icon-sm"
      onClick={onClick}
      title={title}
      disabled={readOnly}
      className="h-8 w-8"
    >
      {children}
    </Button>
  );

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      {!readOnly && (
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block">
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
            <Minus className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={addLink} active={editor.isActive("link")} title="Link">
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={addImage} title="Image">
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            title="Insert table"
          >
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            defaultValue=""
            disabled={readOnly}
          >
            <option value="">Font</option>
            <option value="Inter, sans-serif">Inter</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="monospace">Monospace</option>
          </select>
          <input
            type="color"
            title="Text color"
            className="h-8 w-8 cursor-pointer rounded border border-input"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            disabled={readOnly}
          />
          <input
            type="color"
            title="Highlight color"
            className="h-8 w-8 cursor-pointer rounded border border-input"
            onChange={(e) => editor.chain().focus().setHighlight({ color: e.target.value }).run()}
            disabled={readOnly}
          />
        </div>
      )}
      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm max-w-none min-h-[280px] p-4 focus:outline-none",
          readOnly && "bg-muted/20"
        )}
      />
    </div>
  );
}
