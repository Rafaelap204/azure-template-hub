import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { GlassCard } from '@/components/GlassCard';
import { Logo } from '@/components/Logo';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CATEGORIES = [
  { value: 'utility', label: 'Utilitário' },
  { value: 'notification', label: 'Notificação' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'authentication', label: 'Autenticação' },
];

export default function TemplateCreate() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('utility');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBase, setLoadingBase] = useState(false);
  const [basedOnId, setBasedOnId] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fromId = searchParams.get('from');
    if (fromId && user) {
      loadBaseTemplate(fromId);
    }
  }, [searchParams, user]);

  const loadBaseTemplate = async (templateId: string) => {
    setLoadingBase(true);
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (!error && data) {
      setName(`Cópia de ${data.name}`);
      setCategory(data.category);
      setContent(data.content || '');
      setBasedOnId(data.id);
    }
    setLoadingBase(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Sessão expirada',
        description: 'Faça login novamente para continuar.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira um nome para o template.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('templates').insert({
      name: name.trim(),
      category,
      content: content.trim() || null,
      user_id: user.id,
      based_on_template_id: basedOnId,
    });

    if (error) {
      toast({
        title: 'Erro ao criar template',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Template criado!',
        description: 'Seu template foi criado com sucesso.',
      });
      navigate('/dashboard');
    }

    setLoading(false);
  };

  if (authLoading || loadingBase) {
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
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            {basedOnId ? 'Criar a partir de Template' : 'Criar Novo Template'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure os detalhes do seu template utilitário
          </p>
        </div>

        <GlassCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Nome do Template</Label>
              <Input
                id="name"
                placeholder="Ex: Confirmação de Pedido"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary/50 border-border/50 focus:border-primary"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-foreground">Categoria</Label>
              <Select value={category} onValueChange={setCategory} disabled={loading}>
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
                Conteúdo do Template (opcional)
              </Label>
              <Textarea
                id="content"
                placeholder="Digite o conteúdo do template aqui..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-32 bg-secondary/50 border-border/50 focus:border-primary"
                disabled={loading}
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
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Template
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
