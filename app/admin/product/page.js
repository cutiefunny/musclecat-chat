// app/admin/product/page.js
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { signOut, auth } from "@/lib/firebase/clientApp";
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct
} from "@/lib/firebase/firebaseService";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  QrCode,
  Package,
  Layers,
  X,
  LogOut,
  ImageIcon,
  Plus,
  Pencil,
  Trash2,
  AlertCircle
} from "lucide-react";

const LoginScreen = ({ handleLogin }) => (
  <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
    <div className="text-center p-10 bg-white rounded-2xl shadow-xl max-w-sm w-full">
      <Image
        src="/images/icon.png"
        alt="앱 아이콘"
        width={80}
        height={80}
        className="mx-auto mb-4 rounded-full"
      />
      <h1 className="text-2xl font-bold mb-2 text-gray-800">어드민 로그인</h1>
      <p className="mb-8 text-gray-500">관리자 계정으로 로그인하세요.</p>
      <Button
        size="lg"
        className="w-full h-12 text-base bg-blue-500 hover:bg-blue-600 text-white"
        onClick={handleLogin}
      >
        Google 계정으로 로그인
      </Button>
    </div>
  </main>
);

export default function AdminProductPage() {
  const { authUser, loading, handleLogin } = useAuth();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 필터 및 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // 바코드/이미지 모달 상태
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    type: null, // 'barcode' | 'image'
    title: "",
    url: "",
    subtitle: ""
  });

  // 상품 추가/수정 모달 상태
  const [editModal, setEditModal] = useState({
    isOpen: false,
    isEdit: false,
    originalCategory: "",
    originalName: "",
    category: "",
    name: "",
    price: "",
    barcode: "",
    image: "",
    isSaving: false
  });

  // 상품 삭제 확인 모달 상태
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    category: "",
    name: "",
    isDeleting: false
  });

  // 상품 목록 불러오기 (Firestore products 컬렉션 직접 조회)
  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await getAllProducts();
      setProducts(list);
    } catch (err) {
      console.error("Firestore 상품 목록 로딩 실패:", err);
      setError("상품 데이터를 불러오는 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authUser && authUser.email === "cutiefunny@gmail.com") {
      fetchProducts();
    }
  }, [authUser]);

  // 카테고리 목록 도출
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["전체", ...Array.from(set)];
  }, [products]);

  // 검색 및 카테고리 필터링된 상품 목록
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === "전체" || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // 바코드 QR 모달 열기
  const handleOpenBarcode = (product) => {
    if (!product.barcode) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      product.barcode
    )}`;
    setPreviewModal({
      isOpen: true,
      type: "barcode",
      title: product.name,
      subtitle: `바코드: ${product.barcode} (가격: ${product.price}원)`,
      url: qrUrl
    });
  };

  // 상품 이미지 모달 열기
  const handleOpenImage = (product) => {
    if (!product.image) return;
    setPreviewModal({
      isOpen: true,
      type: "image",
      title: product.name,
      subtitle: `${product.category} | ${product.price}원`,
      url: product.image
    });
  };

  // 등록 모달 열기
  const handleOpenAddModal = () => {
    setEditModal({
      isOpen: true,
      isEdit: false,
      originalCategory: "",
      originalName: "",
      category: selectedCategory !== "전체" ? selectedCategory : "",
      name: "",
      price: "",
      barcode: "",
      image: "",
      isSaving: false
    });
  };

  // 수정 모달 열기
  const handleOpenEditModal = (product) => {
    setEditModal({
      isOpen: true,
      isEdit: true,
      originalCategory: product.category,
      originalName: product.name,
      category: product.category,
      name: product.name,
      price: product.price,
      barcode: product.barcode,
      image: product.image || "",
      isSaving: false
    });
  };

  // 등록 및 수정 저장 핸들러
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const { isEdit, originalCategory, originalName, category, name, price, barcode, image } = editModal;

    if (!category.trim() || !name.trim()) {
      alert("카테고리와 상품명을 입력해 주세요.");
      return;
    }

    setEditModal((prev) => ({ ...prev, isSaving: true }));
    try {
      if (isEdit) {
        await updateProduct(originalCategory, originalName, category, name, {
          price,
          barcode,
          image
        });
      } else {
        await addProduct(category, name, {
          price,
          barcode,
          image
        });
      }

      setEditModal((prev) => ({ ...prev, isOpen: false, isSaving: false }));
      await fetchProducts();
    } catch (err) {
      console.error("상품 저장 오류:", err);
      alert("상품 정보를 저장하는 중 오류가 발생했습니다: " + err.message);
      setEditModal((prev) => ({ ...prev, isSaving: false }));
    }
  };

  // 삭제 모달 열기
  const handleOpenDeleteModal = (product) => {
    setDeleteModal({
      isOpen: true,
      category: product.category,
      name: product.name,
      isDeleting: false
    });
  };

  // 삭제 실행
  const handleDeleteConfirm = async () => {
    const { category, name } = deleteModal;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await deleteProduct(category, name);
      setDeleteModal({ isOpen: false, category: "", name: "", isDeleting: false });
      await fetchProducts();
    } catch (err) {
      console.error("상품 삭제 오류:", err);
      alert("상품을 삭제하는 중 오류가 발생했습니다: " + err.message);
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 font-medium">인증 정보를 확인하는 중...</p>
      </main>
    );
  }

  if (!authUser) {
    return <LoginScreen handleLogin={handleLogin} />;
  }

  const isAdmin = authUser.email === "cutiefunny@gmail.com";
  if (!isAdmin) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <p className="text-2xl font-bold mb-4 text-red-600">접근 권한이 없습니다.</p>
        <p className="text-gray-600 mb-6">관리자 전용 페이지입니다.</p>
        <Button onClick={() => signOut(auth)}>로그아웃</Button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      {/* 상단 헤더 */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="관리자 홈으로"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold tracking-tight">상품 관리</h1>
              <Badge variant="secondary" className="font-semibold text-xs ml-1">
                총 {products.length}개
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              onClick={handleOpenAddModal}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>상품 추가</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProducts}
              disabled={isLoading}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">새로고침</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut(auth)}
              className="text-gray-500 hover:text-red-600 gap-1 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* 검색 및 카테고리 필터 카드 */}
        <Card className="border shadow-sm bg-white">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* 검색창 */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="상품명, 바코드, 카테고리 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 bg-gray-50 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 카테고리 탭/뱃지 필터 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
              <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1 flex-shrink-0">
                <Layers className="h-3.5 w-3.5" /> 카테고리:
              </span>
              {categories.map((cat) => {
                const count =
                  cat === "전체"
                    ? products.length
                    : products.filter((p) => p.category === cat).length;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected
                        ? "bg-blue-700 text-blue-100"
                        : "bg-gray-200 text-gray-500"
                        }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* 로딩 상태 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">상품 데이터를 불러오는 중...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700 mb-1">
              조건에 맞는 상품이 없습니다.
            </p>
            <p className="text-xs text-gray-400 mb-4">
              검색어나 카테고리 필터를 변경하거나 새로운 상품을 추가해 보세요.
            </p>
            <Button
              onClick={handleOpenAddModal}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs"
            >
              <Plus className="h-4 w-4" />
              상품 등록하기
            </Button>
          </div>
        ) : (
          /* 상품 목록 테이블 */
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-50/80 text-gray-600 text-xs font-semibold uppercase tracking-wider border-b">
                  <tr>
                    <th className="py-3 px-4 w-28">카테고리</th>
                    <th className="py-3 px-4 min-w-[200px]">상품명</th>
                    <th className="py-3 px-4 w-32">가격</th>
                    <th className="py-3 px-4 w-36">바코드</th>
                    <th className="py-3 px-4 w-40 text-center">동작</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((p, idx) => (
                    <tr
                      key={`${p.category}-${p.name}-${idx}`}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* 카테고리 */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          {p.category}
                        </span>
                      </td>

                      {/* 상품명 */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          <span>{p.name}</span>
                          {p.image && (
                            <button
                              onClick={() => handleOpenImage(p)}
                              title="상품 이미지 보기"
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 가격 */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-blue-600">
                          {p.price ? (p.price.includes("원") ? p.price : `${p.price}원`) : "-"}
                        </span>
                      </td>

                      {/* 바코드 */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200 text-gray-700">
                          {p.barcode || "-"}
                        </span>
                      </td>

                      {/* 액션 버튼 */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {p.barcode ? (
                            <button
                              onClick={() => handleOpenBarcode(p)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                              title="QR 코드 보기"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition-colors"
                            title="상품 수정"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleOpenDeleteModal(p)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                            title="상품 삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 테이블 푸터 */}
            <div className="py-3 px-4 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
              <span>
                표시 중: <strong>{filteredProducts.length}</strong>개 (전체{" "}
                {products.length}개)
              </span>
              <span>Firestore products 컬렉션 직접 연동</span>
            </div>
          </div>
        )}
      </main>

      {/* 상품 등록/수정 모달 */}
      {editModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => !editModal.isSaving && setEditModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => !editModal.isSaving && setEditModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editModal.isEdit ? "상품 정보 수정" : "새 상품 등록"}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    required
                    placeholder="예: 가방, 문구, 키링, 티셔츠"
                    value={editModal.category}
                    onChange={(e) => setEditModal({ ...editModal, category: e.target.value })}
                  />
                  {categories.length > 1 && (
                    <select
                      className="border rounded-md px-2 py-1 text-xs bg-gray-50 text-gray-700 focus:outline-none"
                      onChange={(e) => {
                        if (e.target.value) setEditModal({ ...editModal, category: e.target.value });
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        선택
                      </option>
                      {categories.filter((c) => c !== "전체").map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  상품명 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="예: 에코백 대형"
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">가격</label>
                  <Input
                    type="text"
                    placeholder="예: 9,900"
                    value={editModal.price}
                    onChange={(e) => setEditModal({ ...editModal, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">바코드</label>
                  <Input
                    type="text"
                    placeholder="예: 06060107"
                    value={editModal.barcode}
                    onChange={(e) => setEditModal({ ...editModal, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  이미지 URL (선택)
                </label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={editModal.image}
                  onChange={(e) => setEditModal({ ...editModal, image: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={editModal.isSaving}
                  onClick={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={editModal.isSaving}
                >
                  {editModal.isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                  ) : null}
                  {editModal.isEdit ? "수정 완료" : "등록 완료"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 상품 삭제 확인 모달 */}
      {deleteModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => !deleteModal.isDeleting && setDeleteModal({ isOpen: false, category: "", name: "", isDeleting: false })}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-red-100 text-red-600 rounded-full mb-3">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">상품 삭제</h3>
            <p className="text-sm text-gray-600 mb-5">
              정말로 <strong>[{deleteModal.category}] {deleteModal.name}</strong> 상품을 삭제하시겠습니까?
              <br />
              <span className="text-xs text-red-500">삭제 후 복구할 수 없습니다.</span>
            </p>

            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                disabled={deleteModal.isDeleting}
                onClick={() => setDeleteModal({ isOpen: false, category: "", name: "", isDeleting: false })}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteModal.isDeleting}
                onClick={handleDeleteConfirm}
              >
                {deleteModal.isDeleting ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                ) : null}
                삭제하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 바코드 / 이미지 모달 */}
      {previewModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() =>
            setPreviewModal({ isOpen: false, type: null, title: "", url: "", subtitle: "" })
          }
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() =>
                setPreviewModal({ isOpen: false, type: null, title: "", url: "", subtitle: "" })
              }
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1 text-center pr-6 pl-2">
              {previewModal.title}
            </h3>
            {previewModal.subtitle && (
              <p className="text-xs text-gray-500 mb-5 text-center">
                {previewModal.subtitle}
              </p>
            )}

            <div className="w-full flex items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-200 mb-4 min-h-[200px]">
              {previewModal.type === "barcode" ? (
                // QR Code
                <img
                  src={previewModal.url}
                  alt="바코드 QR"
                  className="w-52 h-52 object-contain"
                />
              ) : (
                // 이미지 미리보기
                <img
                  src={previewModal.url}
                  alt={previewModal.title}
                  className="max-h-72 max-w-full rounded-lg object-contain"
                />
              )}
            </div>

            <Button
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              onClick={() =>
                setPreviewModal({ isOpen: false, type: null, title: "", url: "", subtitle: "" })
              }
            >
              닫기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
