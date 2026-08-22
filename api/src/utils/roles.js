export const ROLES = Object.freeze({
  STUDENT: "student",
  COUNSELLOR: "counsellor",
  ADMIN: "admin",
});

export const ALL_ROLES = Object.freeze([
  ROLES.STUDENT,
  ROLES.COUNSELLOR,
  ROLES.ADMIN,
]);

export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

export function isCounsellor(user) {
  return user?.role === ROLES.COUNSELLOR;
}

export function isStudent(user) {
  return user?.role === ROLES.STUDENT;
}