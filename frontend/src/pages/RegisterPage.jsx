import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide your first and last name.');
      return;
    }
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    if (fullName.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid college or university email.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Campus Community Guidelines to register.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await register({
        name: fullName,
        email: email.trim(),
        password,
        college: college.trim(),
      });
      const userRole = (res.user?.role || '').toUpperCase();
      navigate(userRole === 'ADMIN' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F2] px-4 py-10 font-sans text-[#111111] sm:px-6">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-4xl border border-[#E8E8E8] bg-white shadow-2xl md:min-h-[640px] md:grid-cols-[0.92fr_1.08fr]">
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
              <span>Campus Verified Students Only</span>
            </div>
            <h1 className="font-display uppercase text-3xl sm:text-4xl font-black leading-tight text-white">
              JOIN YOUR CAMPUS MARKETPLACE.
            </h1>
            <p className="mt-4 text-xs leading-relaxed text-blue-100 sm:text-sm">
              Trade books, electronics, dorm furniture, and gear safely with fellow classmates on your campus.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs font-heading font-bold uppercase tracking-wider text-blue-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#B7FF00]" />
                <span>Zero commission or listing fees</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#B7FF00]" />
                <span>Instant campus walkup pickups</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#B7FF00]" />
                <span>Verified .edu student profiles</span>
              </li>
            </ul>
          </div>

          <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-blue-200/70 border-t border-white/15 pt-4">
            Safe &bull; Verified &bull; Student-Owned
          </div>
        </aside>

        {/* Right Form Panel */}
        <div className="flex flex-col justify-between bg-white p-7 sm:p-10 md:p-11">
          <div>
            <div className="mb-5">
              <h2 className="text-2xl font-heading font-black text-[#111111]">Create Student Account</h2>
              <p className="mt-1 text-xs text-[#62666F]">
                Register to start buying and selling in minutes
              </p>
            </div>

            {error && (
              <ErrorMessage
                title="Registration Issue"
                message={error}
                onDismiss={() => setError('')}
                className="mb-4"
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="reg-first-name"
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Reece"
                  required
                />
                <Input
                  id="reg-last-name"
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Miller"
                  required
                />
              </div>

              <Input
                id="reg-email"
                label="College / University Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                helperText="Preferably your official .edu campus email"
                required
              />

              <Input
                id="reg-college"
                label="College / Major (Optional)"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. School of Engineering, Computer Science"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="reg-password"
                  label="Password"
                  type="password"
                  isPassword
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  required
                />

                <Input
                  id="reg-confirm-password"
                  label="Confirm Password"
                  type="password"
                  isPassword
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Match password"
                  required
                />
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    I confirm I am an enrolled student and agree to meet safely in campus public areas.
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                variant="lime"
                size="md"
                isLoading={isLoading}
                icon={ArrowRight}
                iconPosition="right"
                className="w-full mt-2 uppercase text-xs tracking-wider"
              >
                Complete Registration
              </Button>
            </form>
          </div>

          <div className="mt-5 pt-4 border-t border-[#E8E8E8] text-center text-xs text-[#62666F]">
            Already have an account?{' '}
            <Link to="/login" className="font-heading font-bold text-[#0638C9] hover:underline uppercase tracking-wider ml-1">
              Log in here &rarr;
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

