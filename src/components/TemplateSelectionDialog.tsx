import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, FileText } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  onSelect: (template: Template) => void;
}

export function TemplateSelectionDialog({
  open,
  onOpenChange,
  templates,
  onSelect,
}: TemplateSelectionDialogProps) {
  const [search, setSearch] = useState('');

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Selecionar Template Base</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum template encontrado
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className="w-full p-4 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/50 hover:border-primary/30 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {template.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {template.category}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
