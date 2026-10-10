// hooks/useWakeLock.js
"use client";

import { useEffect, useRef } from "react";

/**
 * 모바일 및 데스크톱 브라우저에서 화면 꺼짐(절전 모드)을 방지하는 훅
 * Screen Wake Lock API를 활용하며, 탭 전환 후 복귀 시 자동으로 잠금을 재요청합니다.
 */
export const useWakeLock = (enabled = true) => {
  const wakeLockRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    let isComponentMounted = true;

    // Wake Lock 요청 함수
    const requestWakeLock = async () => {
      // Screen Wake Lock API 지원 여부 및 문서 가시성 확인
      if (
        typeof window === "undefined" ||
        !("wakeLock" in navigator) ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      try {
        // 이미 활성화된 lock이 없거나 해제된 경우에만 새로 요청
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          console.log("[WakeLock] 화면 꺼짐 방지가 활성화되었습니다.");

          wakeLockRef.current.addEventListener("release", () => {
            console.log("[WakeLock] 화면 꺼짐 방지가 해제되었습니다.");
          });
        }
      } catch (err) {
        // 배터리 절약 모드이거나 권한 제한 등으로 실패할 수 있음
        console.warn(`[WakeLock] 활성화 실패: ${err.name}, ${err.message}`);
      }
    };

    // Wake Lock 해제 함수
    const releaseWakeLock = async () => {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        try {
          await wakeLockRef.current.release();
        } catch (err) {
          console.warn("[WakeLock] 해제 중 오류:", err);
        } finally {
          wakeLockRef.current = null;
        }
      }
    };

    // 최초 마운트 시 요청
    requestWakeLock();

    // 사용자가 다른 앱이나 다른 탭으로 이동했다가 다시 돌아왔을 때 재활성화
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isComponentMounted) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isComponentMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [enabled]);
};
