import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Store, ArrowRight, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Please enter your university email address.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please provide a valid email format (e.g., student@university.edu).');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(email.trim(), password);
      const userRole = (res.user?.role || '').toUpperCase();
      navigate(userRole === 'ADMIN' ? '/admin' : from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoRole) => {
    if (demoRole === 'admin') {
      setEmail('admin@thapar.edu');
      setPassword('admin123');
    } else {
      setEmail('asharma_be23@thapar.edu');
      setPassword('password123');
    }
    setError('');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F2] px-4 py-10 font-sans text-[#111111] sm:px-6">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-4xl border border-[#E8E8E8] bg-white shadow-2xl md:min-h-[600px] md:grid-cols-[0.95fr_1.05fr]">
        {/* Left Brand Panel */}
        <aside className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-[#0638C9] p-8 text-white sm:p-10 md:min-h-full bg-grid-white">
          <Link to="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#B7FF00] text-[#111111] shadow-md">
              <Store className="h-5 w-5 stroke-[2.4]" aria-hidden="true" />
            </div>
            <span className="font-display tracking-tight text-xl text-white">
              CAMPUS<span className="text-[#B7FF00]">KART</span>
            </span>
          </Link>

          <div className="relative z-10 py-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#B7FF00] px-3.5 py-1 text-xs font-heading font-extrabold uppercase tracking-wider text-[#111111] shadow-sticker-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-[#111111]" />
              <span>Campus Verified Auth</span>
            </div>
            <h1 className="font-display uppercase text-3xl sm:text-4xl font-black leading-tight text-white">
              WELCOME BACK.<br />
              <span className="text-[#B7FF00]">YOUR CAMPUS DEALS AWAIT.</span>
            </h1>
            <p className="mt-4 text-xs leading-relaxed text-blue-100 sm:text-sm">
              Log in with your college credentials to buy, sell, and message verified classmates safely.
            </p>
          </div>

          <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-blue-200/70 border-t border-white/15 pt-4">
            Peer-to-peer campus marketplace &bull; {new Date().getFullYear()}
          </div>
        </aside>

        {/* Right Form Panel */}
        <div className="flex flex-col justify-between bg-white p-7 sm:p-10 md:p-12">
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-heading font-black text-[#111111]">Student Sign In</h2>
              <p className="mt-1 text-xs text-[#62666F]">
                Enter your campus email to continue to your dashboard
              </p>
            </div>

            {error && (
              <ErrorMessage
                title="Sign-in Error"
                message={error}
                onDismiss={() => setError('')}
                className="mb-4"
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                id="login-email"
                label="College / University Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                required
                autoComplete="email"
              />

              <Input
                id="login-password"
                label="Password"
                type="password"
                isPassword
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="lime"
                size="md"
                isLoading={isLoading}
                icon={ArrowRight}
                iconPosition="right"
                className="w-full mt-2 uppercase text-xs tracking-wider"
              >
                Log In
              </Button>
            </form>

            {/* Quick Demo Login Helpers */}
            <div className="mt-6 rounded-3xl border border-[#E8E8E8] bg-[#F5F5F2] p-4">
              <p className="text-[11px] font-heading font-extrabold uppercase tracking-wider text-[#62666F] mb-2.5">
                Quick Demo Credentials (One Click)
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('student')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-xs font-heading font-bold text-[#111111] hover:border-[#0638C9] hover:text-[#0638C9] transition shadow-sm"
                >
                  <UserCheck className="h-3.5 w-3.5 text-[#0638C9]" />
                  <span>Student: asharma_be23@thapar.edu</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-heading font-bold text-purple-700 hover:bg-purple-100 transition shadow-sm"
                >
                  <KeyRound className="h-3.5 w-3.5 text-purple-600" />
                  <span>Admin: admin@thapar.edu</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E8E8E8] text-center text-xs text-[#62666F]">
            Don't have a campus account?{' '}
            <Link to="/register" className="font-heading font-bold text-[#0638C9] hover:underline uppercase tracking-wider ml-1">
              Create an account &rarr;
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

