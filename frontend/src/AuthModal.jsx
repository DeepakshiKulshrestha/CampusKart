import { useMemo, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Store } from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

const labelClass = 'mb-1.5 block text-xs font-medium text-slate-700';

function TextField({
  id,
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  onBlur,
  autoComplete,
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClass}
      />
    </div>
  );
}

function PasswordField({ id, label, value, onChange, isVisible, onToggle, autoComplete }) {
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
          autoComplete={autoComplete}
          className={`${inputClass} pr-11`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function AuthModal({ onCreateAccount, onLoginClick }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const isEduEmail = useMemo(() => email.trim().toLowerCase().endsWith('.edu'), [email]);
  const showEmailWarning = emailTouched && email.length > 0 && !isEduEmail;

  const handleSubmit = (event) => {
    event.preventDefault();
    onCreateAccount?.({ firstName, lastName, email });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 font-sans text-slate-900 sm:px-6">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-300/50 md:min-h-[620px] md:grid-cols-[0.92fr_1.08fr]">
        <aside className="flex min-h-[360px] flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-slate-950 p-8 text-white sm:p-10 md:min-h-full">
          <a href="#" className="flex items-center gap-2 text-lg font-semibold text-white">
            <Store className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
            <span>CampusMarket</span>
          </a>

          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
              Your campus.
              <span className="block">Your</span>
              <span className="block">marketplace.</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-blue-100/80">
              Buy, sell, and discover what your campus community has to offer. Built for
              students, by students.
            </p>
          </div>
        </aside>

        <div className="bg-white p-8 sm:p-10 md:p-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Create an account</h2>
            <p className="mt-1 text-xs text-slate-500">Join your campus community today.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="first-name"
                label="First Name"
                placeholder="Jane"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
              />
              <TextField
                id="last-name"
                label="Last Name"
                placeholder="Doe"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
              />
            </div>

            <div>
              <TextField
                id="email"
                label="College / University Email"
                placeholder="student@university.edu"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setEmailTouched(true)}
                autoComplete="email"
              />
              {showEmailWarning ? (
                <p className="mt-1.5 text-xs font-medium text-amber-600">
                  Please use a valid college email ending in .edu.
                </p>
              ) : null}
            </div>

            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              isVisible={showPassword}
              onToggle={() => setShowPassword((current) => !current)}
              autoComplete="new-password"
            />

            <PasswordField
              id="confirm-password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              isVisible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((current) => !current)}
              autoComplete="new-password"
            />

            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <span>Create Account</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onLoginClick}
              className="font-medium text-blue-600 transition-colors hover:underline"
            >
              Log in
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}