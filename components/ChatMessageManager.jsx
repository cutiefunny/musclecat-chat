"use client";

import React, { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, deleteObject, ref, storage } from '@/lib/firebase/clientApp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit, Save, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

const ChatMessageManager = () => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const messagesPerPage = 10;

    useEffect(() => {
        const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const messagesData = [];
            querySnapshot.forEach((doc) => {
                messagesData.push({ id: doc.id, ...doc.data() });
            });
            setMessages(messagesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching messages: ", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (message) => {
        if (!window.confirm("정말로 이 메시지를 삭제하시겠습니까?")) return;

        try {
            // Firestore 문서 삭제
            await deleteDoc(doc(db, "messages", message.id));

            // Storage에 이미지가 있는 경우 함께 삭제 (사진 또는 이모티콘)
            if (message.imageUrl) {
                 // GCS URL에서 경로 추출
                const imagePath = new URL(message.imageUrl).pathname.split('/o/')[1].split('?')[0];
                const decodedPath = decodeURIComponent(imagePath);
                const imageRef = ref(storage, decodedPath);
                await deleteObject(imageRef);
            }
        } catch (error) {
            console.error("Error deleting message:", error);
            alert("메시지 삭제에 실패했습니다.");
        }
    };

    const handleEdit = (message) => {
        setEditingMessageId(message.id);
        setEditingText(message.text);
    };

    const handleSave = async (messageId) => {
        if (!editingText.trim()) {
            alert("메시지를 입력해주세요.");
            return;
        }
        try {
            const messageRef = doc(db, "messages", messageId);
            await updateDoc(messageRef, {
                text: editingText
            });
            setEditingMessageId(null);
            setEditingText('');
        } catch (error) {
            console.error("Error updating message:", error);
            alert("메시지 수정에 실패했습니다.");
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return '시간 정보 없음';
        return timestamp.toDate().toLocaleString('ko-KR');
    };

    // Pagination logic
    const indexOfLastMessage = currentPage * messagesPerPage;
    const indexOfFirstMessage = indexOfLastMessage - messagesPerPage;
    const currentMessages = messages.slice(indexOfFirstMessage, indexOfLastMessage);
    const totalPages = Math.ceil(messages.length / messagesPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (isLoading) {
        return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    return (
        <Card className="w-full max-w-4xl mx-auto border-0 shadow-none">
            <CardHeader className="pt-0">
                {/* Title is now in the parent component */}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">메시지가 없습니다.</p>
                    ) : (
                        currentMessages.map((msg) => (
                            <div key={msg.id} className="flex items-start gap-4 p-3 border rounded-lg">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold">{msg.sender} <span className="text-sm font-normal text-muted-foreground">({msg.uid})</span></p>
                                        <span className="text-xs text-muted-foreground">{formatTimestamp(msg.timestamp)}</span>
                                    </div>
                                    {editingMessageId === msg.id ? (
                                        <div className="space-y-2">
                                            <Textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full" />
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" onClick={() => handleSave(msg.id)}><Save className="h-4 w-4 mr-2" /> 저장</Button>
                                                <Button size="sm" variant="outline" onClick={() => setEditingMessageId(null)}><X className="h-4 w-4 mr-2" /> 취소</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            {msg.imageUrl && (
                                                <div className="my-2">
                                                    <Image src={msg.imageUrl} alt="message content" width={150} height={150} className="rounded-md object-contain" unoptimized={msg.type === 'emoticon'} />
                                                </div>
                                            )}
                                            <p className="text-gray-800 whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    )}
                                </div>
                                {editingMessageId !== msg.id && (
                                    <div className="flex gap-2">
                                        {msg.type === 'text' && (
                                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEdit(msg)}>
                                              <Edit className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(msg)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 pt-4 mt-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>이전</span>
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            {currentPage} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <span>다음</span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ChatMessageManager;

