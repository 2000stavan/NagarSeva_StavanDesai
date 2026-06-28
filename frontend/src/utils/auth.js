export const roleRedirects = {
  citizen: '/',
  authority: '/dashboard',
  supervisor: '/dashboard',
  worker: '/worker/jobs',
  ngo: '/dashboard',
  school_reporter: '/',
  admin: '/dashboard',
  journalist: '/dashboard',
};

export const PORTALS = {
  citizen: {
    id: 'citizen',
    title: 'Citizen',
    subtitle: 'Report issues, track repairs, earn civic score',
    color: 'emerald',
    roles: ['citizen', 'school_reporter'],
    demo: { email: 'demo@communityhero.in', label: 'Demo Citizen' },
  },
  worker: {
    id: 'worker',
    title: 'Field Worker',
    subtitle: 'Jobs, step photos, voice help on site',
    color: 'orange',
    roles: ['worker'],
    demo: { email: 'worker.roads1@nagarseva.in', label: 'Demo Worker' },
  },
  authority: {
    id: 'authority',
    title: 'Authority',
    subtitle: 'Dashboard, assign workers, approve fixes',
    color: 'slate',
    roles: ['authority', 'supervisor', 'admin', 'ngo', 'journalist'],
    demo: { email: 'roads@mumbai.gov.in', label: 'Demo Authority' },
  },
};

export function portalForRole(role) {
  if (PORTALS.worker.roles.includes(role)) return 'worker';
  if (PORTALS.authority.roles.includes(role)) return 'authority';
  return 'citizen';
}
