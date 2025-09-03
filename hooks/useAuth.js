// hooks/useAuth.js
import { useEffect, useState } from 'react';
import { auth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from '@/lib/firebase/clientApp';
import { getUserProfile } from '@/lib/firebase/firebaseService';
import useChatStore from '@/store/chat-store';

export const useAuth = () => {
    const { authUser, setAuthUser, setChatUser } = useChatStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userData = await getUserProfile(user);
                const fullUser = {
                    uid: user.uid,
                    email: user.email,
                    ...userData
                };
                setAuthUser(fullUser);

                const role = user.email === 'cutiefunny@gmail.com' ? 'owner' : 'customer';
                setChatUser({
                    uid: role,
                    name: userData.displayName,
                    authUid: user.uid
                });
            } else {
                setAuthUser(null);
                setChatUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [setAuthUser, setChatUser]);

    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed:", error);
            alert("로그인에 실패했습니다.");
        }
    };

    return { authUser, loading, handleLogin };
};