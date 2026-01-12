import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// User type definition
export interface User {
    email: string;
    name: string;
    plan: 'free' | 'pro';
}

interface AuthContextType {
    user: User | null;
    login: (email: string) => Promise<void>; // In real app, password would be here
    signup: (email: string, name: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'aidraw_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    // Load user from localStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
        }
    }, []);

    const login = async (email: string) => {
        // Mock login: Just create a session for the email
        // In a real mock, we might check a "users" list, but for now just accept any
        // If we wanted to be strict, we'd check if email matches a previously signed up user,
        // but for "just make it work", we can auto-create or retrieve.

        // Let's pretend we fetch user details. 
        // For simplicity in this "make it work" request, we'll just set them as logged in.
        const mockUser: User = {
            email,
            name: email.split('@')[0], // Default name from email if not provided
            plan: 'free', // Default to free on login
        };

        saveUser(mockUser);
    };

    const signup = async (email: string, name: string) => {
        const newUser: User = {
            email,
            name,
            plan: 'pro', // Give them Pro on signup to make them happy? Or free? Let's say Free.
        };
        saveUser(newUser);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    };

    const saveUser = (u: User) => {
        setUser(u);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(u));
    };

    const value = {
        user,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
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
