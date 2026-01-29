import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/GlassCard';
import { Logo } from '@/components/Logo';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [canCreateAccount, setCanCreateAccount] = useState(false);
  
  const { signInWithPassword, signUpWithPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setFieldErrors({});
    setCanCreateAccount(false);
    const allowedEmail = 'admgestalt@gmail.com';

    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') errors.email = err.message;
        if (err.path[0] === 'password') errors.password = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    if (email.trim().toLowerCase() !== allowedEmail) {
      setError('Este email não tem permissão de acesso.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signInWithPassword(email.trim(), password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Credenciais inválidas. Verifique seu email e senha.');
          setCanCreateAccount(true);
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setError(null);
    setInfo(null);
    setFieldErrors({});
    const allowedEmail = 'admgestalt@gmail.com';

    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') errors.email = err.message;
        if (err.path[0] === 'password') errors.password = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    if (email.trim().toLowerCase() !== allowedEmail) {
      setError('Este email não tem permissão de acesso.');
      return;
    }

    setLoading(true);
    try {
      const { error, session } = await signUpWithPassword(email.trim(), password);
      if (error) {
        const message = error.message ?? 'Não foi possível criar a conta.';
        if (message.toLowerCase().includes('user already registered')) {
          setError('Usuário já existe. Tente entrar com a senha correta.');
        } else if (message.includes('SIGNUP_DISABLED') || message.toLowerCase().includes('signups')) {
          setError('Criação de conta desabilitada no Supabase. Crie o usuário no painel (Auth → Users).');
        } else {
          setError(message);
        }
        return;
      }

      if (session) {
        navigate('/dashboard');
        return;
      }

      setInfo('Conta criada. Se o Supabase exigir confirmação de email, confirme e tente entrar.');
      setCanCreateAccount(false);
    } catch (err) {
      setError('Ocorreu um erro ao criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-28 left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <GlassCard className="w-full max-w-md p-8 sm:p-10 relative z-10" glow>
        <div className="flex flex-col items-center text-center mb-8">
          <Logo size="lg" />
          <p className="text-muted-foreground mt-3 text-sm sm:text-base max-w-xs">
            Gerencie seus templates do WhatsApp.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30 text-foreground text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-primary" />
              <span>{info}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-destructive text-xs">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            {fieldErrors.password && (
              <p className="text-destructive text-xs">{fieldErrors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-95 shadow-[var(--glow-primary)]"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Entrar'
            )}
          </Button>

          {canCreateAccount && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              disabled={loading}
              onClick={handleCreateAccount}
            >
              Criar conta
            </Button>
          )}
        </form>
      </GlassCard>
    </div>
  );
}
