import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatKakaoTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${ampm} ${displayHours}:${displayMinutes}`;
}

/**
 * 날짜 구분선에 사용할 날짜 형식을 반환합니다. (예: 2025년 9월 13일 토요일)
 * @param {object} timestamp - Firebase Timestamp 객체 또는 Date 객체
 * @returns {string} - 포맷팅된 날짜 문자열
 */
export function formatDateSeparator(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = week[date.getDay()];
    return `${year}년 ${month}월 ${day}일 ${dayOfWeek}요일`;
}