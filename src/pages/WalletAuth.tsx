import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Shield, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Spotlight } from '@/components/ui/spotlight';
import { KoliButton } from '@/components/ui/koli-button';
import koliLogo from '@/assets/koli-logo.png';

export default function WalletAuth() {
  const { user, userData, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [authorizing, setAuthorizing] = useState(false);
  const [checking, setChecking] = useState(true);

  const searchParams = new URLSearchParams(window.location.search);
  const redirectUri = searchParams.get('redirect_uri') || 'https://koli-wallet.web.app/auth/callback';
  const appName = searchParams.get('app') || 'K-Kash';
  const state = searchParams.get('state') || '';

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      sessionStorage.setItem('wallet_auth_redirect', redirectUri);
      sessionStorage.setItem('wallet_auth_state', state);
      const redirectPath = `${window.location.pathname}${window.location.search}`;
      navigate(`/signin?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
    }
  }, [user, loading, navigate, redirectUri, state]);

  // Once authenticated, check if this user already has a wallet account
  useEffect(() => {
    if (!user || loading) return;

    const checkExisting = async () => {
      try {
        const snap = await getDoc(doc(db, 'walletAccounts', user.uid));
        if (snap.exists()) {
          // Already authorized before — auto-issue a new auth code and redirect silently
          await issueAuthCode(user.uid, userData?.email ?? '');
        } else {
          // First time — show consent page
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    };

    checkExisting();
  }, [user, loading]);

  const issueAuthCode = async (userId: string, email: string) => {
    const authCode = `koli_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min window
    const firstName = userData?.firstName || '';
    const lastName = userData?.lastName || '';
    const displayName = userData?.name || `${firstName} ${lastName}`.trim() || email.split('@')[0];
    const avatarInitial = (firstName[0] || email[0]).toUpperCase();
    await setDoc(doc(db, 'walletAuthorizations', authCode), {
      userId,
      email,
      appName,
      displayName,
      avatarInitial,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt.toISOString(),
      used: false,
    });
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) redirectUrl.searchParams.set('state', state);
    window.location.href = redirectUrl.toString();
  };

  const handleAuthorize = async () => {
    if (!user || !userData) return;
    setAuthorizing(true);
    setError('');
    try {
      // Mark this user as having a wallet account
      await setDoc(doc(db, 'walletAccounts', user.uid), {
        userId: user.uid,
        email: userData.email,
        createdAt: serverTimestamp(),
      });
      await issueAuthCode(user.uid, userData.email);
    } catch (err) {
      console.error('Authorization error:', err);
      setError('Failed to authorize. Please try again.');
      setAuthorizing(false);
    }
  };

  const handleDeny = () => {
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('error', 'access_denied');
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }
    window.location.href = redirectUrl.toString();
  };

  if (loading || checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Spotlight />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center relative z-10"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen flex flex-col bg-background safe-top safe-bottom relative overflow-hidden">
      <Spotlight />
      
      <div className="flex-1 flex flex-col px-6 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center"
        >
          <img src={koliLogo} alt="KOLI" className="w-12 h-12" />
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-6"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Authorize {appName}
            </h1>
            <p className="text-muted-foreground text-sm">
              {appName} wants to access your KOLI account
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full space-y-6"
          >
            {/* User Info Card */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {userData?.firstName} {userData?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{userData?.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">This will allow {appName} to:</p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>View your profile information</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Access your wallet balance</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Manage transactions on your behalf</span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-3">
              <KoliButton
                onClick={handleAuthorize}
                disabled={authorizing}
                className="w-full"
              >
                {authorizing ? 'Authorizing...' : 'Allow Access'}
              </KoliButton>
              <button
                onClick={handleDeny}
                disabled={authorizing}
                className="w-full bg-secondary text-foreground py-3 rounded-xl font-semibold hover:bg-secondary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-border"
              >
                Deny
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              By allowing access, you agree to share your KOLI account information with {appName}.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
