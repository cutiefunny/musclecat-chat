// hooks/useAuth.js
import { useEffect, useState } from 'react';
// 💡 signInAnonymously 추가
import { auth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInAnonymously } from '@/lib/firebase/clientApp';
// 💡 updateUserProfile 추가
import { getUserProfile, updateUserProfile } from '@/lib/firebase/firebaseService';
import useChatStore from '@/store/chat-store';

export const useAuth = () => {
    const { authUser, setAuthUser, setChatUser } = useChatStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userData = await getUserProfile(user);
                
                // 💡 1호점 익명 로그인 시 displayName 강제 설정
                if (user.isAnonymous && !userData.displayName) {
                    const branchProfile = {
                        displayName: '1호점',
                        photoURL: '/images/icon.png',
                    };
                    await updateUserProfile(user.uid, branchProfile);
                    // 업데이트된 정보로 userData 다시 할당
                    Object.assign(userData, branchProfile);
                }

                const fullUser = {
                    uid: user.uid,
                    email: user.email,
                    isAnonymous: user.isAnonymous,
                    ...userData
                };
                setAuthUser(fullUser);

                const role = user.email === 'cutiefunny@gmail.com' ? 'owner' : 'customer';
                
                setChatUser({
                    uid: role,
                    name: fullUser.displayName,
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

    // 💡 1호점 로그인 핸들러 추가
    const handleBranchLogin = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Anonymous login failed:", error);
            alert("1호점 로그인에 실패했습니다.");
        }
    };

    return { authUser, loading, handleLogin, handleBranchLogin };
};
