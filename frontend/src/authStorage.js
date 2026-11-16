import { getCurrentUser, saveUser, clearUser } from './services/storage';

export const CAMPUS_MARKET_USER_KEY = 'campusMarketUser';

export function titleCase(value) {
  if (!value) return '';
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function getNamePartsFromEmail(email) {
  const localPart = email?.split('@')[0] ?? '';
  const parts = localPart.split(/[\s._-]+/).filter(Boolean);

  return {
    firstName: titleCase(parts[0] ?? 'Student'),
    lastName: titleCase(parts.slice(1).join(' ')),
  };
}

export function createCampusMarketUser(account) {
  const email = account.email?.trim() ?? '';
  const emailName = getNamePartsFromEmail(email);
  const firstName = account.firstName?.trim() || emailName.firstName;
  const lastName = account.lastName?.trim() || emailName.lastName;

  return {
    firstName,
    lastName,
    email,
    college: account.college || getCollegeFromEmail(email),
    role: account.role || (email.toLowerCase().includes('admin') ? 'admin' : 'student'),
    isLoggedIn: true,
  };
}

export function saveCampusMarketUser(account) {
  const user = createCampusMarketUser(account);
  return saveUser(user);
}

export function getCampusMarketUser() {
  return getCurrentUser();
}

export function clearCampusMarketUser() {
  clearUser();
}

export function getFullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Student';
}

export function getInitials(user) {
  const nameInitials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  if (nameInitials) {
    return nameInitials.slice(0, 2);
  }

  return (user?.email?.charAt(0) ?? 'S').toUpperCase();
}

export function getCollegeFromEmail(email) {
  const domain = email?.split('@')[1]?.toLowerCase() ?? '';

  if (!domain) {
    return 'Thapar Institute of Engineering & Technology';
  }

  if (domain.includes('thapar.edu')) {
    return 'Thapar Institute of Engineering & Technology';
  }

  const schoolName = domain.replace(/\.edu$/, '').split('.').filter(Boolean).pop();

  return schoolName ? `${titleCase(schoolName)} University` : domain;
}
