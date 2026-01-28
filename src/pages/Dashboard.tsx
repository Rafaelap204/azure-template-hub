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
  
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleCreateFromScratch = () => {
    navigate('/templates/new');
  };

  const handleCreateFromTemplate = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 text-foreground">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Meus Templates</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie seus templates utilitários do WhatsApp
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleCreateFromScratch}
              className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 shadow-md gap-2"
            >
              <Plus className="h-4 w-4" />
              Criar Template
            </Button>
            <Button
              onClick={handleCreateFromTemplate}
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary/10 gap-2"
              disabled={templates.length === 0}
            >
              <Copy className="h-4 w-4" />
              Usar Existente
            </Button>
          </div>
        </div>

        {/* Templates List */}
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
            <Button
              onClick={handleCreateFromScratch}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Template
            </Button>
          </GlassCard>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <GlassCard
                key={template.id}
                className="p-5 hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/templates/${template.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-secondary/50 text-xs">
                          {template.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

      {/* Template Selection Dialog */}
      <TemplateSelectionDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        templates={templates}
        onSelect={handleSelectTemplate}
      />
    </div>
  );
}
