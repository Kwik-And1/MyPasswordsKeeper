import React, { useState, useEffect, createContext, useContext } from 'react';
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider, useMsal } from "@azure/msal-react";
import api from '../api';
import { deriveFromMasterPassword, generateKeyPair, encryptSymmetric } from '../utils/crypto';
const msalInstance = new PublicClientApplication({ auth: { clientId: "CLIENT_ID", authority: "https://login.microsoftonline.com/TENANT", redirectUri: window.location.origin } });
const AuthContext = createContext<any>(null);
export const useAuth = () => useContext(AuthContext);
export const AuthProvider = ({ children }: any) => {
  const { instance } = useMsal();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [masterPasswordKey, setMasterPasswordKey] = useState<any>(null);
  useEffect(() => { api.get('/me').then(res => setUser(res.data.user)).catch(() => {}).finally(() => setLoading(false)); }, []);
  const login = async () => {
    const res = await instance.loginPopup({ scopes: ["User.Read"] });
    const srv = await api.post('/auth/login', { email: res.account.username, name: res.account.name });
    setUser(srv.data.user);
  };
  const logout = () => { api.post('/auth/logout').then(() => { setUser(null); setMasterPasswordKey(null); instance.logoutPopup(); }); };
  const initializeSecurity = async (pwd: string) => {
    const { key, hashForServer } = await deriveFromMasterPassword(pwd, user.email);
    const { privateKeyPem, publicKeyPem } = generateKeyPair();
    const encPriv = encryptSymmetric(privateKeyPem, key);
    await api.post('/security/initialize', { publicKey: publicKeyPem, encryptedPrivateKey: encPriv, masterPasswordHash: hashForServer });
    setMasterPasswordKey(key);
    setUser({ ...user, hasMasterPassword: true });
  };
  return (
    <MsalProvider instance={msalInstance}>
      <AuthContext.Provider value={{ user, loading, login, logout, initializeSecurity, masterPasswordKey, setMasterPasswordKey }}>{children}</AuthContext.Provider>
    </MsalProvider>
  );
};
