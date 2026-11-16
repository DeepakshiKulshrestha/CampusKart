import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Store } from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

const labelClass = 'mb-1.5 block text-xs font-medium text-slate-700';

export default function LoginPage({ onLogin, onSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const PasswordIcon = showPassword ? EyeOff : Eye;

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin({ email });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 font-sans text-slate-900 sm:px-6">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-300/50 md:min-h-[560px] md:grid-cols-[0.92fr_1.08fr]">
        <aside className="flex min-h-[320px] flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-slate-950 p-8 text-white sm:p-10 md:min-h-full">
          <a href="#" className="flex items-center gap-2 text-lg font-semibold text-white">
            <Store className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
            <span>CampusMarket</span>
          </a>

          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
              Welcome back.
              <span className="block">Your campus</span>
              <span className="block">is waiting.</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-blue-100/80">
              Sign in to continue buying, selling, and discovering trusted campus finds.
            </p>
          </div>
        </aside>

        <div className="bg-white p-8 sm:p-10 md:p-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Log in</h2>
            <p className="mt-1 text-xs text-slate-500">Access your CampusMarket account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className={labelClass}>
                College / University Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@university.edu"
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="login-password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                  autoComplete="current-password"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                >
                  <PasswordIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <span>Log In</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-600">
            Need an account?{' '}
            <button
              type="button"
              onClick={onSignUp}
              className="font-medium text-blue-600 transition-colors hover:underline"
            >
              Sign up
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
