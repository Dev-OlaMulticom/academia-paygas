/**
 * CASL Actions — centralized action definitions.
 * Use these constants everywhere instead of string literals.
 */
export const Actions = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  manage: 'manage',
  assignRole: 'assignRole',
  sendNotification: 'sendNotification',
  approveCertificate: 'approveCertificate',
  issueCertificate: 'issueCertificate',
  viewTeam: 'viewTeam',
  exportData: 'exportData',
  deleteActivityLog: 'deleteActivityLog',
  deleteNotification: 'deleteNotification',
  deleteXPConfig: 'deleteXPConfig',
} as const

export type Action = typeof Actions[keyof typeof Actions]
