import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { authService } from '../services/authService';
import { taskService } from '../services/taskService';
import { UserProfile, Task, UserRole, TaskStatus, ITRole } from '../types';
import { 
  Users, 
  CheckSquare, 
  Clock, 
  TrendingUp, 
  Plus, 
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Star,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  Upload,
  FileText,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';

interface DashboardProps {
  user: UserProfile;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionTask, setSubmissionTask] = useState<Task | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '', deadline: '' });
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.EMPLOYEE, itRole: '' });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await taskService.createUser({
      ...newUser,
      itRole: newUser.itRole as ITRole,
      createdAt: new Date().toISOString()
    });
    const updatedUsers = await taskService.getAllUsers();
    setAllUsers(updatedUsers);
    setShowUserModal(false);
    setNewUser({ name: '', email: '', role: UserRole.EMPLOYEE, itRole: '' });
  };

  useEffect(() => {
    const unsubscribe = taskService.subscribeToTasks(user.role, user.id, (fetchedTasks) => {
      console.log('[Dashboard] Received tasks update:', fetchedTasks.length);
      setTasks(fetchedTasks);
      setLoading(false);
    });

    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER || user.role === UserRole.SUPERVISOR) {
      taskService.getAllUsers().then(users => {
        console.log('[Dashboard] Loaded users:', users.length);
        setAllUsers(users);
      });
    }

    return () => unsubscribe();
  }, [user.id, user.role]);

  const handleLogout = () => authService.logout();

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignedUser = allUsers.find(u => u.id === newTask.assignedTo);
    await taskService.createTask({
      ...newTask,
      assignedBy: user.id,
      assignedByName: user.name,
      assignedToName: assignedUser?.name || 'Unknown Unit',
      status: TaskStatus.PENDING,
    });
    setShowTaskModal(false);
    setNewTask({ title: '', description: '', assignedTo: '', deadline: '' });
  };

  const handleStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === TaskStatus.COMPLETED && user.role === UserRole.EMPLOYEE) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSubmissionTask(task);
        setSubmissionText(task.workSubmission || '');
        setShowSubmissionModal(true);
        return;
      }
    }
    await taskService.updateTask(taskId, { status: newStatus });
  };

  const handleSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionTask) {
      setIsUploading(true);
      
      let workFileName = '';
      let workFileData = '';

      const file = fileInputRef.current?.files?.[0];
      if (file) {
        workFileName = file.name;
        // Basic check for file size (limit to ~1MB for localStorage safety)
        if (file.size > 1024 * 1024) {
          alert('Asset exceeds 1MB threshold. Please optimize file size for localized storage.');
          setIsUploading(false);
          return;
        }

        // Convert to base64
        workFileData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      await taskService.updateTask(submissionTask.id, { 
        status: TaskStatus.COMPLETED,
        workSubmission: submissionText,
        workFileName,
        workFileData
      });
      
      setIsUploading(false);
      setShowSubmissionModal(false);
      setSubmissionTask(null);
      setSubmissionText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRateTask = async (taskId: string, rating: number) => {
    await taskService.updateTask(taskId, { rating });
  };

  const handleDeleteUser = async (userId: string) => {
    // Shorter confirm to avoid potential browser issues
    if (window.confirm('Delete this user?')) {
      try {
        console.log('[Dashboard] Revoking user:', userId);
        await taskService.deleteUser(userId);
        
        // Immediate local state update for responsiveness
        setAllUsers(prev => prev.filter(u => u.id !== userId));
        
        // Optional: toast or alert success
        console.log('[Dashboard] User purged from state');
      } catch (err) {
        console.error('[Dashboard] User delete failure:', err);
        alert('System Error: Identity revocation failed.');
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Purge this assignment?')) {
      try {
        console.log('[Dashboard] Purging task:', taskId);
        await taskService.deleteTask(taskId);
        
        // Optimistic UI update
        setTasks(prev => prev.filter(t => t.id !== taskId));
        
        console.log('[Dashboard] Task purged from local state');
      } catch (err) {
        console.error('[Dashboard] Task purge failure:', err);
        alert('System Error: Task purging failed.');
      }
    }
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
    inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
  };

  const renderDashboardOverview = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={stats.total} />
        <StatCard label="Active Personnel" value={allUsers.length || '—'} isManagerInfo />
        <StatCard label="Efficiency" value={`${stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%`} />
        <StatCard label="System Status" value="Optimal" isStatus />
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 bg-white border border-[#E4E3E0] shadow-sm">
          <div className="p-5 border-b border-[#F0F0F0] flex justify-between items-center">
            <h2 className="font-serif italic text-[#141414]">Recent Global Tasks</h2>
            <button onClick={() => setActiveView('tasks')} className="text-[10px] uppercase font-bold tracking-widest text-[#b4945c] hover:underline">View All</button>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            {tasks.slice(0, 6).map(task => (
              <TaskRow 
                key={task.id} 
                task={task} 
                onStatusChange={handleStatusUpdate}
                showRating={user.role !== UserRole.EMPLOYEE && task.status === TaskStatus.COMPLETED}
                onRate={handleRateTask}
                onDelete={handleDeleteTask}
                canManage={user.role !== UserRole.EMPLOYEE}
              />
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="bg-white border border-[#E4E3E0] p-6 shadow-sm">
            <h3 className="font-serif italic text-[#141414] mb-4">Execution Summary</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#999]">Velocity Index</span>
                <span className="text-[#b4945c]">{stats.completed} / {stats.total}</span>
              </div>
              <div className="w-full bg-[#F0F0F0] h-[2px]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.total ? (stats.completed / stats.total) * 100 : 0}%` }}
                  className="bg-[#b4945c] h-full"
                ></motion.div>
              </div>
              
              <div className="pt-4 border-t border-[#F0F0F0]">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#999] mb-4">Latest Ratings</h4>
                <div className="space-y-4">
                  {tasks.filter(t => t.rating).slice(0, 3).map(t => (
                    <div key={t.id} className="flex justify-between items-center text-xs">
                      <span className="text-[#666] truncate flex-1 pr-4 italic">{t.title}</span>
                      <div className="flex text-[#b4945c] gap-0.5">
                        {[...Array(5)].map((_, i) => (
                           <Star key={i} size={10} fill={i < (t.rating || 0) ? 'currentColor' : 'none'} color="currentColor" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F9F9F8] font-sans overflow-hidden text-[#141414]">
      <Sidebar 
        role={user.role} 
        userName={user.name} 
        onLogout={handleLogout} 
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <main className="flex-1 overflow-y-auto relative">
        <header className="h-20 border-b border-[#E4E3E0] px-10 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-xl font-serif italic text-[#141414]">
              {activeView === 'dashboard' ? 'Executive Dashboard' : activeView.replace('-', ' ')}
            </h2>
            <p className="text-[10px] text-[#999] uppercase tracking-widest font-bold">
              {activeView === 'dashboard' ? 'System Overview & Task Distribution' : 'Resource Logistics'}
            </p>
          </div>
          
          {(user.role === UserRole.ADMIN || user.role === UserRole.MANAGER || user.role === UserRole.SUPERVISOR) && (
            <div className="flex gap-4">
               <button 
                onClick={() => setShowUserModal(true)}
                className="hidden md:flex border border-[#E4E3E0] text-[#141414] px-5 py-2 text-[10px] items-center gap-2 hover:bg-[#F9F9F8] transition-colors uppercase font-bold tracking-widest"
              >
                <Users size={14} className="text-[#b4945c]" />
                Add Entity
              </button>
               <button 
                onClick={() => setShowTaskModal(true)}
                className="bg-[#141414] text-white px-5 py-2 text-[10px] flex items-center gap-2 hover:bg-[#222] transition-all active:scale-95 uppercase font-bold tracking-widest"
              >
                <Plus size={14} />
                Assign Task
              </button>
            </div>
          )}
        </header>

        <div className="p-10 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'dashboard' && renderDashboardOverview()}
              {activeView === 'tasks' && <TasksView tasks={tasks} onStatusChange={handleStatusUpdate} role={user.role} onRate={handleRateTask} onDelete={handleDeleteTask} />}
              {activeView === 'manage-users' && <UsersView users={allUsers} tasks={tasks} currentUserRole={user.role} onDeleteUser={handleDeleteUser} />}
              {activeView === 'all-tasks' && <TasksView tasks={tasks} onStatusChange={handleStatusUpdate} isAllView onRate={handleRateTask} role={user.role} onDelete={handleDeleteTask} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute pointer-events-none inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(180,148,92,0.03)_0%,_transparent_50%)]"></div>
      </main>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-[#141414]/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#E4E3E0] p-10 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative"
          >
            <button onClick={() => setShowUserModal(false)} className="absolute top-6 right-6 text-[#CCC] hover:text-[#141414]"><X size={20} /></button>
            <h2 className="text-2xl font-serif italic text-[#141414] mb-6">Register Personnel</h2>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#999] tracking-widest ml-1">Identity</label>
                <input 
                  className="w-full bg-[#F9F9F8] border border-[#E4E3E0] p-3 text-xs text-[#141414] focus:border-[#b4945c] outline-none transition-all placeholder:text-[#BBB]" 
                  value={newUser.name} 
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Full Legal Name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#999] tracking-widest ml-1">Terminal Address</label>
                <input 
                  type="email"
                  className="w-full bg-[#F9F9F8] border border-[#E4E3E0] p-3 text-xs text-[#141414] focus:border-[#b4945c] outline-none transition-all placeholder:text-[#BBB]" 
                  value={newUser.email} 
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  placeholder="name@nexus.io"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#999] tracking-widest ml-1">IT Specialization</label>
                <select 
                  className="w-full bg-[#F9F9F8] border border-[#E4E3E0] p-3 text-xs text-[#141414] focus:border-[#b4945c] outline-none transition-all"
                  value={newUser.itRole}
                  onChange={e => setNewUser({...newUser, itRole: e.target.value})}
                  required
                >
                  <option value="">Select Specialization</option>
                  {Object.values(ITRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#999] tracking-widest ml-1">Security Tier</label>
                <select 
                  className="w-full bg-[#F9F9F8] border border-[#E4E3E0] p-3 text-xs text-[#141414] focus:border-[#b4945c] outline-none transition-all"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                  required
                >
                  <option value={UserRole.EMPLOYEE}>Employee Tier</option>
                  <option value={UserRole.MANAGER}>Manager Tier</option>
                  {user.role === UserRole.ADMIN && <option value={UserRole.ADMIN}>Admin Tier</option>}
                </select>
              </div>
              <button type="submit" className="w-full bg-[#141414] text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#222] transition-colors mt-4">
                Initialize Profile
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-[#141414]/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#E4E3E0] p-10 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative"
          >
            <button onClick={() => setShowTaskModal(false)} className="absolute top-6 right-6 text-[#CCC] hover:text-[#141414]"><X size={20} /></button>
            <h2 className="text-2xl font-serif italic text-[#141414] mb-6">Assign Logistics</h2>
            <form onSubmit={handleCreateTask} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#999] tracking-widest ml-1">Directive</label>
                <input 
                  className="w-full bg-[#F9F9F8] border border-[#E4E3E0] p-3 text-xs text-[#141414] focus:border-[#b4945c] outline-none transition-all placeholder:text-[#BBB]" 
                  value={newTask.title} 
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Task identification"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#999] tracking-widest ml-1">Context</label>
                <textarea 
                  className="w-full bg-[#F9F9F8] border border-[#E4E3E0] p-3 text-xs text-[#141414] focus:border-[#b4945c] outline-none transition-all h-24 placeholder:text-[#BBB]" 
                  value={newTask.description} 
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Operational parameters..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-[#999] tracking-widest ml-1">Recipient</label>
                  <select 
                    className="w-full bg-[#F9F9F8] border border-[#E4E3E0] p-3 text-xs text-[#141414] focus:border-[#b4945c] outline-none transition-all"
                    value={newTask.assignedTo}
                    onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                    required
                  >
                    <option value="">Select Unit</option>
                    {allUsers.filter(u => u.role === UserRole.EMPLOYEE).map(u => (
                      <option key={u.id} value={u.id}>{u.name} — {u.itRole || 'Unit'}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-[#999] tracking-widest ml-1">Threshold</label>
                  <input 
                    type="date"
                    className="w-full bg-[#F9F9F8] border border-[#E4E3E0] p-3 text-xs text-[#141414] focus:border-[#b4945c] outline-none transition-all" 
                    value={newTask.deadline}
                    onChange={e => setNewTask({...newTask, deadline: e.target.value})}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#141414] text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#222] transition-colors mt-4">
                Deploy Task
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Submission Modal */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-[#141414]/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#E4E3E0] p-10 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative"
          >
            <button onClick={() => setShowSubmissionModal(false)} className="absolute top-6 right-6 text-[#CCC] hover:text-[#141414]"><X size={20} /></button>
            <h2 className="text-2xl font-serif italic text-[#141414] mb-2">Submit Execution</h2>
            <p className="text-[10px] text-[#999] uppercase tracking-widest font-bold mb-6">Provide proof of task completion</p>
            
            <form onSubmit={handleSubmission} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#999] tracking-widest ml-1">Work Log / Outcome Description</label>
                <textarea 
                  className="w-full bg-[#F9F9F8] border border-[#E4E3E0] p-3 text-xs text-[#141414] focus:border-[#b4945c] outline-none transition-all h-32 placeholder:text-[#BBB]" 
                  value={submissionText} 
                  onChange={e => setSubmissionText(e.target.value)}
                  placeholder="Detail the work performed..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#999] tracking-widest ml-1">Artifact Upload (Max 1MB)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#E4E3E0] p-6 hover:bg-[#F9F9F8] hover:border-[#b4945c]/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={() => setIsUploading(false)} // Force re-render to show filename
                  />
                  <Upload size={20} className="text-[#CCC] group-hover:text-[#b4945c] transition-colors" />
                  <span className="text-[10px] text-[#999] uppercase font-bold tracking-widest">
                    {fileInputRef.current?.files?.[0]?.name || 'Select Artifact Package'}
                  </span>
                </div>
              </div>
              
              <div className="bg-[#b4945c]/5 p-4 border border-[#b4945c]/10">
                <p className="text-[9px] text-[#b4945c] font-bold uppercase tracking-widest leading-normal">
                  Note: Upon submission, this task status will be finalized as 'Executed'. This record will be submitted to the supervisor for quality assessment and rating.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isUploading}
                className="w-full bg-[#141414] text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#222] transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading Metadata...' : 'Confirm Execution'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, isManagerInfo, isStatus, isEfficiency }: any) => (
  <div className="bg-white border border-[#E4E3E0] p-6 group hover:border-[#CCC] transition-colors relative overflow-hidden shadow-sm">
    <div className="text-[10px] uppercase text-[#999] tracking-widest mb-2 font-bold">{label}</div>
    <div className={`text-3xl font-serif italic flex items-center ${isStatus ? 'text-[#141414]' : ''}`}>
      {isStatus && <div className="w-2 h-2 rounded-full bg-green-500 mr-3 animate-pulse"></div>}
      {value}
    </div>
    {isManagerInfo && <div className="text-[10px] text-[#b4945c] mt-2 font-bold uppercase tracking-tighter italic">Managers & Employees</div>}
    {!isManagerInfo && !isStatus && <div className="text-[10px] text-[#999] mt-2 italic">Updated just now</div>}
    {isStatus && <div className="text-[10px] text-[#999] mt-2 italic">All services operational</div>}
    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-[#b4945c]/[0.05] rounded-full"></div>
  </div>
);

const TaskRow = ({ task, onStatusChange, showRating, onRate, onDelete, canManage }: any) => {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING: return 'border-red-100 text-red-600 bg-red-50';
      case TaskStatus.IN_PROGRESS: return 'border-amber-100 text-amber-600 bg-amber-50';
      case TaskStatus.COMPLETED: return 'border-emerald-100 text-emerald-600 bg-emerald-50';
      default: return 'border-[#F0F0F0] text-[#999]';
    }
  };

  return (
    <div className="group transition-colors bg-white">
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer hover:bg-[#F9F9F8] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="p-1 text-[#CCC] group-hover:text-[#b4945c] transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          <div>
            <h3 className="text-sm font-serif italic text-[#141414]">{task.title}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-[9px] uppercase font-bold px-3 py-0.5 border rounded-full ${getStatusStyle(task.status)} transition-colors`}>
                {task.status.replace('-', ' ')}
              </span>
              <span className="text-[10px] text-[#999] flex items-center gap-1 font-mono uppercase tracking-tighter">
                <Calendar size={10} /> {task.deadline}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4 md:mt-0" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <select 
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
              className="text-[10px] uppercase font-bold border border-[#E4E3E0] bg-white text-[#b4945c] px-3 py-1.5 outline-none hover:border-[#CCC] transition-all cursor-pointer appearance-none text-center"
            >
              <option value={TaskStatus.PENDING}>Pending</option>
              <option value={TaskStatus.IN_PROGRESS}>In Transit</option>
              <option value={TaskStatus.COMPLETED}>Executed</option>
            </select>
          </div>

          {showRating && (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => onRate(task.id, star)}
                  className={`transition-all hover:scale-110 ${task.rating >= star ? 'text-[#b4945c]' : 'text-[#E4E3E0]'}`}
                >
                  <Star size={14} fill={task.rating >= star ? 'currentColor' : 'none'} color="currentColor" />
                </button>
              ))}
            </div>
          )}

          {task.rating && !showRating && (
            <div className="flex gap-0.5 text-[#b4945c]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={10} fill={i < task.rating ? 'currentColor' : 'none'} color="currentColor" />
              ))}
            </div>
          )}
          
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className={`p-2 transition-colors rounded-full ${showMenu ? 'bg-[#141414] text-white' : 'text-[#CCC] hover:text-[#141414] hover:bg-[#F0F0F0]'}`}
            >
              <MoreVertical size={16} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[100]" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E4E3E0] shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[101] overflow-hidden"
                  >
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        setExpanded(!expanded); 
                        setShowMenu(false); 
                      }}
                      className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#141414] hover:bg-[#F9F9F8] transition-colors border-b border-[#F0F0F0] flex items-center gap-2"
                    >
                      {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {expanded ? 'Hide Logistics' : 'View Logistics'}
                    </button>
                    {canManage && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation();
                          console.log('Deleting task:', task.id);
                          onDelete(task.id); 
                          setShowMenu(false); 
                        }}
                        className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={12} />
                        Delete Task
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#F9F9F8] border-t border-[#F0F0F0]"
          >
            <div className="p-8 md:pl-16 grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-8">
                <h4 className="text-[10px] uppercase font-bold text-[#999] tracking-widest mb-3">Context & Parameters</h4>
                <div className="text-xs text-[#666] leading-relaxed italic border-l border-[#E4E3E0] pl-4 mb-6">
                  {task.description || 'No additional contextual metadata provided for this directive.'}
                </div>

                {task.workSubmission && (
                  <div className="mb-6">
                    <h4 className="text-[10px] uppercase font-bold text-[#b4945c] tracking-widest mb-3">Submission Record</h4>
                    <div className="text-xs text-[#141414] leading-relaxed bg-[#b4945c]/5 border border-[#b4945c]/10 p-4 font-mono mb-4 whitespace-pre-wrap">
                      {task.workSubmission}
                    </div>
                    
                    {task.workFileName && (
                      <div className="flex items-center justify-between p-3 border border-[#E4E3E0] bg-white rounded-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#F9F9F8] text-[#b4945c]">
                            <FileText size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]">{task.workFileName}</p>
                            <p className="text-[9px] text-[#999] uppercase tracking-tighter">Verified Artifact</p>
                          </div>
                        </div>
                        <a 
                          href={task.workFileData} 
                          download={task.workFileName}
                          className="p-2 text-[#CCC] hover:text-[#b4945c] transition-colors"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="col-span-12 md:col-span-4 space-y-4">
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-[#999] tracking-widest mb-1">Assigned Unit</h4>
                  <p className="text-xs text-[#141414] italic truncate">{task.assignedToName || 'Designated Employee ID: ' + task.assignedTo}</p>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-[#999] tracking-widest mb-1">Authorizing Agent</h4>
                  <p className="text-xs text-[#141414] italic truncate">{task.assignedByName || 'Supervisor'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TasksView = ({ tasks, onStatusChange, isAllView = false, onRate, role, onDelete }: any) => {
  const [filter, setFilter] = useState('');

  const filteredTasks = tasks.filter((t: Task) => 
    t.title.toLowerCase().includes(filter.toLowerCase()) || 
    t.description.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-white border border-[#E4E3E0] shadow-sm">
      <div className="p-5 border-b border-[#F0F0F0] flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-sm font-serif italic text-[#141414]">
            {isAllView ? 'Comprehensive Asset Registry' : 'Standard Assignments'}
          </h2>
          <p className="text-[10px] text-[#999] font-bold uppercase tracking-widest mt-0.5">Secure Log</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CCC]" size={14} />
            <input 
              className="pl-9 pr-3 py-2 bg-[#F9F9F8] border border-[#E4E3E0] text-xs text-[#141414] outline-none w-full md:w-64 focus:border-[#b4945c] transition-all placeholder:text-[#BBB]" 
              placeholder="Query directives..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <button className="px-3 border border-[#E4E3E0] hover:bg-[#F9F9F8] transition-colors"><Filter size={14} className="text-[#999]" /></button>
        </div>
      </div>
      <div className="divide-y divide-[#F0F0F0]">
        {filteredTasks.length === 0 ? (
          <div className="p-20 text-center text-[#CCC]">
            <CheckSquare size={40} className="mx-auto mb-4 opacity-20" />
            <p className="text-xs font-serif italic uppercase tracking-widest">No matching records found in central database.</p>
          </div>
        ) : (
          filteredTasks.map((task: Task) => (
            <TaskRow 
              key={task.id} 
              task={task} 
              onStatusChange={onStatusChange}
              showRating={onRate && task.status === TaskStatus.COMPLETED && role !== UserRole.EMPLOYEE}
              onRate={onRate}
              onDelete={onDelete}
              canManage={role !== UserRole.EMPLOYEE}
            />
          ))
        )}
      </div>
    </div>
  );
};

const UserMenu = ({ user, onDelete, canManage }: any) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className={`p-2 transition-colors rounded-full ${showMenu ? 'bg-[#141414] text-white' : 'text-[#CCC] hover:text-[#141414] hover:bg-[#F0F0F0]'}`}
      >
        <MoreVertical size={16} />
      </button>
      <AnimatePresence>
        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-[100]" 
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E4E3E0] shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[101] overflow-hidden"
            >
              <button 
                onClick={(e) => { 
                  e.stopPropagation();
                  alert(`Identity Profile: ${user.name}\nEmail: ${user.email}\nSecurity Tier: ${user.role}\nJoined: ${new Date(user.createdAt).toLocaleDateString()}`);
                  setShowMenu(false); 
                }}
                className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#141414] hover:bg-[#F9F9F8] transition-colors border-b border-[#F0F0F0] flex items-center gap-2"
              >
                <FileText size={12} />
                View Dossier
              </button>
              {canManage && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    onDelete(user.id); 
                    setShowMenu(false); 
                  }}
                  className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={12} />
                  Revoke Identity
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const UsersView = ({ users, tasks, currentUserRole, onDeleteUser }: any) => {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const toggleUser = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  return (
    <div className="bg-white border border-[#E4E3E0] shadow-sm">
      <div className="p-5 border-b border-[#F0F0F0] flex justify-between items-center">
        <h2 className="text-sm font-serif italic text-[#141414]">Personnel Directory</h2>
        <button className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#b4945c] hover:underline transition-all">Export Protocol</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-[#999] font-bold border-b border-[#F0F0F0]">
              <th className="px-8 py-5 font-bold w-12"></th>
              <th className="px-8 py-5 font-bold">Identity</th>
              <th className="px-8 py-5 font-bold">Tier</th>
              <th className="px-8 py-5 font-bold">Workload</th>
              <th className="px-8 py-5 font-bold text-right">Ops</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {users.map((u: UserProfile) => {
              const userTasks = tasks.filter((t: any) => t.assignedTo === u.id);
              const completedCount = userTasks.filter((t: any) => t.status === TaskStatus.COMPLETED).length;
              const isExpanded = expandedUser === u.id;

              return (
                <React.Fragment key={u.id}>
                  <tr 
                    className={`hover:bg-[#F9F9F8] transition-colors group cursor-pointer ${isExpanded ? 'bg-[#F9F9F8]' : ''}`}
                    onClick={() => toggleUser(u.id)}
                  >
                    <td className="px-8 py-5 text-[#CCC] group-hover:text-[#b4945c]">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-[#F9F9F8] border border-[#E4E3E0] group-hover:border-[#b4945c]/30 flex items-center justify-center text-[10px] font-bold text-[#999] transition-colors">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs text-[#141414] font-medium">{u.name}</p>
                          <p className="text-[9px] font-mono text-[#999] tracking-tighter mt-0.5">
                            {u.itRole && <span className="text-[#b4945c] font-bold mr-2">{u.itRole}</span>}
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[9px] uppercase font-bold px-3 py-1 border rounded-full italic ${
                        u.role === UserRole.ADMIN ? 'border-red-100 text-red-600 bg-red-50' : 
                        u.role === UserRole.MANAGER ? 'border-[#b4945c]/20 text-[#b4945c] bg-[#b4945c]/5' : 
                        u.role === UserRole.SUPERVISOR ? 'border-indigo-100 text-indigo-600 bg-indigo-50' :
                        'border-[#F0F0F0] text-[#999]'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-[#999] uppercase tracking-tighter">Efficiency</span>
                          <span className="text-[#b4945c]">{userTasks.length > 0 ? Math.round((completedCount / userTasks.length) * 100) : 0}%</span>
                        </div>
                        <div className="w-24 h-[1px] bg-[#F0F0F0]">
                          <div 
                            className="bg-[#b4945c] h-full transition-all duration-1000" 
                            style={{ width: `${userTasks.length > 0 ? (completedCount / userTasks.length) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-[9px] text-[#999] italic">{completedCount} Executed / {userTasks.length} Total</p>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end items-center gap-2" onClick={e => e.stopPropagation()}>
                        {currentUserRole === UserRole.ADMIN && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteUser(u.id);
                            }}
                            className="text-[#CCC] hover:text-red-500 transition-colors p-1"
                            title="Revoke Identity"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <UserMenu user={u} onDelete={onDeleteUser} canManage={currentUserRole === UserRole.ADMIN} />
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-[#FBFBFA]">
                      <td colSpan={5} className="p-0">
                        <div className="px-16 py-8 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[10px] uppercase font-bold text-[#999] tracking-widest flex items-center gap-2">
                              <span className="w-1 h-1 bg-[#b4945c] rounded-full"></span>
                              Assigned Task History
                            </h4>
                            <span className="text-[10px] font-mono text-[#CCC] uppercase">Personnel ID: {u.id.substring(0, 8)}</span>
                          </div>
                          
                          {userTasks.length === 0 ? (
                            <div className="py-8 text-center text-[#CCC] border border-dashed border-[#E4E3E0]">
                              <p className="text-[10px] italic uppercase tracking-widest">No active or historical directives found for this unit.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {userTasks.map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between py-3 border-b border-[#F0F0F0] group/task">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <p className="text-xs text-[#666] italic group-hover/task:text-[#141414] transition-colors">{t.title}</p>
                                      <span className={`text-[8px] uppercase font-bold px-2 py-0.5 border rounded-full ${
                                        t.status === TaskStatus.COMPLETED ? 'border-emerald-100 text-emerald-600' : 'border-[#F0F0F0] text-[#999]'
                                      }`}>
                                        {t.status}
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-[#999] mt-1 font-mono uppercase">Due Threshold: {t.deadline}</p>
                                  </div>
                                  {t.rating && (
                                    <div className="flex text-[#b4945c]/40 gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={8} fill={i < t.rating ? 'currentColor' : 'none'} color="currentColor" />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
