import { Task, TaskStatus, UserProfile, UserRole } from '../types';

const TASKS_KEY = 'taskmaster_tasks';
const USERS_KEY = 'taskmaster_users';

type TasksCallback = () => void;
const subscribers: Set<TasksCallback> = new Set();

const notifySubscribers = () => {
  subscribers.forEach(cb => cb());
};

export const taskService = {
  _getRawTasks(): Task[] {
    return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
  },

  _saveTasks(tasks: Task[]) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    notifySubscribers();
  },

  subscribeToTasks(role: string, uid: string, callback: (tasks: Task[]) => void) {
    const filterAndNotify = () => {
      let tasks = taskService._getRawTasks();
      if (role === UserRole.ADMIN) {
        // Admin sees all
      } else if (role === UserRole.MANAGER || role === UserRole.SUPERVISOR) {
        // Higher tiers see related assignments
        // For development, we allow them to see all tasks to manage the workflow
      } else {
        tasks = tasks.filter(t => t.assignedTo === uid);
      }
      callback(tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };

    subscribers.add(filterAndNotify);
    filterAndNotify();
    return () => {
      console.log('[Service] Unsubscribing from tasks feed');
      subscribers.delete(filterAndNotify);
    };
  },

  async createTask(taskData: Partial<Task>) {
    const tasks = taskService._getRawTasks();
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 11),
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      assignedTo: taskData.assignedTo || '',
      assignedToName: taskData.assignedToName,
      assignedBy: taskData.assignedBy || '',
      assignedByName: taskData.assignedByName,
      status: taskData.status || TaskStatus.PENDING,
      deadline: taskData.deadline || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...taskData,
    } as Task;

    tasks.push(newTask);
    taskService._saveTasks(tasks);
    return newTask.id;
  },

  async updateTask(taskId: string, updates: Partial<Task>) {
    const tasks = taskService._getRawTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      tasks[index] = {
        ...tasks[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      taskService._saveTasks(tasks);
    }
  },

  async deleteTask(taskId: string) {
    console.log('[Service] Attempting to delete task:', taskId);
    const tasks = taskService._getRawTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    if (tasks.length === filtered.length) {
      console.warn('[Service] Source task ID not found in database:', taskId);
    }
    taskService._saveTasks(filtered);
    return true;
  },

  _getRawUsers(): UserProfile[] {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  },

  async getAllUsers(): Promise<UserProfile[]> {
    return this._getRawUsers();
  },

  async createUser(userData: Partial<UserProfile>) {
    const users = this._getRawUsers();
    const newUser: UserProfile = {
      id: Math.random().toString(36).substring(2, 11),
      name: userData.name || 'Unknown',
      email: userData.email || '',
      role: userData.role || UserRole.EMPLOYEE,
      createdAt: new Date().toISOString(),
      ...userData
    } as UserProfile;
    
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return newUser;
  },

  async deleteUser(userId: string) {
    console.log('[Service] Revoking user registration:', userId);
    const users = taskService._getRawUsers();
    const filtered = users.filter(u => u.id !== userId);
    localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
    
    // Also cleanup their tasks to maintain database integrity
    const tasks = taskService._getRawTasks();
    const remainingTasks = tasks.filter(t => t.assignedTo !== userId);
    taskService._saveTasks(remainingTasks);
    
    console.log('[Service] User and associated tasks purged.');
    return true;
  }
};
