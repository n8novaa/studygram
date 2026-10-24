const AVATAR_COLORS = [
  '#87947d',
  '#a78e73',
  '#7e9290',
  '#aa8174',
  '#92907b',
  '#927e8a',
  '#748b7d',
];

export function getAvatarColor(username = '') {
  let hash = 0;
  for (let index = 0; index < username.length; index += 1) {
    hash = username.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
