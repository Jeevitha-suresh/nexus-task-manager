# Security Specification - Nexus Task Manager

## 1. Data Invariants
- Users can only be created by Admins or Managers (for Employees).
- Tasks can only be created by Admins or Managers.
- Managers can only manage Employees they are assigned to (or all if we simplify, but let's go with relational check).
- Employees can only update the status of tasks assigned to them.
- Ratings can only be set by the assigner (Admin or Manager).
- Status changes are restricted: Only the assignee can change from pending to in-progress to completed.
- Once a task is completed and rated, it should be immutable (except maybe by admins).

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Spoofing**: Employee tries to create a user with "admin" role.
2. **Identity Spoofing**: Manager tries to change their own role to "admin".
3. **Privilege Escalation**: Employee tries to assign a task to someone else.
4. **Unauthorized Read**: Employee tries to read all tasks (not just theirs).
5. **Unauthorized Read**: Manager tries to read tasks not assigned by them or to their managed employees.
6. **State Shortcut**: Employee tries to update a task they don't own.
7. **State Shortcut**: Employee tries to rate their own task.
8. **Resource Poisoning**: Attacker sends a 1MB string as a task title.
9. **Relational Sync**: Employee tries to delete a task assigned to them.
10. **Immutability Breach**: Manager tries to change the `assignedBy` field of an existing task.
11. **Shadow Update**: User tries to add an `isVerified: true` field to their user profile.
12. **PII Leak**: Unauthenticated user tries to list all user emails.

## 3. Test Runner (Draft Plan)
- `permission_denied` for all above payloads.
- `permission_granted` for legitimate operations (Admin creating manager, Manager creating task for employee, Employee updating their task status).
