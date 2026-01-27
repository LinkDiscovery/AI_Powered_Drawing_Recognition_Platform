import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useToast } from './ToastContext';

// User type definition
export interface User {
    email: string;
    name: string;
    plan: 'free' | 'pro';
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password?: string) => Promise<void>;
    signup: (email: string, name: string, password?: string) => Promise<void>;
    googleAuth: (token: string) => Promise<void>;
    refreshSession: () => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    expiresAt: number | null; // Unix timestamp in seconds
    token: string | null;
    isLoginModalOpen: boolean;
    openLoginModal: () => void;
    closeLoginModal: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'aidraw_auth_user';
const TOKEN_KEY = 'aidraw_auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useToast();

    const openLoginModal = () => setIsLoginModalOpen(true);
    const closeLoginModal = () => setIsLoginModalOpen(false);



    // Load user from localStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem(LOCAL_STORAGE_KEY);
        const storedToken = localStorage.getItem(TOKEN_KEY);

        if (storedUser && storedToken) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);

                // Decode token to get expiration
                try {
                    const decoded: any = jwtDecode(storedToken);
                    if (decoded.exp) {
                        setExpiresAt(decoded.exp);
                        // Optional: Check if already expired
                        if (Date.now() >= decoded.exp * 1000) {
                            console.log("Token expired on load, logging out");
                            logout();
                        }
                    }
                } catch (e) {
                    console.error("Failed to decode token on load", e);
                }
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    // Check for token expiration
    useEffect(() => {
        if (!expiresAt || !user) return;

        const checkExpiration = () => {
            // Buffer of 1 second to be safe
            if (Date.now() >= expiresAt * 1000) {
                // Token expired
                logout();
                showToast("로그아웃 되셨습니다.", 'info');
                window.location.reload();
            }
        };

        const interval = setInterval(checkExpiration, 1000);
        return () => clearInterval(interval);
    }, [expiresAt, user]);

    const login = async (email: string, password?: string) => {
        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Valid credentials required');
            }

            const data = await response.json();
            const newUser: User = {
                email: data.email,
                name: data.name,
                plan: 'free'
            };
            saveUser(newUser, data.token);
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const signup = async (email: string, name: string, password?: string) => {
        try {
            const response = await fetch('http://localhost:8080/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Signup failed');
            }

            const data = await response.json();
            const newUser: User = {
                email: data.email,
                name: data.name,
                plan: 'free'
            };
            saveUser(newUser, data.token);
        } catch (error) {
            console.error("Signup failed", error);
            throw error;
        }
    };

    const googleAuth = async (token: string) => {
        try {
            // For mock/test mode
            if (token.startsWith("mock_")) {
                const mockUser: User = {
                    email: "test_user@example.com",
                    name: "테스트 유저",
                    plan: 'free'
                };
                // Mock expiration: 30 minutes from now
                const mockExp = Math.floor(Date.now() / 1000) + (30 * 60);
                setUser(mockUser);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockUser));
                localStorage.setItem(TOKEN_KEY, token);
                setExpiresAt(mockExp);
                return;
            }

            const response = await fetch('http://localhost:8080/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (!response.ok) {
                throw new Error('Google Auth Failed');
            }

            const data = await response.json();
            const newUser: User = {
                email: data.email,
                name: data.name,
                plan: 'free'
            };
            saveUser(newUser, data.token);
        } catch (error) {
            console.error("Google auth failed", error);
            throw error;
        }
    }

    const refreshSession = async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        try {
            const response = await fetch('http://localhost:8080/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // Determine if it's a genuine auth error (401)
                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }
                return; // Silent fail for network blips
            }

            const data = await response.json();
            if (user && data.token) {
                saveUser(user, data.token);
                showToast("로그인이 연장되었습니다.", 'success');
            }
        } catch (error) {
            console.error("Session refresh failed", error);
            // If explicit error (like 401), we should probably logout
            if ((error as Error).message === 'Unauthorized') {
                logout();
                showToast("세션이 만료되었습니다. 다시 로그인해주세요.", 'error');
            }
        }
    };

    // Activity Listener for Sliding Session
    useEffect(() => {
        if (!user) return;

        let lastActivity = Date.now();
        let lastRefresh = Date.now();
        const REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh at most every 5 minutes

        const handleActivity = () => {
            const now = Date.now();
            // Throttle: Only consider activity if 1 second passed
            if (now - lastActivity < 1000) return;
            lastActivity = now;

            // Check if we should refresh
            if (now - lastRefresh > REFRESH_INTERVAL) {
                lastRefresh = now;
                refreshSession();
            }
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
        };
    }, [user]);

    const navigate = useNavigate();

    const logout = () => {
        setUser(null);
        setExpiresAt(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
        navigate('/');
    };

    const saveUser = (u: User, token: string) => {
        setUser(u);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(u));
        localStorage.setItem(TOKEN_KEY, token);

        try {
            const decoded: any = jwtDecode(token);
            if (decoded.exp) {
                setExpiresAt(decoded.exp);
            }
        } catch (e) {
            console.error("Invalid token format", e);
        }
    };

    const value = {
        user,
        login,
        signup,
        googleAuth,
        refreshSession,
        logout,
        isAuthenticated: !!user,
        expiresAt,
        token: localStorage.getItem(TOKEN_KEY),
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        isLoading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
