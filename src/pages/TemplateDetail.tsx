import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { GlassCard } from '@/components/GlassCard';
import { Logo } from '@/components/Logo';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CATEGORIES = [
  { value: 'utility', label: 'Utilitário' },
  { value: 'notification', label: 'Notificação' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'authentication', label: 'Autenticação' },
];

export default function TemplateDetail() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('utility');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      loadTemplate();
    }
  }, [user, id]);

  const loadTemplate = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: 'Template não encontrado',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } else if (data) {
      setName(data.name);
      setCategory(data.category);
      setContent(data.content || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira um nome para o template.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('templates')
      .update({
        name: name.trim(),
        category,
        content: content.trim() || null,
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Template salvo!',
        description: 'As alterações foram salvas com sucesso.',
      });
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
      setDeleting(false);
    } else {
      toast({
        title: 'Template excluído',
        description: 'O template foi removido com sucesso.',
      });
      navigate('/dashboard');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Editar Template
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Atualize os detalhes do seu template
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Excluir Template</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Esta ação não pode ser desfeita. O template será permanentemente excluído.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <GlassCard className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Nome do Template</Label>
              <Input
                id="name"
                placeholder="Ex: Confirmação de Pedido"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary/50 border-border/50 focus:border-primary"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-foreground">Categoria</Label>
              <Select value={category} onValueChange={setCategory} disabled={saving}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-foreground">
                Conteúdo do Template
              </Label>
              <Textarea
                id="content"
                placeholder="Digite o conteúdo do template aqui..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-32 bg-secondary/50 border-border/50 focus:border-primary"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{variavel}}'} para definir variáveis dinâmicas
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                disabled={saving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </GlassCard>
      </main>
    </div>
  );
}
