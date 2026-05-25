import React, { useState, useEffect } from 'react'; // تأكد من وجود useEffect
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, 
  Highlighter, Superscript as SuperIcon, 
  Subscript as SubIcon, Undo, Redo
} from 'lucide-react';

const TipTapMathEditor = ({ value, onChange }) => {
  // 1. تعريف مجموعات الرموز الرياضية
  const symbolCategories = {
    "Basic": ["+", "−", "×", "÷", "⋅", "±", "∓", "=", "≠", "≈", "√", "∛", "∜", "∝", "∞"],
    "Greek": ["α", "β", "γ", "δ", "ε", "θ", "λ", "μ", "π", "ρ", "σ", "φ", "ψ", "ω", "Δ", "Σ", "Ω"],
    "Geometry": ["∠", "△", "□", "○", "⊥", "∥", "≅", "≡", "°", "′", "″", "∼", "⌒", "∟"],
    "Algebra": ["<", ">", "≤", "≥", "≪", "≫", "log", "ln", "e", "i", "f(x)", "g(x)", "²", "³", "ⁿ"],
    "Calculus": ["∫", "∬", "∭", "∮", "∂", "∇", "∆", "lim", "→", "⇒", "⇔", "∴", "∵"],
    "Sets": ["∈", "∉", "⊂", "⊆", "∪", "∩", "∅", "∀", "∃", "ℵ", "ℕ", "ℤ", "ℚ", "ℝ", "ℂ"]
  };

  const [activeTab, setActiveTab] = useState("Basic");

 const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
    Superscript,
    Subscript,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ],
  content: "",                    // ← خليها فاضية في البداية
  onUpdate: ({ editor }) => {
    onChange(editor.getHTML());
  },
});

// استبدل الـ useEffect القديم بالكود ده
useEffect(() => {
  if (!editor) return;

  // لو القيمة الجديدة مختلفة عن اللي جوا الـ editor
  const currentContent = editor.getHTML();

  if (value && value !== currentContent && value !== "<p></p>") {
    editor.commands.setContent(value, false); // false = بدون إضافة للـ history
  }
}, [value, editor]);

  if (!editor) return null;

  const MenuButton = ({ onClick, isActive, children, title }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-2 rounded-lg transition-all ${
        isActive ? 'bg-one text-white shadow-md' : 'hover:bg-slate-100 text-slate-600'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:border-one focus-within:ring-2 focus-within:ring-one/10 transition-all bg-white text-left shadow-sm">
      
      {/* 1. الـ Toolbar الرئيسي (التنسيقات) */}
      <div className="bg-slate-50/80 p-2 border-b border-slate-200 flex flex-wrap gap-1 items-center">
        <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold"><Bold size={18} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic"><Italic size={18} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline"><UnderlineIcon size={18} /></MenuButton>
        
        <div className="w-[1px] h-6 bg-slate-300 mx-1" />
        
        <MenuButton onClick={() => editor.chain().focus().toggleSuperscript().run()} isActive={editor.isActive('superscript')} title="Power"><SuperIcon size={18} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleSubscript().run()} isActive={editor.isActive('subscript')} title="Base"><SubIcon size={18} /></MenuButton>
        
        <div className="w-[1px] h-6 bg-slate-300 mx-1" />
        
        <MenuButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })}><AlignLeft size={18} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })}><AlignCenter size={18} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })}><AlignRight size={18} /></MenuButton>
        
        <div className="w-[1px] h-6 bg-slate-300 mx-1" />
        
        <input type="color" onInput={e => editor.chain().focus().setColor(e.target.value).run()} className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer rounded overflow-hidden shadow-sm" title="Text Color" />
        <MenuButton onClick={() => editor.chain().focus().toggleHighlight({ color: '#ffec3d' }).run()} isActive={editor.isActive('highlight')} title="Highlight"><Highlighter size={18} /></MenuButton>
        
        <div className="flex-grow" />
        
        <MenuButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo size={18} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo size={18} /></MenuButton>
      </div>

      {/* 2. كيبورد الرموز الرياضية (Tabs) */}
      <div className="bg-white border-b border-slate-100 shadow-inner">
        <div className="flex gap-1 p-2 overflow-x-auto no-scrollbar border-b border-slate-50">
          {Object.keys(symbolCategories).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all whitespace-nowrap ${
                activeTab === cat ? 'bg-one text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 p-3 max-h-24 overflow-y-auto custom-scrollbar">
          {symbolCategories[activeTab].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => editor.chain().focus().insertContent(sym).run()}
              className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl hover:border-one hover:text-one font-serif text-lg transition-all active:scale-90 hover:bg-white hover:shadow-sm"
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* 3. منطقة الكتابة */}
      <div className="prose-container bg-slate-50/20">
        <EditorContent 
          editor={editor} 
          className="p-6 min-h-[250px] bg-white prose prose-blue max-w-none focus:outline-none" 
        />
      </div>

      <style>{`
        .ProseMirror:focus { outline: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        
        .ProseMirror {
          font-size: 1.15rem;
          line-height: 1.7;
          font-family: 'Inter', sans-serif;
          min-height: 200px;
        }
        
        .ProseMirror sup { color: #2563eb; font-weight: 600; font-size: 0.75em; vertical-align: super; }
        .ProseMirror sub { color: #d97706; font-weight: 600; font-size: 0.75em; vertical-align: sub; }
        
        .ProseMirror[dir="rtl"] { text-align: right; }
      `}</style>
    </div>
  );
};

export default TipTapMathEditor;