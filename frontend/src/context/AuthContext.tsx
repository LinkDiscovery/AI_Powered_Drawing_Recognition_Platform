import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

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
    logout: () => void;
    isAuthenticated: boolean;
    expiresAt: number | null; // Unix timestamp in seconds
    token: string | null;
    isLoginModalOpen: boolean;
    openLoginModal: () => void;
    closeLoginModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'aidraw_auth_user';
const TOKEN_KEY = 'aidraw_auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
    }, []);

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

    const logout = () => {
        setUser(null);
        setExpiresAt(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
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
        logout,
        isAuthenticated: !!user,
        expiresAt,
        token: localStorage.getItem(TOKEN_KEY),
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal
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
