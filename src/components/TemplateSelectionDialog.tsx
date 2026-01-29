import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, FileText, Loader2, Search, Sparkles } from 'lucide-react';
import { generate_template_whatsapp, GeneratedTemplate } from '@/services/generateTemplateWhatsapp';

interface Template {
  id: string;
  name: string;
  category: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

type GeneratorMessageType = 'cobranca' | 'vendas';

interface TemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'select' | 'generate';
  templates?: Template[];
  onSelect?: (template: Template) => void;
  userId?: string;
  onCreated?: () => void;
}

export function TemplateSelectionDialog({
  open,
  onOpenChange,
  mode,
  templates,
  onSelect,
  userId,
  onCreated,
}: TemplateSelectionDialogProps) {
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [messageType, setMessageType] = useState<GeneratorMessageType>('cobranca');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState<GeneratedTemplate | null>(null);
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    if (!open) {
      setSearch('');
      setTitle('');
      setMessageType('cobranca');
      setPrompt('');
      setGenerating(false);
      setSaving(false);
      setGenerated(null);
      setSaveName('');
    }
  }, [open]);

  const filteredTemplates = useMemo(() => {
    const list = templates ?? [];
    const normalized = search.trim().toLowerCase();
    if (!normalized) return list;
    return list.filter((template) => template.name.toLowerCase().includes(normalized));
  }, [templates, search]);

  const previewText = useMemo(() => {
    if (!generated) return '';

    const lines: string[] = [];

    if (generated.header?.format === 'TEXT' && generated.header.text) {
      lines.push(`[${generated.header.text}]`);
      lines.push('');
    }

    lines.push(generated.body?.text ?? '');

    if (generated.footer?.text) {
      lines.push('');
      lines.push(`_${generated.footer.text}_`);
    }

    if ((generated.buttons?.length ?? 0) > 0) {
      lines.push('');
      lines.push('---');
      generated.buttons?.forEach((b) => {
        if (b.type === 'url') lines.push(`${b.text} → ${b.url}`);
        else if (b.type === 'phone_number') lines.push(`${b.text} → ${b.phone_number}`);
        else lines.push(b.text);
      });
    }

    return lines.join('\n').trim();
  }, [generated]);

  const ensureGeneratorReady = () => {
    if (!userId) {
      toast({
        title: 'Sessão expirada',
        description: 'Faça login novamente para continuar.',
        variant: 'destructive',
      });
      return false;
    }

    if (!title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Digite um título para o template.',
        variant: 'destructive',
      });
      return false;
    }

    if (!prompt.trim()) {
      toast({
        title: 'Prompt obrigatório',
        description: 'Descreva o que a mensagem deve conter.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado', description: `${label} copiado para a área de transferência.` });
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Seu navegador bloqueou o acesso à área de transferência.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerate = async () => {
    if (!ensureGeneratorReady()) return;

    setGenerating(true);
    try {
      const result = await generate_template_whatsapp({
        kind: 'generator_prompt',
        title: title.trim(),
        message_type: messageType,
        prompt: prompt.trim(),
        language: 'pt_BR',
      });

      setGenerated(result);
      setSaveName(title.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível concluir a geração. Tente novamente.';
      toast({
        title: 'Erro ao gerar template',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !generated) return;

    const nameToSave = saveName.trim();
    if (!nameToSave) {
      toast({
        title: 'Nome obrigatório',
        description: 'Defina um nome para salvar o template.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const headerLine =
        generated.header?.format === 'TEXT' && generated.header.text ? generated.header.text : '';
      const footerLine = generated.footer?.text ?? '';
      const buttonsText =
        generated.buttons?.map((b) => {
          if (b.type === 'url') return `- ${b.text}: ${b.url}`;
          if (b.type === 'phone_number') return `- ${b.text}: ${b.phone_number}`;
          return `- ${b.text}`;
        }) ?? [];

      const formatted =
        [
          headerLine ? `HEADER:\n${headerLine}` : 'HEADER:\n(sem cabeçalho)',
          `BODY:\n${generated.body.text}`,
          footerLine ? `FOOTER:\n${footerLine}` : 'FOOTER:\n(sem rodapé)',
          `BUTTONS:\n${buttonsText.length ? buttonsText.join('\n') : '(sem botões)'}`,
          `SUGESTÃO NOME DISPARO:\n${generated.broadcast_name_suggestion}`,
          `SUGESTÃO NOME WHATSAPP TEMPLATE:\n${generated.whatsapp_template_name}`,
        ].join('\n\n') + '\n';

      const { error } = await supabase.from('templates').insert({
        name: nameToSave,
        category: 'utility',
        content: formatted,
        user_id: userId,
      });

      if (error) {
        toast({
          title: 'Erro ao salvar',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Template salvo', description: 'O template foi salvo no Supabase.' });
      onOpenChange(false);
      onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={mode === 'generate' ? 'max-w-5xl bg-card border-border' : 'sm:max-w-lg bg-card border-border'}>
        {mode === 'select' ? (
          <>
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
                  <div className="text-center py-8 text-muted-foreground">Nenhum template encontrado</div>
                ) : (
                  filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => onSelect?.(template)}
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
                          <div className="text-xs text-muted-foreground">{template.category}</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {generated ? 'Template gerado' : 'Gerar Template (WhatsApp)'}
              </DialogTitle>
            </DialogHeader>

            {!generated ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-foreground">Título do template</Label>
                    <Input
                      placeholder="Ex: Confirme seu Interesse"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-secondary/50 border-border/50"
                      disabled={generating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Categoria</Label>
                    <Input value="Utilitário" disabled className="bg-secondary/50 border-border/50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Tipo de mensagem</Label>
                  <Select value={messageType} onValueChange={(v) => setMessageType(v as GeneratorMessageType)} disabled={generating}>
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cobranca">Cobrança</SelectItem>
                      <SelectItem value="vendas">Vendas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Prompt</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Descreva o objetivo da mensagem, contexto, tom, dados que devem aparecer, e quais botões você quer..."
                    className="min-h-40 bg-secondary/50 border-border/50"
                    disabled={generating}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
                    Cancelar
                  </Button>
                  <Button onClick={handleGenerate} disabled={generating} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 gap-2">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Gerar template
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Preview (WhatsApp)</div>
                  <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                    <div className="mx-auto max-w-sm rounded-[2rem] border border-border/60 bg-background p-4 shadow-sm">
                      <div className="rounded-2xl bg-secondary/40 p-4 whitespace-pre-wrap text-sm text-foreground">
                        {previewText}
                      </div>
                      {(generated.buttons?.length ?? 0) > 0 && (
                        <div className="mt-3 space-y-2">
                          {generated.buttons?.map((b, idx) => (
                            <div key={`${b.type}-${idx}`} className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-primary">
                              {b.type === 'url'
                                ? `${b.text} → ${b.url}`
                                : b.type === 'phone_number'
                                  ? `${b.text} → ${b.phone_number}`
                                  : b.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-foreground">Nome para salvar</Label>
                      <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} className="bg-secondary/50 border-border/50" disabled={saving} />
                      <div className="text-xs text-muted-foreground">
                        Sugestão de nome para disparo: <span className="text-foreground">{generated.broadcast_name_suggestion}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setSaveName(generated.broadcast_name_suggestion)}
                        disabled={saving}
                      >
                        Usar sugestão no nome
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground">Nome WhatsApp (slug)</Label>
                      <Input value={generated.whatsapp_template_name} readOnly className="bg-secondary/50 border-border/50" />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => handleCopy(generated.whatsapp_template_name, 'Nome WhatsApp')}
                      >
                        <Copy className="h-4 w-4" />
                        Copiar slug
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">Header</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          handleCopy(
                            generated.header?.format === 'TEXT' && generated.header.text ? generated.header.text : '',
                            'Header',
                          )
                        }
                      >
                        <Copy className="h-4 w-4" />
                        Copiar
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 text-sm whitespace-pre-wrap">
                      {generated.header?.format === 'TEXT' && generated.header.text ? generated.header.text : '(sem cabeçalho)'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">Body</div>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleCopy(generated.body.text, 'Body')}>
                        <Copy className="h-4 w-4" />
                        Copiar
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 text-sm whitespace-pre-wrap">
                      {generated.body.text}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">Footer</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleCopy(generated.footer?.text ?? '', 'Footer')}
                      >
                        <Copy className="h-4 w-4" />
                        Copiar
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 text-sm whitespace-pre-wrap">
                      {generated.footer?.text ? generated.footer.text : '(sem rodapé)'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">Buttons</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleCopy(JSON.stringify(generated.buttons ?? [], null, 2), 'Buttons')}
                      >
                        <Copy className="h-4 w-4" />
                        Copiar JSON
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 text-sm whitespace-pre-wrap">
                      {generated.buttons?.length ? JSON.stringify(generated.buttons, null, 2) : '(sem botões)'}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setGenerated(null)} disabled={saving}>
                      Gerar novamente
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      Salvar no Supabase
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
