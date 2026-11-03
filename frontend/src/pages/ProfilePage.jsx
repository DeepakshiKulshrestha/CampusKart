import { useState, useEffect } from 'react';
import {
  UserRound,
  Mail,
  Phone,
  GraduationCap,
  Home,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Edit3,
  Camera,
  Package,
  Sparkles,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStoredProducts } from '../services/storage';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
];

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [major, setMajor] = useState('');
  const [college, setCollege] = useState('');
  const [dorm, setDorm] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Stats
  const [itemsSoldCount, setItemsSoldCount] = useState(0);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setMajor(user.major || '');
      setCollege(user.college || '');
      setDorm(user.dorm || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || AVATAR_OPTIONS[0]);

      // Calculate sold
      const all = getStoredProducts();
      const sold = all.filter(
        (p) =>
          p.status === 'Sold' &&
          (p.seller?.id === user.id || p.seller?.email === user.email)
      ).length;
      setItemsSoldCount(sold);
    }
  }, [user]);

  const handleOpenEdit = () => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setMajor(user.major || '');
      setCollege(user.college || '');
      setDorm(user.dorm || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || AVATAR_OPTIONS[0]);
    }
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await updateProfile({
      name: `${firstName.trim()} ${lastName.trim()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      major: major.trim(),
      college: college.trim(),
      dorm: dorm.trim(),
      bio: bio.trim(),
      avatarUrl,
    });
    setIsEditModalOpen(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const initials = user
    ? [user.firstName, user.lastName]
        .filter(Boolean)
        .map((p) => p[0]?.toUpperCase())
        .join('')
        .slice(0, 2) || (user.email?.[0] || 'S').toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8 font-sans">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Profile Card Header Banner */}
        <div className="relative overflow-hidden rounded-4xl bg-[#0638C9] text-white shadow-xl bg-grid-white">
          <div className="px-6 py-10 sm:px-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {/* Avatar with click to change */}
                <div className="relative group">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.firstName}
                      className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white/20 shadow-2xl"
                    />
                  ) : (
                    <span className="grid h-24 w-24 place-items-center rounded-3xl bg-white text-3xl font-heading font-black text-[#0638C9] shadow-2xl">
                      {initials}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    aria-label="Change photo"
                    className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-2xl bg-[#B7FF00] text-[#111111] shadow-md hover:scale-105 transition"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-heading font-black text-white sm:text-3xl">
                      {user?.firstName} {user?.lastName}
                    </h1>
                    <CheckCircle2 className="h-5 w-5 text-[#B7FF00]" title="Verified Student" />
                  </div>
                  <p className="text-xs text-blue-100">{user?.email}</p>
                  <p className="text-xs text-blue-200 font-heading font-bold uppercase tracking-wider pt-1">
                    {user?.college || 'University Campus'} &bull; {user?.major || 'Undergraduate'}
                  </p>
                </div>
              </div>

              <div>
                <Button
                  variant="lime"
                  size="md"
                  icon={Edit3}
                  onClick={handleOpenEdit}
                  className="uppercase text-xs"
                >
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>

          {/* Quick stats bottom bar */}
          <div className="grid grid-cols-3 border-t border-white/10 bg-black/20 px-6 py-4 text-center sm:px-10 font-heading">
            <div>
              <p className="text-xl font-black text-white">{itemsSoldCount}</p>
              <p className="text-[10px] text-blue-200/80 uppercase tracking-wider font-bold">Items Sold</p>
            </div>
            <div>
              <p className="text-xl font-black text-[#B7FF00]">4.9 / 5.0</p>
              <p className="text-[10px] text-blue-200/80 uppercase tracking-wider font-bold">Campus Rating</p>
            </div>
            <div>
              <p className="text-xl font-black text-white">Active</p>
              <p className="text-[10px] text-blue-200/80 uppercase tracking-wider font-bold">Verification</p>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-3xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-heading font-bold text-emerald-800 shadow-sm">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>Profile information successfully updated and saved!</span>
          </div>
        )}

        {/* Profile Details Sections */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card space-y-4">
            <h2 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F]">
              Personal Information
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-2xl bg-[#F5F5F2] p-3.5">
                <span className="font-heading font-bold uppercase tracking-wider text-[11px] text-[#62666F]">First Name</span>
                <span className="font-bold text-[#111111]">{user?.firstName || '—'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#F5F5F2] p-3.5">
                <span className="font-heading font-bold uppercase tracking-wider text-[11px] text-[#62666F]">Last Name</span>
                <span className="font-bold text-[#111111]">{user?.lastName || '—'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#F5F5F2] p-3.5">
                <span className="font-heading font-bold uppercase tracking-wider text-[11px] text-[#62666F]">Account Role</span>
                <span className="rounded-full bg-[#0638C9]/10 px-3 py-0.5 font-heading font-extrabold uppercase text-[#0638C9] text-[10px]">
                  {user?.role || 'Student'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#F5F5F2] p-3.5">
                <span className="font-heading font-bold uppercase tracking-wider text-[11px] text-[#62666F]">Joined</span>
                <span className="font-bold text-[#111111]">{user?.joinedDate || 'August 2023'}</span>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F] mb-1.5">About / Bio</h3>
              <p className="rounded-2xl border border-[#E8E8E8] bg-[#F5F5F2] p-3.5 text-xs text-[#111111] leading-relaxed">
                {user?.bio || 'No personal bio added yet.'}
              </p>
            </div>
          </div>

          {/* Campus & Contact Info */}
          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card space-y-4">
            <h2 className="text-xs font-heading font-extrabold uppercase tracking-wider text-[#62666F]">
              Campus & Contact Details
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 rounded-2xl bg-[#F5F5F2] p-3.5">
                <Mail className="h-4 w-4 text-[#0638C9] mt-0.5 shrink-0" />
                <div>
                  <p className="font-heading font-bold uppercase tracking-wider text-[11px] text-[#62666F]">University Email</p>
                  <p className="font-bold text-[#111111] mt-0.5">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-[#F5F5F2] p-3.5">
                <Phone className="h-4 w-4 text-[#0638C9] mt-0.5 shrink-0" />
                <div>
                  <p className="font-heading font-bold uppercase tracking-wider text-[11px] text-[#62666F]">Phone Number</p>
                  <p className="font-bold text-[#111111] mt-0.5">{user?.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-[#F5F5F2] p-3.5">
                <GraduationCap className="h-4 w-4 text-[#0638C9] mt-0.5 shrink-0" />
                <div>
                  <p className="font-heading font-bold uppercase tracking-wider text-[11px] text-[#62666F]">College / Major</p>
                  <p className="font-bold text-[#111111] mt-0.5">
                    {user?.college || 'University'} {user?.major ? `• ${user.major}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-[#F5F5F2] p-3.5">
                <Home className="h-4 w-4 text-[#0638C9] mt-0.5 shrink-0" />
                <div>
                  <p className="font-heading font-bold uppercase tracking-wider text-[11px] text-[#62666F]">Thapar Hostel / Room</p>
                  <p className="font-bold text-[#111111] mt-0.5">{user?.dorm || 'Hostel J, TIET'}</p>
                </div>
              </div>
            </div>

            {/* Verification Status Banner */}
            <div className="rounded-3xl border border-teal-200 bg-teal-50/80 p-4 text-xs text-teal-900 shadow-sm">
              <div className="flex items-center gap-2 font-heading font-bold text-teal-800 mb-1">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                <span>Student Status: Verified</span>
              </div>
              <p className="text-[11px] text-teal-700 leading-relaxed">
                Your account is confirmed with valid campus credentials. You have full listing, messaging, and trading privileges.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile Information"
        size="md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Avatar selector */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700">
              Choose Profile Avatar
            </label>
            <div className="flex items-center gap-3">
              {AVATAR_OPTIONS.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatarUrl(img)}
                  className={`h-12 w-12 rounded-2xl overflow-hidden border-2 transition ${
                    avatarUrl === img
                      ? 'border-blue-600 ring-2 ring-blue-100 scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="edit-firstname"
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              id="edit-lastname"
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <Input
            id="edit-phone"
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="edit-college"
              label="College"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="e.g. School of Engineering"
            />
            <Input
              id="edit-major"
              label="Major"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="e.g. Computer Science"
            />
          </div>

          <Input
            id="edit-dorm"
            label="Thapar Hostel / Room"
            value={dorm}
            onChange={(e) => setDorm(e.target.value)}
            placeholder="e.g. Hostel J, Room 314"
          />

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-blue-600 focus:outline-none"
              placeholder="Tell buyers a little about yourself..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

