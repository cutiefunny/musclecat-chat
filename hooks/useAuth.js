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
                
                // 💡 [제거] 1호점/2호점 프로필 설정 로직을 각 핸들러로 이동
                // if (user.isAnonymous && !userData.displayName) { ... }

                const fullUser = {
                    uid: user.uid,
                    email: user.email,
                    isAnonymous: user.isAnonymous,
                    ...userData // 💡 핸들러에서 설정한 displayName, photoURL이 여기에 포함됩니다.
                };
                setAuthUser(fullUser);

                const role = user.email === 'cutiefunny@gmail.com' ? 'owner' : 'customer';
                
                setChatUser({
                    uid: role,
                    name: fullUser.displayName, // 💡 '1호점' 또는 '2호점' 이름이 올바르게 설정됩니다.
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

    // 💡 1호점 로그인 핸들러 수정: 로그인 후 즉시 프로필 업데이트
    const handleBranchLogin = async () => {
        try {
            const userCredential = await signInAnonymously(auth);
            const user = userCredential.user;
            await updateUserProfile(user.uid, {
                displayName: '1호점',
                photoURL: '/images/icon.png',
            });
            // onAuthStateChanged 리스너가 나머지(state 설정)를 처리합니다.
        } catch (error) {
            console.error("Anonymous login (Branch 1) failed:", error);
            alert("1호점 로그인에 실패했습니다.");
        }
    };

    // 💡 2호점 로그인 핸들러 추가
    const handleBranch2Login = async () => {
        try {
            const userCredential = await signInAnonymously(auth);
            const user = userCredential.user;
            await updateUserProfile(user.uid, {
                displayName: '2호점',
                photoURL: '/images/icon.png', // 💡 2호점도 기본 아이콘 사용
            });
            // onAuthStateChanged 리스너가 나머지(state 설정)를 처리합니다.
        } catch (error) {
            console.error("Anonymous login (Branch 2) failed:", error);
            alert("2호점 로그인에 실패했습니다.");
        }
    };

    // 💡 3호점 로그인 핸들러 추가
    const handleBranch3Login = async () => {
        try {
            const userCredential = await signInAnonymously(auth);
            const user = userCredential.user;
            await updateUserProfile(user.uid, {
                displayName: '3호점',
                photoURL: '/images/icon.png', 
            });
        } catch (error) {
            console.error("Anonymous login (Branch 3) failed:", error);
            alert("3호점 로그인에 실패했습니다.");
        }
    };

    return { authUser, loading, handleLogin, handleBranchLogin, handleBranch2Login, handleBranch3Login };
};