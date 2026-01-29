import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/GlassCard';
import { Logo } from '@/components/Logo';
import { TemplateSelectionDialog } from '@/components/TemplateSelectionDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Copy, 
  LogOut, 
  User, 
  FileText, 
  Calendar,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Template {
  id: string;
  name: string;
  category: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export default function Dashboard() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateDialogMode, setTemplateDialogMode] = useState<'select' | 'generate'>('select');
  
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      toast({
        title: error.code === '42501' ? 'Sem permissão para ler templates' : 'Erro ao carregar templates',
        description: error.message,
        variant: 'destructive',
      });
      setTemplates([]);
      setLoading(false);
      return;
    }

    if (data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleCreateFromScratch = () => {
    setTemplateDialogMode('generate');
    setShowTemplateDialog(true);
  };

  const handleCreateFromTemplate = () => {
    setTemplateDialogMode('select');
    setShowTemplateDialog(true);
  };

  const handleSelectTemplate = (template: Template) => {
    setShowTemplateDialog(false);
    navigate(`/templates/new?from=${template.id}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/2 h-80 w-[54rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-28 left-1/2 h-80 w-[54rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 text-foreground hover:bg-secondary/40">
                <div className="h-8 w-8 rounded-full bg-secondary/60 flex items-center justify-center border border-border/60">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="hidden sm:inline text-sm">{user?.email}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 relative">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Meus Templates</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-2">
              Crie, edite e organize templates do WhatsApp com mais clareza.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleCreateFromScratch}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-95 gap-2"
            >
              <Plus className="h-4 w-4" />
              Criar Template
            </Button>
            <Button
              onClick={handleCreateFromTemplate}
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 gap-2"
              disabled={templates.length === 0}
            >
              <Copy className="h-4 w-4" />
              Usar Existente
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              Nenhum template ainda
            </h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Comece criando seu primeiro template utilitário para a API do WhatsApp.
            </p>
            <Button onClick={handleCreateFromScratch} className="bg-gradient-to-r from-primary to-accent hover:opacity-95">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Template
            </Button>
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <GlassCard
                key={template.id}
                className="p-5 hover:border-primary/40 hover:shadow-lg transition-colors cursor-pointer group"
                onClick={() => navigate(`/templates/${template.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-secondary/60 border border-border/60 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="px-2.5 py-1 rounded-full bg-secondary/60 border border-border/60 text-xs font-medium">
                          {template.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(template.updated_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </main>

      <TemplateSelectionDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        mode={templateDialogMode}
        templates={templates}
        onSelect={handleSelectTemplate}
        userId={user?.id}
        onCreated={fetchTemplates}
      />
    </div>
  );
}
