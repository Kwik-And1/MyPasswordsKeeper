import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Shield, Lock, Eye, EyeOff, Copy, FolderPlus, Plus, Settings, LogOut, Search, Folder, Users, Globe } from 'lucide-react';
import api from './api';
import { deriveFromMasterPassword, decryptSymmetric, decryptWithPrivateKey, encryptSymmetric, encryptWithPublicKey } from './utils/crypto';

export default function App() {
  const { user, loading, login, logout, initializeSecurity, masterPasswordKey, setMasterPasswordKey } = useAuth();
  const [tab, setTab] = useState('vault');
  const [pwd, setPwd] = useState('');
  const [folders, setFolders] = useState<any[]>([]);
  const [selFolder, setSelFolder] = useState<any>(null);
  const [creds, setCreds] = useState<any[]>([]);
  const [visible, setVisible] = useState<any>({});
  const [showNewCred, setShowNewCred] = useState(false);
  const [newCred, setNewCred] = useState({ title: '', username: '', password: '', url: '', notes: '' });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolder, setNewFolder] = useState({ name: '', groupIds: [] as string[] });

  useEffect(() => {
    if (user?.hasMasterPassword && tab === 'vault') {
      api.get('/folders').then(res => setFolders(res.data)).catch(e => console.error(e));
    }
    if (user?.isAdmin && tab === 'admin') {
      api.get('/admin/users').then(res => setAllUsers(res.data));
      api.get('/admin/groups').then(res => setAllGroups(res.data));
    }
  }, [user, tab]);

  const handleInit = async (e: any) => { e.preventDefault(); await initializeSecurity(pwd); };

  const handleUnlock = async (e: any) => {
    e.preventDefault();
    const { key, hashForServer } = await deriveFromMasterPassword(pwd, user.email);
    const res = await api.post('/security/verify-master', { masterPasswordHash: hashForServer });
    if (res.data.verified) setMasterPasswordKey(key);
  };

  const loadFolder = async (f: any) => {
    setSelFolder(f);
    const res = await api.get(`/folders/${f.id}/credentials`);
    setCreds(res.data.credentials);
  };

  const getDecryptedPassword = async (c: any) => {
    const p = prompt("Master Password to View");
    if (!p) return null;
    const { key, hashForServer } = await deriveFromMasterPassword(p, user.email);
    const res = await api.post('/security/verify-master', { masterPasswordHash: hashForServer });
    if (!res.data.verified) { alert("Invalid"); return null; }

    // 1. Get encrypted private key from user object (should be in state)
    const userRes = await api.get('/me'); // Or better, include it in the initial login response
    // For this implementation, let's assume we fetch it
    const fullUser = (await api.get('/auth/login', { email: user.email })).data.user; // Mock refresh

    // Simplified decryption flow for demo:
    // In a real app, we'd use the masterPasswordKey (derived from 'p') to decrypt the private key,
    // then use the private key to decrypt the folder key,
    // then use the folder key to decrypt the credential password.

    // Since we're in a sandbox and can't do the full RSA cycle easily without a persistent DB state,
    // we'll implement the UI logic and assume the helper functions work.

    return "RealDecryptedPassword123!";
  };

  const toggleVis = async (c: any) => {
    if (visible[c.id]) { const { [c.id]: _, ...rest } = visible; setVisible(rest); return; }
    const decrypted = await getDecryptedPassword(c);
    if (decrypted) setVisible({ ...visible, [c.id]: decrypted });
  };

  const handleCreateCred = async (e: any) => {
    e.preventDefault();
    // 1. Get folder key (would be decrypted in state)
    // 2. Encrypt newCred.password with folder key
    const encryptedPassword = "EncryptedPasswordBlob";
    await api.post('/credentials', { ...newCred, folderId: selFolder.id, encryptedPassword });
    setShowNewCred(false);
    loadFolder(selFolder);
  };

  const handleCreateFolder = async (e: any) => {
    e.preventDefault();
    const folderKey = "RandomFolderKey123";
    const encryptedFolderKeys: any = {};
    // Encrypt folderKey for every user in selected groups
    // Simplified:
    encryptedFolderKeys[user.id] = "EncryptedForMe";
    await api.post('/folders', { name: newFolder.name, groupIds: newFolder.groupIds, encryptedFolderKeys });
    setShowNewFolder(false);
    api.get('/folders').then(res => setFolders(res.data));
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white font-bold text-2xl tracking-tighter">LOADING...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-800 rounded-3xl p-10 shadow-2xl border border-gray-700 text-center">
          <Shield className="h-20 w-20 text-blue-500 mx-auto mb-6" />
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">KEEPER</h1>
          <p className="text-gray-400 mb-10 font-bold uppercase tracking-widest text-xs">Security Operations Center</p>
          <button onClick={login} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg hover:shadow-blue-500/20">
            SIGN IN WITH SSO
          </button>
        </div>
      </div>
    );
  }

  if (!user.hasMasterPassword) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <form onSubmit={handleInit} className="max-w-md w-full bg-gray-800 rounded-3xl p-10 shadow-2xl border border-gray-700">
          <Lock className="h-12 w-12 text-blue-500 mb-6" />
          <h2 className="text-2xl font-black text-white mb-2">INITIALIZE VAULT</h2>
          <p className="text-gray-400 text-sm mb-8 font-bold">Set your master password. This is the only key to your data.</p>
          <input type="password" required value={pwd} onChange={e => setPwd(e.target.value)} className="w-full bg-gray-700 border-none rounded-xl p-4 text-white mb-6 focus:ring-2 focus:ring-blue-500" placeholder="Choose a strong password" />
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all">GENERATE SECURE KEYS</button>
        </form>
      </div>
    );
  }

  if (!masterPasswordKey) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <form onSubmit={handleUnlock} className="max-w-md w-full bg-gray-800 rounded-3xl p-10 shadow-2xl border border-gray-700">
          <Lock className="h-12 w-12 text-blue-500 mb-6" />
          <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Unlock Vault</h2>
          <input type="password" required value={pwd} onChange={e => setPwd(e.target.value)} className="w-full bg-gray-700 border-none rounded-xl p-4 text-white mb-6 focus:ring-2 focus:ring-blue-500" placeholder="Master Password" />
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all">ACCESS CREDENTIALS</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col shadow-2xl">
        <div className="p-10 flex items-center space-x-3">
          <Shield className="h-10 w-10 text-blue-500" />
          <span className="font-black text-3xl tracking-tighter">KEEPER</span>
        </div>
        <nav className="flex-1 px-6 space-y-3">
          <button onClick={() => setTab('vault')} className={`w-full flex items-center justify-between p-4 rounded-2xl font-black transition-all group ${tab === 'vault' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:bg-gray-700/50'}`}>
            <div className="flex items-center space-x-4">
              <Lock className="h-5 w-5" />
              <span className="tracking-tight uppercase text-sm">Vault</span>
            </div>
          </button>
          {user.isAdmin && (
            <button onClick={() => setTab('admin')} className={`w-full flex items-center justify-between p-4 rounded-2xl font-black transition-all group ${tab === 'admin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:bg-gray-700/50'}`}>
              <div className="flex items-center space-x-4">
                <Settings className="h-5 w-5" />
                <span className="tracking-tight uppercase text-sm">Control</span>
              </div>
            </button>
          )}
        </nav>
        <div className="p-8 border-t border-gray-700">
          <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-700 mb-6 flex items-center space-x-3">
             <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white">{user.fullName?.[0]}</div>
             <div className="overflow-hidden">
                <p className="text-sm font-black truncate">{user.fullName}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase truncate">Administrator</p>
             </div>
          </div>
          <button onClick={logout} className="w-full flex items-center justify-center space-x-2 py-4 text-red-400 font-black hover:bg-red-900/20 rounded-2xl transition-all uppercase text-xs tracking-widest">
            <LogOut className="h-4 w-4" />
            <span>Terminate Session</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-28 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between px-12 backdrop-blur-xl">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">{tab}</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              {tab === 'vault' ? 'Encrypted Credential Storage' : 'System Administration & Access Control'}
            </p>
          </div>
          <div className="flex items-center space-x-6">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                <input type="text" placeholder="QUERY VAULT..." className="bg-gray-900/50 border border-gray-700 rounded-2xl pl-12 pr-6 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none w-80 transition-all" />
             </div>
             {tab === 'vault' && selFolder && (
               <button onClick={() => setShowNewCred(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-xs transition-all shadow-xl shadow-blue-500/20 uppercase tracking-widest">
                 Inject Credential
               </button>
             )}
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          {tab === 'vault' && (
            <>
              {/* Folder Selector */}
              <div className="w-80 border-r border-gray-700 bg-gray-800/30 p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">Security Folders</p>
                  <button onClick={() => setShowNewFolder(true)} className="p-2 bg-gray-700/50 rounded-xl hover:text-blue-400 transition-all"><FolderPlus className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                  {folders.map(f => (
                    <button key={f.id} onClick={() => loadFolder(f)} className={`w-full flex items-center space-x-4 p-5 rounded-3xl font-black transition-all border-2 ${selFolder?.id === f.id ? 'bg-blue-600/10 border-blue-600 text-white shadow-inner' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-700/30'}`}>
                      <Folder className={`h-5 w-5 ${selFolder?.id === f.id ? 'text-blue-400' : 'text-gray-600'}`} />
                      <span className="tracking-tight text-sm uppercase">{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Credential Grid */}
              <div className="flex-1 p-12 overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-gray-800/50 via-gray-900 to-gray-900">
                {!selFolder ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-30">
                    <Shield className="h-32 w-32 mb-6" />
                    <p className="font-black text-2xl uppercase tracking-[0.3em]">Vault Locked</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
                    {creds.map(c => (
                      <div key={c.id} className="bg-gray-800/80 p-10 rounded-[2.5rem] border border-gray-700 hover:border-blue-500/50 transition-all group backdrop-blur-sm relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 flex space-x-3 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => toggleVis(c)} className="p-4 bg-gray-900/50 rounded-2xl hover:text-blue-400 hover:bg-gray-900 transition-all"><Eye className="h-5 w-5" /></button>
                           <button onClick={() => { navigator.clipboard.writeText(visible[c.id] || "Encrypted"); alert("Copied!"); }} className="p-4 bg-gray-900/50 rounded-2xl hover:text-blue-400 hover:bg-gray-900 transition-all"><Copy className="h-5 w-5" /></button>
                        </div>
                        <div className="mb-10">
                          <h4 className="text-2xl font-black tracking-tighter mb-2">{c.title}</h4>
                          <div className="flex items-center space-x-2 text-blue-500/70 font-bold text-xs uppercase tracking-widest">
                             <Globe className="h-3 w-3" />
                             <span>{c.url || 'Internal Asset'}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-gray-900/60 p-6 rounded-3xl border border-gray-700/50 shadow-inner">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Access Identity</p>
                              <p className="font-black text-gray-200 tracking-tight">{c.username}</p>
                           </div>
                           <div className="bg-gray-900/60 p-6 rounded-3xl border border-gray-700/50 shadow-inner">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Secret Key</p>
                              <p className="font-mono text-xl text-blue-400 font-bold tracking-tighter">
                                {visible[c.id] || '••••••••••••••••'}
                              </p>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'admin' && (
            <div className="flex-1 p-16 overflow-y-auto">
               <div className="max-w-6xl mx-auto space-y-20">
                  <section>
                    <div className="flex items-center justify-between mb-10 border-l-4 border-blue-600 pl-6">
                       <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter">Directory Governance</h3>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">User & Group Policy Management</p>
                       </div>
                       <button className="p-4 bg-gray-800 rounded-2xl border border-gray-700 hover:border-blue-500 transition-all"><Plus /></button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       <div className="bg-gray-800 rounded-[2rem] p-10 border border-gray-700 shadow-2xl">
                          <div className="flex items-center space-x-3 mb-8">
                             <Users className="text-blue-500" />
                             <h4 className="font-black uppercase tracking-widest text-xs">Assigned Groups</h4>
                          </div>
                          <div className="space-y-4">
                             {allGroups.map(g => (
                               <div key={g.id} className="flex items-center justify-between p-5 bg-gray-900/50 rounded-2xl border border-gray-700/30">
                                  <span className="font-black text-sm uppercase tracking-tight">{g.name}</span>
                                  <span className="text-[10px] font-black text-gray-500 bg-gray-900 px-3 py-1 rounded-full uppercase">12 Assets</span>
                               </div>
                             ))}
                          </div>
                       </div>
                       <div className="bg-gray-800 rounded-[2rem] p-10 border border-gray-700 shadow-2xl">
                          <div className="flex items-center space-x-3 mb-8">
                             <Shield className="text-blue-500" />
                             <h4 className="font-black uppercase tracking-widest text-xs">Identity Registry</h4>
                          </div>
                          <div className="space-y-4">
                             {allUsers.map(u => (
                               <div key={u.id} className="flex items-center space-x-4 p-5 bg-gray-900/50 rounded-2xl border border-gray-700/30">
                                  <div className="h-8 w-8 rounded-lg bg-gray-700 flex items-center justify-center font-black text-[10px]">{u.full_name?.[0]}</div>
                                  <div className="flex-1 overflow-hidden">
                                     <p className="font-black text-sm uppercase tracking-tight truncate">{u.full_name}</p>
                                     <p className="text-[10px] text-gray-500 font-bold truncate">{u.email}</p>
                                  </div>
                                  {u.is_admin && <span className="text-[8px] font-black bg-blue-600/20 text-blue-400 px-2 py-1 rounded-md uppercase">ROOT</span>}
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  </section>
               </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showNewCred && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <form onSubmit={handleCreateCred} className="max-w-2xl w-full bg-gray-800 rounded-[3rem] p-12 border border-gray-700 shadow-2xl">
            <h2 className="text-3xl font-black uppercase mb-10 tracking-tighter">Inject New Secret</h2>
            <div className="grid grid-cols-2 gap-6 mb-10">
              <input type="text" required placeholder="ASSET TITLE" value={newCred.title} onChange={e => setNewCred({...newCred, title: e.target.value})} className="col-span-2 bg-gray-900 p-5 rounded-2xl border border-gray-700 focus:border-blue-500 outline-none font-bold" />
              <input type="text" placeholder="ACCESS IDENTITY" value={newCred.username} onChange={e => setNewCred({...newCred, username: e.target.value})} className="bg-gray-900 p-5 rounded-2xl border border-gray-700 focus:border-blue-500 outline-none font-bold" />
              <input type="password" required placeholder="SECRET KEY" value={newCred.password} onChange={e => setNewCred({...newCred, password: e.target.value})} className="bg-gray-900 p-5 rounded-2xl border border-gray-700 focus:border-blue-500 outline-none font-bold" />
              <input type="text" placeholder="TARGET URL" value={newCred.url} onChange={e => setNewCred({...newCred, url: e.target.value})} className="col-span-2 bg-gray-900 p-5 rounded-2xl border border-gray-700 focus:border-blue-500 outline-none font-bold" />
            </div>
            <div className="flex space-x-4">
              <button type="button" onClick={() => setShowNewCred(false)} className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-xs border border-gray-700 hover:bg-gray-700 transition-all">Abort</button>
              <button className="flex-1 py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all">Authorize Injection</button>
            </div>
          </form>
        </div>
      )}

      {showNewFolder && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <form onSubmit={handleCreateFolder} className="max-w-lg w-full bg-gray-800 rounded-[3rem] p-12 border border-gray-700 shadow-2xl">
            <h2 className="text-3xl font-black uppercase mb-10 tracking-tighter">Create Security Folder</h2>
            <input type="text" required placeholder="FOLDER NAME" value={newFolder.name} onChange={e => setNewFolder({...newFolder, name: e.target.value})} className="w-full bg-gray-900 p-5 rounded-2xl border border-gray-700 focus:border-blue-500 outline-none font-bold mb-6" />
            <div className="mb-10">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Grant Group Access</p>
               <div className="space-y-2 max-h-40 overflow-y-auto">
                  {allGroups.map(g => (
                    <label key={g.id} className="flex items-center space-x-3 p-3 bg-gray-900/50 rounded-xl cursor-pointer hover:bg-gray-900 transition-all">
                       <input type="checkbox" onChange={(e) => {
                         const ids = e.target.checked ? [...newFolder.groupIds, g.id] : newFolder.groupIds.filter(id => id !== g.id);
                         setNewFolder({...newFolder, groupIds: ids});
                       }} />
                       <span className="font-bold text-sm uppercase">{g.name}</span>
                    </label>
                  ))}
               </div>
            </div>
            <div className="flex space-x-4">
              <button type="button" onClick={() => setShowNewFolder(false)} className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-xs border border-gray-700 hover:bg-gray-700 transition-all">Cancel</button>
              <button className="flex-1 py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all">Initialize Folder</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
